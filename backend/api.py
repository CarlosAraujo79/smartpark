from fastapi import FastAPI, UploadFile, File, Form, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import asyncio
import time
import shutil
import cv2
import numpy as np
from typing import List, Optional

# Importar as lógicas existentes
from plate_ocr import detect_best_plate, _pad_xyxy, preprocess_for_ocr, ocr_tesseract, ocr_gemini, _import_cv2
from utils import norm_plate
from whitelist import load_allowed_plates, save_allowed_plates
from parking import (
    load_parking_spots,
    save_parking_spots,
    occupy_random_spot,
    free_random_occupied
)
from ultralytics import YOLO
import logging
from dotenv import load_dotenv

# Carregar variáveis de ambiente do .env
load_dotenv()

# Configurar logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")

app = FastAPI(title="Estacionamento API")

# Habilitar CORS para o React conseguir acessar a API (HTTP e WebSocket)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = "plaquinhas.pt"

# Carregar modelo uma única vez no início
logger.info(f"Carregando modelo YOLO de {MODEL_PATH}...")
key_check = os.getenv("GEMINI_API_KEY")
if key_check:
    logger.info(f"Chave Gemini detectada no ambiente: {key_check[:6]}***")
else:
    logger.warning("Chave Gemini NÃO detectada no ambiente (.env ou shell)")

try:
    model = YOLO(MODEL_PATH)
    logger.info("Modelo carregado com sucesso.")
except Exception as e:
    logger.error(f"Erro ao carregar modelo: {e}")
    model = None

@app.get("/parking")
async def get_parking():
    return {"spots": load_parking_spots()}

@app.post("/parking/free")
async def free_spot():
    spots = load_parking_spots()
    new_spots, freed_idx = free_random_occupied(spots)
    save_parking_spots(new_spots)
    return {"freed_idx": freed_idx, "spots": new_spots}

@app.get("/whitelist")
async def get_whitelist():
    return {"allowed": load_allowed_plates()}

@app.post("/whitelist")
async def update_whitelist(plates: List[str]):
    save_allowed_plates(plates)
    return {"status": "success"}

@app.post("/detect")
async def detect_plate(
    file: UploadFile = File(...),
    conf: float = Form(0.25),
    pad: float = Form(0.08),
    ocr_type: str = Form("tesseract"),
    gemini_key: Optional[str] = Form(None)
):
    # Ler imagem enviada
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img_bgr is None:
        raise HTTPException(status_code=400, detail="Imagem inválida")

    try:
        if model is None:
            raise HTTPException(status_code=500, detail="Modelo YOLO não carregado")

        # 1. Detecção
        h, w = img_bgr.shape[:2]
        # Passar o objeto model diretamente para evitar recarregar do disco
        results = model.predict(source=img_bgr, conf=conf, device="cpu", verbose=False)
        
        if not results or len(results[0].boxes) == 0:
             return {"plate": None, "confidence": 0, "authorized": False, "error": "Nenhuma placa detectada"}
        
        r0 = results[0]
        boxes = r0.boxes
        best_i = int(np.argmax(boxes.conf.cpu().numpy()))
        xyxy = boxes.xyxy[best_i].cpu().numpy()
        det_conf = float(boxes.conf[best_i].cpu().numpy())
        
        # 2. Crop
        x1, y1, x2, y2 = _pad_xyxy(*[int(v) for v in xyxy], pad_ratio=pad, w=w, h=h)
        crop = img_bgr[y1:y2, x1:x2]
        
        # 3. OCR - Executar ambos
        logger.info("Executando OCRs...")
        
        # Tesseract
        pre = preprocess_for_ocr(crop)
        tesseract_text = ocr_tesseract(pre)
        
        # Gemini (usa a chave do .env se não vier no form)
        gemini_text = "N/A"
        key = gemini_key or os.getenv("GEMINI_API_KEY")
        model_name = os.getenv("GEMINI_MODEL_NAME", "gemini-2.0-flash")
        if key:
            try:
                logger.info(f"Usando modelo Gemini: {model_name}")
                gemini_text = ocr_gemini(crop, api_key=key, model_name=model_name)
            except Exception as ge:
                logger.warning(f"Erro no Gemini: {ge}")
                gemini_text = f"Erro: {str(ge)}"
        else:
            gemini_text = "Chave não configurada"

        # Definir texto final (prioriza Gemini se disponível, senão Tesseract)
        plate_text = gemini_text if (gemini_text and "Erro" not in gemini_text and gemini_text != "Chave não configurada") else tesseract_text
        
        # 4. Lógica de Estacionamento
        allowed = set(load_allowed_plates())
        is_authorized = norm_plate(plate_text) in allowed
        
        spot_idx = None
        if is_authorized:
            spots = load_parking_spots()
            new_spots, spot_idx = occupy_random_spot(spots, plate_text)
            save_parking_spots(new_spots)

        return {
            "plate": plate_text,
            "tesseract": tesseract_text,
            "gemini": gemini_text,
            "confidence": det_conf,
            "authorized": is_authorized,
            "spot_assigned": spot_idx,
            "bbox": [int(x1), int(y1), int(x2), int(y2)]
        }
    except Exception as e:
        logger.error(f"Erro na detecção: {e}")
        return {"error": str(e), "plate": None}

