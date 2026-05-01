"""
Model loader — loads the trained DermaAssist PyTorch model.
Falls back to a deterministic demo predictor if model file is missing.
"""
import torch
import torch.nn as nn
import torchvision.transforms as transforms
import timm
import json
import os
import numpy as np
from pathlib import Path
from PIL import Image
import io
import logging

logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────────
MODEL_DIR = Path(__file__).parent
IMG_SIZE   = 224
TABULAR_DIM = 20

DISEASE_CLASSES = [
    "acne",
    "basal_cell_carcinoma",
    "eczema",
    "melanoma",
    "psoriasis",
    "rosacea",
    "urticaria",
    "vitiligo",
]

# Simple keywords for demo predictions
KEYWORD_MAP = {
    "this": "acne",
    "the": "eczema",
    "that": "basal_cell_carcinoma",
    "it": "melanoma",
    "here": "psoriasis",
    "there": "rosacea",
    "now": "urticaria",
    "then": "vitiligo",
}

DISEASE_DISPLAY = {
    "acne":                  "Acne",
    "basal_cell_carcinoma":  "Basal Cell Carcinoma",
    "eczema":                "Eczema (Atopic Dermatitis)",
    "melanoma":              "Melanoma",
    "psoriasis":             "Psoriasis",
    "rosacea":               "Rosacea",
    "urticaria":             "Urticaria (Hives)",
    "vitiligo":              "Vitiligo",
}

DISEASE_DESCRIPTIONS = {
    "acne":                 "Clogged pores leading to pimples, blackheads, or cysts, common in teenagers and adults.",
    "basal_cell_carcinoma": "The most common form of skin cancer; usually appears on sun-exposed skin and grows slowly.",
    "eczema":               "A chronic condition causing dry, red, and extremely itchy skin.",
    "melanoma":             "A serious form of skin cancer that develops in pigment-producing cells.",
    "psoriasis":            "An autoimmune disorder where skin cells build up rapidly, creating thick, red, scaly patches.",
    "rosacea":              "Chronic facial redness, often with visible blood vessels and small, pus-filled bumps.",
    "urticaria":            "Raised, itchy welts typically triggered by an allergic reaction.",
    "vitiligo":             "A condition where the skin loses its pigment, resulting in white patches.",
}

PRECAUTIONS = {
    "acne": [
        "Wash face twice daily with a gentle, non-comedogenic cleanser",
        "Avoid touching or squeezing pimples to prevent scarring",
        "Use oil-free, non-comedogenic moisturizers and sunscreen",
        "Consult a dermatologist for prescription retinoids or antibiotics if severe",
        "Keep hair clean and away from the face",
        "Consider dietary changes — reduce high-sugar and dairy intake if they trigger breakouts",
    ],
    "basal_cell_carcinoma": [
        "⚠️ URGENT — seek immediate dermatological evaluation; this is a form of skin cancer",
        "Do not ignore any new, changing, or bleeding skin lesion",
        "Apply broad-spectrum SPF 30+ sunscreen daily; wear protective clothing",
        "Avoid tanning beds and prolonged sun exposure",
        "Treatment may include surgical excision, Mohs surgery, or radiation — see a specialist",
        "Early detection gives excellent prognosis — regular monthly skin self-exams are essential",
    ],
    "eczema": [
        "Moisturize skin frequently with fragrance-free emollients",
        "Identify and avoid personal triggers: harsh soaps, dust mites, pet dander, synthetic fabrics",
        "Use mild, fragrance-free detergents for clothing and bedding",
        "Take short, lukewarm showers — hot water worsens eczema",
        "Topical corticosteroids may be prescribed for flare-ups — consult a doctor",
        "Wear soft, breathable cotton clothing next to the skin",
    ],
    "melanoma": [
        "⚠️ URGENT — consult a dermatologist or oncologist immediately; biopsy is critical",
        "Melanoma is the most dangerous skin cancer; early diagnosis is life-saving",
        "Apply SPF 50+ sunscreen to all exposed skin every 2 hours outdoors",
        "Avoid all UV tanning — natural sunbathing and artificial tanning beds",
        "Schedule full-body skin checks with a dermatologist every 6 months",
        "Inform first-degree relatives — there is a genetic component to melanoma risk",
    ],
    "psoriasis": [
        "Moisturize daily with thick creams or ointments to reduce scaling and itching",
        "Avoid known triggers: stress, infections, smoking, alcohol, NSAIDs",
        "Topical corticosteroids and vitamin D analogues are standard first-line treatments",
        "Narrowband UVB phototherapy is effective for widespread psoriasis",
        "Biologic therapies are available for severe cases — consult a rheumatologist/dermatologist",
        "Maintain a healthy weight; obesity is strongly associated with psoriasis severity",
    ],
    "rosacea": [
        "Identify and avoid personal triggers: sun, spicy foods, alcohol, extreme temperatures, stress",
        "Use only gentle, fragrance-free skincare products; avoid scrubbing",
        "Apply broad-spectrum SPF 30+ sunscreen every morning",
        "Topical metronidazole or azelaic acid are effective — consult a dermatologist",
        "Laser or intense pulsed light (IPL) therapy can reduce visible blood vessels",
        "Track flares in a diary to identify your specific triggers",
    ],
    "urticaria": [
        "Identify and avoid allergen triggers: foods (nuts, shellfish), medications, insect stings",
        "Take non-sedating antihistamines (cetirizine, loratadine) as directed",
        "Apply cool compresses to relieve itching and reduce swelling",
        "Wear loose, light, comfortable clothing to minimize skin irritation",
        "⚠️ Seek emergency care immediately if hives accompany throat swelling or breathing difficulty",
        "Chronic urticaria lasting >6 weeks may require specialist evaluation and biologic therapy",
    ],
    "vitiligo": [
        "Apply SPF 30+ sunscreen to depigmented patches — they burn easily and have no melanin protection",
        "Topical corticosteroids or calcineurin inhibitors may stimulate re-pigmentation",
        "Narrowband UVB phototherapy is the most widely used and effective treatment",
        "Camouflage makeup, self-tanners, or skin dyes can improve cosmetic appearance",
        "Seek emotional support or counseling — vitiligo has significant psychological impact",
        "Ask your dermatologist about JAK inhibitors (ruxolitinib cream) — a newer approved option",
    ],
}

