"""
/api/predict — main prediction endpoint
"""
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from pydantic import BaseModel
from typing import Optional
import json

from app.models.loader import ModelManager

router = APIRouter()


class PredictionResponse(BaseModel):
    disease: str
    displayName: str
    description: str
    confidence: float
    precautions: list[str]
    urgent: bool
    probabilities: dict[str, float]
    demoMode: bool = False


@router.post("/predict", response_model=PredictionResponse)
async def predict(
    image: UploadFile = File(...),
    answers: str = Form(...),
):
    """
    Predict skin disease from image + questionnaire answers.
    - image: JPEG/PNG image file
    - answers: JSON string of questionnaire answers
    """
    # Validate image
    if image.content_type not in ("image/jpeg", "image/png", "image/jpg", "image/webp"):
        raise HTTPException(status_code=400, detail="Image must be JPEG or PNG")

    image_bytes = await image.read()
    if len(image_bytes) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(status_code=400, detail="Image too large (max 10MB)")

    # Parse answers
    try:
        answers_dict = json.loads(answers)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid answers JSON")

    # Run inference
    try:
        result = ModelManager.predict(image_bytes, answers_dict)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

    return result
