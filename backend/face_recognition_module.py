"""
Módulo de reconhecimento facial — InsightFace (buffalo_s via ONNX/CPU).
Carrega o modelo uma única vez e expõe funções de alto nível para o backend.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger("face_module")

# ─── Configurações ──────────────────────────────────────────────────────────────
FACE_DB_PATH          = os.getenv("FACE_DB_PATH", "face_db.json")
SIMILARITY_THRESHOLD  = 0.40   # distância cosseno — abaixo = mesmo rosto
DET_SIZE              = (320, 320)

# ─── Modelo (singleton) ─────────────────────────────────────────────────────────
_face_app = None

def _get_app():
    global _face_app
    if _face_app is None:
        try:
            from insightface.app import FaceAnalysis
            _face_app = FaceAnalysis(name="buffalo_s", providers=["CPUExecutionProvider"])
            _face_app.prepare(ctx_id=-1, det_size=DET_SIZE)
            logger.info("InsightFace (buffalo_s) carregado com sucesso.")
        except Exception as e:
            logger.error(f"Falha ao carregar InsightFace: {e}")
            raise
    return _face_app


# ─── Banco de rostos (JSON) ─────────────────────────────────────────────────────
def load_face_db() -> list[dict]:
    """Carrega lista de { name, embedding } do arquivo JSON."""
    try:
        with open(FACE_DB_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("faces", [])
    except FileNotFoundError:
        return []
    except Exception as e:
        logger.error(f"Erro ao ler face_db: {e}")
        return []


def save_face_db(faces: list[dict]) -> None:
    with open(FACE_DB_PATH, "w", encoding="utf-8") as f:
        json.dump({"faces": faces}, f, ensure_ascii=False, indent=2)


def list_faces() -> list[str]:
    return [f["name"] for f in load_face_db()]


def add_face(name: str, embedding: list[float]) -> None:
    """Adiciona ou substitui um rosto no banco (por nome)."""
    faces = [f for f in load_face_db() if f["name"] != name]
    faces.append({"name": name, "embedding": embedding})
    save_face_db(faces)


def remove_face(name: str) -> bool:
    """Remove rosto pelo nome. Retorna True se removido."""
    faces = load_face_db()
    new_faces = [f for f in faces if f["name"] != name]
    if len(new_faces) == len(faces):
        return False
    save_face_db(new_faces)
    return True


# ─── Funções de reconhecimento ──────────────────────────────────────────────────
def _cosine_distance(a: np.ndarray, b: np.ndarray) -> float:
    a = a / (np.linalg.norm(a) + 1e-8)
    b = b / (np.linalg.norm(b) + 1e-8)
    return float(1.0 - np.dot(a, b))


def recognize_face(img_bgr: np.ndarray) -> dict:
    """
    Detecta o rosto principal num frame e compara com o banco.

    Retorna:
        {
          "detected": bool,
          "person":   str | None,
          "authorized": bool,
          "confidence": float,   # 0–1, onde 1 = certeza máxima
          "bbox": [x1,y1,x2,y2] | None
        }
    """
    try:
        app   = _get_app()
        faces = app.get(img_bgr)

        if not faces:
            return {"detected": False, "person": None, "authorized": False,
                    "confidence": 0.0, "bbox": None}

        # Pega o rosto de maior área
        face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
        embedding = face.embedding
        bbox      = [int(v) for v in face.bbox.tolist()]

        face_db = load_face_db()
        if not face_db:
            return {"detected": True, "person": None, "authorized": False,
                    "confidence": 0.0, "bbox": bbox, "note": "Nenhum rosto cadastrado"}

        best_name = None
        best_dist = float("inf")

        for entry in face_db:
            db_emb = np.array(entry["embedding"], dtype=np.float32)
            dist   = _cosine_distance(embedding, db_emb)
            if dist < best_dist:
                best_dist = dist
                best_name = entry["name"]

        authorized = best_dist <= SIMILARITY_THRESHOLD
        confidence = round(max(0.0, 1.0 - best_dist), 3)

        return {
            "detected":   True,
            "person":     best_name if authorized else None,
            "authorized": authorized,
            "confidence": confidence,
            "bbox":       bbox,
        }
    except Exception as e:
        logger.error(f"recognize_face erro: {e}")
        return {"detected": False, "person": None, "authorized": False,
                "confidence": 0.0, "bbox": None, "error": str(e)}


def register_face_from_image(img_bgr: np.ndarray, name: str) -> dict:
    """
    Extrai embedding da imagem e cadastra no banco.
    Retorna { "success": bool, "message": str }.
    """
    try:
        app   = _get_app()
        faces = app.get(img_bgr)

        if not faces:
            return {"success": False, "message": "Nenhum rosto detectado na imagem."}

        face      = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
        embedding = face.embedding.tolist()

        add_face(name, embedding)
        logger.info(f"Rosto de '{name}' cadastrado com sucesso.")
        return {"success": True, "message": f"Rosto de '{name}' cadastrado com sucesso."}
    except Exception as e:
        logger.error(f"register_face_from_image erro: {e}")
        return {"success": False, "message": str(e)}