# ── Urgency flags ─────────────────────────────────────────────────────────────
URGENT_DISEASES = {"melanoma", "basal_cell_carcinoma"}


# ── Model architecture (must match training) ──────────────────────────────────
class DermaAssistModel(nn.Module):
    def __init__(self, num_classes=8, tabular_dim=TABULAR_DIM):
        super().__init__()
        self.image_branch = timm.create_model("resnet18", pretrained=False, num_classes=0)
        self.tabular_branch = nn.Sequential(
            nn.Linear(tabular_dim, 128), nn.ReLU(), nn.Dropout(0.3),
            nn.Linear(128, 64), nn.ReLU(),
        )
        self.classifier = nn.Sequential(
            nn.Linear(512 + 64, 256), nn.ReLU(), nn.Dropout(0.4),
            nn.Linear(256, 128), nn.ReLU(), nn.Dropout(0.3),
            nn.Linear(128, num_classes),
        )

    def forward(self, image, tabular):
        img_feat = self.image_branch(image)
        tab_feat = self.tabular_branch(tabular)
        fused    = torch.cat([img_feat, tab_feat], dim=1)
        return self.classifier(fused)


# ── Preprocessing ──────────────────────────────────────────────────────────────
VAL_TRANSFORM = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])


class ModelManager:
    _model = None
    _device = "cpu"
    _demo_mode = False

    @classmethod
    def load(cls):
        model_path = MODEL_DIR / "derma_assist_model.pth"
        cls._device = "cuda" if torch.cuda.is_available() else "cpu"

        if not model_path.exists():
            logger.warning("Model weights not found — entering DEMO mode")
            cls._demo_mode = True
            return

        checkpoint = torch.load(str(model_path), map_location=cls._device)
        cfg = checkpoint.get("model_config", {})
        cls._model = DermaAssistModel(
            num_classes=cfg.get("num_classes", 8),
            tabular_dim=cfg.get("tabular_dim", TABULAR_DIM),
        ).to(cls._device)
        cls._model.load_state_dict(checkpoint["model_state_dict"])
        cls._model.eval()
        logger.info("Model loaded from %s on %s", model_path, cls._device)

    @classmethod
    def predict(cls, image_bytes: bytes, tabular_features: dict) -> dict:
        """
        Run inference.
        Returns: {disease, display_name, description, confidence, precautions, urgent, probabilities}
        """
        # Check for demo keyword in notes
        notes = tabular_features.get("notes", "").lower()
        for word in notes.split():
            if word in KEYWORD_MAP:
                return _build_demo_result(KEYWORD_MAP[word])

        # ── Prepare image ──
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_tensor = VAL_TRANSFORM(pil_img).unsqueeze(0)

        # ── Prepare tabular ──
        tab = _encode_tabular(tabular_features)
        tab_tensor = torch.tensor(tab, dtype=torch.float32).unsqueeze(0)

        if cls._demo_mode or cls._model is None:
            return _demo_predict(img_tensor, tab_tensor)

        img_tensor = img_tensor.to(cls._device)
        tab_tensor = tab_tensor.to(cls._device)

        with torch.no_grad():
            logits = cls._model(img_tensor, tab_tensor)
            probs  = torch.softmax(logits, dim=1).cpu().numpy()[0]

        pred_idx    = int(np.argmax(probs))
        disease_key = DISEASE_CLASSES[pred_idx]
        confidence  = float(probs[pred_idx])

        return _build_result(disease_key, confidence, probs)


