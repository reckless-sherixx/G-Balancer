#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  G-Balancer Backend Startup (WSL)${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Navigate to backend directory
cd /mnt/c/Users/KIIT/Documents/G-Balancer/backend

echo -e "${YELLOW}Checking Python installation...${NC}"
python3 --version || {
    echo -e "${RED}❌ Python 3 not found. Installing...${NC}"
    sudo apt-get update -y
    sudo apt-get install -y python3 python3-pip
}

echo -e "${YELLOW}Installing dependencies...${NC}"
pip3 install -r requirements.txt

echo -e "${GREEN}✅ Dependencies installed!${NC}\n"

echo -e "${BLUE}Starting backend server...${NC}"
echo -e "${YELLOW}Server running at:${NC}"
echo -e "${GREEN}  • http://localhost:8000${NC}"
echo -e "${GREEN}  • http://10.21.39.161:8000${NC}"
echo -e "${YELLOW}API Docs:${NC}"
echo -e "${GREEN}  • http://localhost:8000/docs${NC}\n"

python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
