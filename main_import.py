import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx
import json
import re
import chromadb
import uuid
import random
import os
from datetime import datetime
from typing import Optional
import google.generativeai as genai
from scenarios import get_system_prompt, get_mission_metadata