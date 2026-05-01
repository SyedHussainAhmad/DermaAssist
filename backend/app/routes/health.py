from fastapi import APIRouter
from app.models.loader import ModelManager, DISEASE_CLASSES

router = APIRouter()

@router.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": ModelManager._model is not None,
        "demo_mode": ModelManager._demo_mode,
        "device": ModelManager._device,
        "classes": DISEASE_CLASSES,
    }