# ─── WEBSOCKET: Detecção Contínua de Placas ─────────────────────────────────

def _process_plate_sync(img_bytes: bytes) -> dict:
    """Processa um frame (bytes JPEG) de forma síncrona — roda em thread pool."""
    try:
        nparr = np.frombuffer(img_bytes, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img_bgr is None:
            return {"detected": False, "error": "frame_invalido"}
        if model is None:
            return {"detected": False, "error": "modelo_nao_carregado"}

        h, w = img_bgr.shape[:2]
        results = model.predict(source=img_bgr, conf=0.25, device="cpu", verbose=False)

        if not results or len(results[0].boxes) == 0:
            return {"detected": False, "plate": None, "authorized": False}

        r0     = results[0]
        boxes  = r0.boxes
        best_i = int(np.argmax(boxes.conf.cpu().numpy()))
        xyxy   = boxes.xyxy[best_i].cpu().numpy()
        det_conf = float(boxes.conf[best_i].cpu().numpy())

        x1, y1, x2, y2 = _pad_xyxy(*[int(v) for v in xyxy], pad_ratio=0.08, w=w, h=h)
        crop = img_bgr[y1:y2, x1:x2]

        pre = preprocess_for_ocr(crop)
        plate_text = ocr_tesseract(pre)

        allowed = set(load_allowed_plates())
        is_authorized = norm_plate(plate_text) in allowed

        spot_idx = None
        if is_authorized and plate_text:
            spots = load_parking_spots()
            new_spots, spot_idx = occupy_random_spot(spots, plate_text)
            save_parking_spots(new_spots)

        return {
            "detected": True,
            "plate": plate_text,
            "confidence": det_conf,
            "authorized": is_authorized,
            "spot_assigned": spot_idx,
            "bbox": [int(x1), int(y1), int(x2), int(y2)]
        }
    except Exception as e:
        logger.error(f"_process_plate_sync erro: {e}")
        return {"detected": False, "error": str(e)}


@app.websocket("/ws/plate")
async def ws_plate(websocket: WebSocket):
    await websocket.accept()
    logger.info("WS /ws/plate: cliente conectado")
    loop = asyncio.get_running_loop()
    last_processed = 0.0
    THROTTLE_SEC = 0.5  # máx 2 frames/segundo

    try:
        while True:
            data = await websocket.receive_bytes()
            now = time.time()
            if now - last_processed < THROTTLE_SEC:
                continue
            last_processed = now
            result = await loop.run_in_executor(None, _process_plate_sync, data)
            await websocket.send_json(result)
    except WebSocketDisconnect:
        logger.info("WS /ws/plate: cliente desconectado")
    except Exception as e:
        logger.error(f"WS /ws/plate erro: {e}")
        await websocket.close()


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
