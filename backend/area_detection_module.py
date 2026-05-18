"""
Módulo de detecção de área (segurança da calçada) — YOLOv8.
Detecta a presença de pessoas (pedestres) no frame para evitar abertura do portão
enquanto houver risco de acidente.
"""
from __future__ import annotations

import logging
import os
import cv2
import numpy as np

logger = logging.getLogger("area_module")

# Modelo YOLO genérico para detecção de pessoas (COCO dataset, classe 0 = person)
AREA_MODEL_PATH = "yolov8n.pt"

_area_model = None

def _get_model():
    global _area_model
    if _area_model is None:
        try:
            from ultralytics import YOLO
            _area_model = YOLO(AREA_MODEL_PATH)
            logger.info(f"Modelo de área ({AREA_MODEL_PATH}) carregado.")
        except Exception as e:
            logger.error(f"Falha ao carregar modelo de área: {e}")
            raise
    return _area_model

def detect_area(img_bgr: np.ndarray) -> dict:
    """
    Analisa um frame da câmera de área para detectar pedestres.
    
    Retorna:
        {
          "detected": bool,         # Se a inferência ocorreu com sucesso
          "clear": bool,            # True se NÃO houver pessoas (área livre)
          "person_count": int,      # Número de pessoas detectadas
          "bboxes": list            # Lista de bboxes das pessoas
        }
    """
    try:
        model = _get_model()
        # Classe 0 = person
        results = model.predict(source=img_bgr, conf=0.35, classes=[0], device="cpu", verbose=False)
        
        if not results or len(results[0].boxes) == 0:
            return {"detected": True, "clear": True, "person_count": 0, "bboxes": []}
            
        boxes = results[0].boxes
        person_count = len(boxes)
        bboxes = [ [int(v) for v in box.xyxy[0].cpu().numpy()] for box in boxes ]
        
        return {
            "detected": True,
            "clear": person_count == 0,
            "person_count": person_count,
            "bboxes": bboxes
        }
    except Exception as e:
        logger.error(f"detect_area erro: {e}")
        return {"detected": False, "clear": False, "person_count": 0, "bboxes": [], "error": str(e)}
