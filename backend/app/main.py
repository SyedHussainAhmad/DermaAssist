"""
DermaAssist Backend — FastAPI
Multimodal skin disease detection: image + questionnaire → disease + precautions
"""
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn
import logging

from app.routes import predict, health
from app.models.loader import ModelManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model on startup."""
    logger.info("Loading DermaAssist model...")
    try:
        ModelManager.load()
        logger.info("✅ Model loaded successfully")
    except Exception as e:
        logger.warning(f"⚠️  Model not found — running in demo mode: {e}")
    yield
    logger.info("Shutting down DermaAssist API")


app = FastAPI(
    title="DermaAssist API",
    description="Multimodal skin disease detection using ResNet18 + questionnaire",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router, prefix="/api", tags=["Prediction"])
app.include_router(health.router, prefix="/api", tags=["Health"])


@app.get("/")
async def root():
    return {"message": "DermaAssist API is running", "docs": "/docs"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