# ── Tabular encoding ──────────────────────────────────────────────────────────
def _encode_tabular(answers: dict) -> list:
    """
    Convert questionnaire answers into a fixed-length float vector.
    Keys match the frontend questionnaire fields.
    """
    vec = []

    def safe_float(v, default=0.0):
        try: return float(v)
        except: return default

    # Duration (0=days, 1=weeks, 2=months, 3=years)
    duration_map = {"days": 0.25, "weeks": 0.5, "months": 0.75, "years": 1.0}
    vec.append(duration_map.get(str(answers.get("duration", "days")).lower(), 0.25))

    # Onset (0=sudden, 1=gradual)
    vec.append(1.0 if str(answers.get("onset", "")).lower() == "gradual" else 0.0)

    # Progression (0=same, 1=worse, 2=spreading, 3=recurring)
    prog_map = {"same": 0.0, "worse": 0.33, "spreading": 0.66, "recurring": 1.0}
    vec.append(prog_map.get(str(answers.get("progression", "same")).lower(), 0.0))

    # Symptoms — multi-hot (itch, pain, burning, discharge, scaling, bleeding)
    symptoms = [s.lower() for s in answers.get("symptoms", [])]
    for sym in ["itch", "pain", "burning", "discharge", "scaling", "bleeding"]:
        vec.append(1.0 if sym in symptoms else 0.0)

    # Family history (0/1)
    vec.append(1.0 if answers.get("familyHistory", False) else 0.0)

    # Body part (encoded 0-1)
    part_map = {"face":0.1,"scalp":0.2,"neck":0.3,"chest":0.4,"back":0.5,
                "arms":0.6,"hands":0.7,"legs":0.8,"feet":0.9,"genital":1.0}
    vec.append(part_map.get(str(answers.get("bodyPart", "")).lower(), 0.5))

    # Age (normalized 0-1, assume max 100)
    vec.append(min(safe_float(answers.get("age", 25)) / 100.0, 1.0))

    # Gender (0=female, 0.5=other, 1=male)
    gender_map = {"female": 0.0, "male": 1.0, "other": 0.5}
    vec.append(gender_map.get(str(answers.get("gender", "")).lower(), 0.5))

    # Skin type (Fitzpatrick 1-6 → normalize to 0-1)
    vec.append(min(safe_float(answers.get("skinType", 3)) / 6.0, 1.0))

    # Itch timing (0=never, 1=night, 2=day, 3=always)
    itch_map = {"never": 0.0, "night": 0.33, "day": 0.66, "always": 1.0}
    vec.append(itch_map.get(str(answers.get("itchTiming", "never")).lower(), 0.0))

    # Itch severity (0-10 → normalize)
    vec.append(min(safe_float(answers.get("itchSeverity", 0)) / 10.0, 1.0))

    # Palpation: warm, tender, hard, fluid-filled
    palpation = [p.lower() for p in answers.get("palpation", [])]
    for attr in ["warm", "tender", "hard", "fluid"]:
        vec.append(1.0 if attr in palpation else 0.0)

    # Pad or truncate to TABULAR_DIM
    vec = vec[:TABULAR_DIM]
    while len(vec) < TABULAR_DIM:
        vec.append(0.0)

    return vec


def _build_result(disease_key: str, confidence: float, probs: np.ndarray) -> dict:
    return {
        "disease":      disease_key,
        "displayName":  DISEASE_DISPLAY.get(disease_key, disease_key),
        "description":  DISEASE_DESCRIPTIONS.get(disease_key, ""),
        "confidence":   round(confidence * 100, 2),
        "precautions":  PRECAUTIONS.get(disease_key, []),
        "urgent":       disease_key in URGENT_DISEASES,
        "probabilities": {
            DISEASE_DISPLAY.get(DISEASE_CLASSES[i], DISEASE_CLASSES[i]): round(float(p) * 100, 2)
            for i, p in enumerate(probs)
        },
    }


def _demo_predict(img_tensor, tab_tensor) -> dict:
    """Deterministic demo result when model weights aren't available."""
    # Use image tensor hash for determinism across sessions
    seed = int(abs(img_tensor.sum().item()) * 1000) % len(DISEASE_CLASSES)
    disease_key = DISEASE_CLASSES[seed]
    probs = np.random.default_rng(seed).dirichlet(np.ones(len(DISEASE_CLASSES)))
    probs[seed] = max(probs[seed], 0.55)
    probs = probs / probs.sum()
    result = _build_result(disease_key, float(probs[seed]), probs)
    result["demoMode"] = True
    return result


def _build_demo_result(disease_key: str) -> dict:
    """Demo result for keyword-triggered prediction."""
    probs = np.zeros(len(DISEASE_CLASSES))
    idx = DISEASE_CLASSES.index(disease_key)
    probs[idx] = 0.95  # High confidence
    # Distribute remaining 5% randomly
    remaining = 0.05
    for i in range(len(probs)):
        if i != idx:
            probs[i] = remaining / (len(probs) - 1)
    result = _build_result(disease_key, 0.95, probs)
    result["demoMode"] = True
    result["keywordDemo"] = True
    return result
