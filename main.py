import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx
import json
import re
import chromadb
import uuid
from datetime import datetime

# ⭐ 시나리오 모듈 임포트
from scenarios import get_system_prompt, get_mission_metadata

# === 설정 ===
OLLAMA_URL = "http://localhost:11434/api/chat"
# MODEL_NAME = "llama3.1"
MODEL_NAME = "mistral-nemo"
# 모델 명은 장치 별로 구분
# 노트북은 llama3.1
# 데스크탑은 mistral-nemo OR gemma2로 변경해서 사용

# === 장기 기억(ChromaDB) 초기화 ===
chroma_client = chromadb.PersistentClient(path="./memory_db")
collection = chroma_client.get_or_create_collection(name="game_memory")

app = FastAPI(title="Social Engineer Backend")

# === 데이터 모델 ===
class GameRequest(BaseModel):
    player_input: str
    suspicion: int = 0
    # ⭐ 시나리오 ID 추가 (Godot에서 안 보내면 기본값 'mission_1' 사용)
    scenario_id: str = "mission_1"

class GameResponse(BaseModel):
    dialogue: str
    suspicion_delta: int = 0
    action: str = "NONE"

# === 기억 관련 함수 ===
def add_memory(text, speaker):
    """대화 내용을 벡터 DB에 저장"""
    collection.add(
        documents=[text],
        metadatas=[{"speaker": speaker, "timestamp": str(datetime.now())}],
        ids=[str(uuid.uuid4())]
    )

def retrieve_memory(query, n_results=3):
    """입력과 관련된 과거 기억 검색"""
    results = collection.query(
        query_texts=[query],
        n_results=n_results
    )
    if not results['documents']:
        return "관련된 기억 없음."
    memories = results['documents'][0]
    return "\n".join([f"- {m}" for m in memories])

# === [추가] 미션 정보 조회 엔드포인트 ===
@app.get("/mission/{scenario_id}")
async def get_mission_info(scenario_id: str):
    """Godot이 현재 미션의 정답과 목표를 받아가는 곳"""
    return get_mission_metadata(scenario_id)

# === 메인 엔드포인트 ===
@app.post("/chat", response_model=GameResponse)
async def chat_endpoint(request: GameRequest):
    print(f"📩 Godot 수신: {request.player_input} (Scenario: {request.scenario_id})")

    # 1. 과거 기억 검색 (RAG)
    relevant_memories = retrieve_memory(request.player_input)
    print(f"📚 검색된 기억: {relevant_memories}")

    # 2. 시스템 프롬프트 구성 (모듈화됨)
    # scenarios.py에서 ID와 기억을 넣어 완성된 프롬프트를 받아옵니다.
    system_instruction = get_system_prompt(request.scenario_id, relevant_memories)

    messages = [
        {"role": "system", "content": system_instruction},
        {"role": "user", "content": request.player_input}
    ]

    payload = {"model": MODEL_NAME,
                "messages": messages,
                "stream": False, 
                "format": "json", 
                "options": {"temperature": 0.7
                            }
                } # 창의성 약간 높임

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(OLLAMA_URL, json=payload, timeout=30.0)
            response.raise_for_status()
            ollama_data = response.json()
            raw_content = ollama_data.get("message", {}).get("content", "")
            
            add_memory(f"플레이어: {request.player_input}", "player")

            try:
                ai_json = json.loads(raw_content)
                original_dialogue = ai_json.get("dialogue", "...")
                add_memory(f"NPC: {original_dialogue}", "npc")
                cleaned_dialogue = re.sub(r"[^\uAC00-\uD7A30-9a-zA-Z\s.,?!'\"~()]", "", original_dialogue)

                return GameResponse(
                    dialogue=cleaned_dialogue,
                    suspicion_delta=ai_json.get("suspicion_delta", 0),
                    action=ai_json.get("action", "NONE")
                )
            except json.JSONDecodeError:
                cleaned_raw = re.sub(r"[^\uAC00-\uD7A30-9a-zA-Z\s.,?!'\"~()]", "", raw_content)
                return GameResponse(dialogue=cleaned_raw, suspicion_delta=0)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)