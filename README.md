# 🩺 DermaAssist — Multimodal Skin Disease Detection

An AI-powered dermatology screening tool that combines **ResNet18 computer vision** with a **14-point clinical questionnaire** to identify 8 skin conditions and provide evidence-based precautions.

---

## 🏗️ Project Structure

```
derma_assist/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI application
│   │   ├── models/
│   │   │   ├── loader.py            # Model loader + inference engine
│   │   │   └── derma_assist_model.pth  ← place trained weights here
│   │   └── routes/
│   │       ├── predict.py           # POST /api/predict
│   │       └── health.py            # GET  /api/health
│   ├── notebooks/
│   │   └── DermaAssist_Training.ipynb  # Google Colab training notebook
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── LandingPage.jsx      # Home screen
    │   │   ├── ImageCapturePage.jsx # Webcam / Upload
    │   │   ├── QuestionnairePage.jsx # 14 clinical questions
    │   │   └── ResultPage.jsx       # Prediction + precautions
    │   ├── App.jsx
    │   └── main.jsx
    ├── index.html
    └── package.json
```

---

## 🏷️ Disease Labels

| Label | Description |
|-------|-------------|
| Acne | Clogged pores → pimples, blackheads, cysts |
| Basal Cell Carcinoma ⚠️ | Most common skin cancer |
| Eczema | Chronic dry, red, itchy skin |
| Melanoma ⚠️ | Dangerous pigment-cell skin cancer |
| Psoriasis | Autoimmune thick scaly patches |
| Rosacea | Chronic facial redness |
| Urticaria (Hives) | Allergic raised welts |
| Vitiligo | Pigment loss → white patches |

---

## 🚀 Step 1 — Train the Model (Google Colab)

1. Open `backend/notebooks/DermaAssist_Training.ipynb` in **Google Colab**
2. Enable **GPU runtime**: Runtime → Change runtime type → T4 GPU
3. Run all cells in order:
   - Cell 1: Install dependencies
   - Cell 2: Mount Google Drive
   - Cell 3: Download Kaggle datasets automatically (API key is pre-configured)
   - Cells 4–9: Build dataset, define model, train (Phase 1 + Phase 2)
   - Cells 10–13: Plot training curves, confusion matrix, ROC curves
   - Cell 14: Save model + metadata to Drive

4. After training, download from Google Drive:
   - `derma_assist_model.pth`
   - `model_metadata.json`

5. Place both files in `backend/app/models/`

---

## 🖥️ Step 2 — Run the Backend (FastAPI)

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the API server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API will be available at:
- **Swagger docs**: http://localhost:8000/docs
- **Health check**: http://localhost:8000/api/health
- **Predict endpoint**: POST http://localhost:8000/api/predict

> ⚠️ If `derma_assist_model.pth` is not present, the API runs in **Demo Mode**
> and returns deterministic illustrative predictions without real inference.

---

## 🌐 Step 3 — Run the Frontend (React + Vite)

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at: **http://localhost:3000**

The Vite dev server proxies `/api/*` requests to `http://localhost:8000`.

---

## 📊 Model Architecture

```
Input Image (224×224×3)          Clinical Questionnaire (20 features)
        ↓                                      ↓
   ResNet18 backbone                    Tabular MLP
  (pretrained ImageNet)             128 → 64 → ReLU
        ↓                                      ↓
   512-d features                        64-d features
        └──────────────┬────────────────────┘
                       ↓
              Concatenate (576-d)
                       ↓
            Fusion Classifier
           256 → 128 → 8 (softmax)
                       ↓
              Disease Prediction
```

**Training strategy:**
- Phase 1 (10 epochs): Freeze backbone, train classifier head only (lr=1e-3)
- Phase 2 (20 epochs): Unfreeze all layers, fine-tune (lr=3e-5)
- Loss: Cross-entropy with class-weighted sampling
- Augmentation: Random flip, crop, rotation, color jitter

---

## 📈 Evaluation Metrics

After training, the following are computed on the held-out **test set** (15%):

| Metric | Description |
|--------|-------------|
| Accuracy | Overall correct predictions |
| Precision (weighted) | True positives / predicted positives |
| Recall (weighted) | True positives / actual positives |
| F1 Score (weighted) | Harmonic mean of precision and recall |
| ROC-AUC (OvR) | Area under ROC curve (one-vs-rest) |
| Confusion Matrix | Per-class prediction breakdown |

---

## 🔗 API Endpoint

### `POST /api/predict`

**Form data:**
- `image`: Image file (JPEG/PNG, max 10 MB)
- `answers`: JSON string of questionnaire answers

**Response:**
```json
{
  "disease": "eczema",
  "displayName": "Eczema (Atopic Dermatitis)",
  "description": "A chronic condition causing dry, red, and extremely itchy skin.",
  "confidence": 78.43,
  "precautions": [
    "Moisturize skin frequently with fragrance-free emollients",
    "..."
  ],
  "urgent": false,
  "probabilities": {
    "Acne": 3.2,
    "Eczema (Atopic Dermatitis)": 78.43,
    "..."
  }
}
```

---

## ⚕️ Medical Disclaimer

DermaAssist is an AI screening aid **only**. It does not provide medical diagnosis or treatment. Always consult a qualified dermatologist or physician for skin conditions, especially for urgent cases (Melanoma, Basal Cell Carcinoma).
