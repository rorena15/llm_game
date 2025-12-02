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
import google.generativeai as genai
from scenarios import get_system_prompt, get_mission_metadata

# === 1. 설정 파일 로드 ===
try:
    with open("config.json", "r", encoding="utf-8") as f:
        config = json.load(f)
    print(f"⚙️ 설정 로드 완료: 모드=[{config['ai_mode']}]")
except FileNotFoundError:
    print("❌ config.json 파일을 찾을 수 없습니다! 기본값(local)으로 시작합니다.")
    config = {"ai_mode": "local", "local_model_name": "mistral", "google_api_key": ""}

# === 2. AI 초기화 ===
AI_MODE = config.get("ai_mode", "local").lower()

# [Cloud 설정]
if AI_MODE == "cloud":
    api_key = config.get("google_api_key", "")
    if not api_key or "여기에" in api_key:
        print("⚠️ 경고: Google API 키가 설정되지 않았습니다. config.json을 확인하세요.")
    else:
        genai.configure(api_key=api_key)
        # JSON 모드 강제 설정 (매우 중요)
        gemini_model = genai.GenerativeModel(
            config.get("cloud_model_name", "gemini-1.5-flash"),
            generation_config={"response_mime_type": "application/json"}
        )
        print("☁️ Cloud AI (Gemini) 모드로 대기 중...")

# [Local 설정]
else:
    OLLAMA_URL = "http://localhost:11434/api/chat"
    LOCAL_MODEL = config.get("local_model_name", "mistral")
    print(f"🏠 Local AI ({LOCAL_MODEL}) 모드로 대기 중... (Ollama 켜져 있나요?)")


# === 3. DB 및 앱 설정 ===
try:
    chroma_client = chromadb.PersistentClient(path="./memory_db")
    collection = chroma_client.get_or_create_collection(name="game_memory")
except Exception:
    collection = None

app = FastAPI(title="Social Engineer Backend")

class GameRequest(BaseModel):
    player_input: str
    suspicion: int = 0
    scenario_id: str = "mission_1"

class GameResponse(BaseModel):
    dialogue: str
    suspicion_delta: int = 0
    action: str = "NONE"

# === 유틸리티 함수 ===
def add_memory(text, speaker):
    if collection:
        collection.add(
            documents=[text],
            metadatas=[{"speaker": speaker, "timestamp": str(datetime.now())}],
            ids=[str(uuid.uuid4())]
        )

def retrieve_memory(query, n_results=3):
    if not collection: return ""
    try:
        results = collection.query(query_texts=[query], n_results=n_results)
        if not results['documents']: return ""
        return "\n".join([f"- {m}" for m in results['documents'][0]])
    except Exception:
        return ""

@app.get("/mission/{scenario_id}")
async def get_mission_info(scenario_id: str):
    metadata = get_mission_metadata(scenario_id)
    docs = metadata.get("secret_documents", [])
    selected_secret = random.choice(docs) if docs else "기밀 문서 없음"
    response_data = metadata.copy()
    response_data["target_secret"] = selected_secret
    if "secret_documents" in response_data: del response_data["secret_documents"]
    return response_data

# === 4. 하이브리드 채팅 엔드포인트 ===
@app.post("/chat", response_model=GameResponse)
async def chat_endpoint(request: GameRequest):
    print(f"📩 Input: {request.player_input} (Mode: {AI_MODE})")

    try:
        memories = retrieve_memory(request.player_input)
        system_instruction = get_system_prompt(request.scenario_id, memories)
        
        # --- [A] CLOUD MODE (Gemini) ---
        if AI_MODE == "cloud":
            chat = gemini_model.start_chat(history=[
                {"role": "user", "parts": [f"System:\n{system_instruction}"]}
            ])
            response = await chat.send_message_async(request.player_input)
            raw_content = response.text
            print(f"☁️ Gemini 응답: {raw_content}")

        # --- [B] LOCAL MODE (Ollama) ---
        else:
            messages = [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": request.player_input}
            ]
            payload = {
                "model": LOCAL_MODEL,
                "messages": messages,
                "stream": False,
                "format": "json",
                "options": {"temperature": 0.7}
            }
            async with httpx.AsyncClient() as client:
                resp = await client.post(OLLAMA_URL, json=payload, timeout=45.0)
                resp.raise_for_status()
                raw_content = resp.json().get("message", {}).get("content", "")
                print(f"🏠 Local 응답: {raw_content}")

        # --- 공통 처리 (JSON 파싱 및 저장) ---
        add_memory(f"User: {request.player_input}", "player")
        
        try:
            ai_json = json.loads(raw_content)
            dialogue = ai_json.get("dialogue", "...")
            add_memory(f"NPC: {dialogue}", "npc")
            
            # 특수문자 청소 (선택 사항)
            dialogue = re.sub(r"[^\uAC00-\uD7A30-9a-zA-Z\s.,?!'\"~()]", "", dialogue)

            return GameResponse(
                dialogue=dialogue,
                suspicion_delta=ai_json.get("suspicion_delta", 0),
                action=ai_json.get("action", "NONE")
            )
        except json.JSONDecodeError:
            print("⚠️ JSON 파싱 실패, 원본 반환")
            return GameResponse(dialogue=raw_content, suspicion_delta=0)

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        error_msg = "[인터넷 연결 불안정]" if AI_MODE == "cloud" else "[AI 서버 응답 없음]"
        return GameResponse(dialogue=error_msg, suspicion_delta=0)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)