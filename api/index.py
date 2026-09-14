import sys
import os
from pathlib import Path

# Add project root to sys.path so imports like 'from backend.main import app' work in Vercel serverless environment
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.main import app
