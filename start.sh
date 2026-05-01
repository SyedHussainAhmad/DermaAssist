#!/bin/bash
# DermaAssist — Start both backend and frontend
# Usage: chmod +x start.sh && ./start.sh

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  🩺  DermaAssist — Starting Services       ${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check model weights
if [ ! -f "backend/app/models/derma_assist_model.pth" ]; then
  echo -e "${YELLOW}⚠️  Model weights not found.${NC}"
  echo -e "   Place derma_assist_model.pth in backend/app/models/"
  echo -e "   Running in DEMO MODE (illustrative predictions only)\n"
fi

# Backend
echo -e "${GREEN}▶ Starting FastAPI backend on port 8000...${NC}"
cd backend
if [ ! -d "venv" ]; then
  echo "  Creating virtual environment..."
  python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt -q
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

echo -e "${GREEN}▶ Starting React frontend on port 3000...${NC}"
cd frontend
npm install -s
npm run dev &
FRONTEND_PID=$!
cd ..

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Frontend:  ${GREEN}http://localhost:3000${NC}"
echo -e "  API Docs:  ${GREEN}http://localhost:8000/docs${NC}"
echo -e "  Health:    ${GREEN}http://localhost:8000/api/health${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "\nPress Ctrl+C to stop all services\n"

# Wait for either process to exit
wait $BACKEND_PID $FRONTEND_PID
