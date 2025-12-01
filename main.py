import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx
import json
import re
import chromadb
import uuid
from datetime import datetime
from scenarios import get_system_prompt, get_mission_metadata

# === 설정 ===
OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL_NAME = "mistral-nemo" 

# === DB 초기화 ===
try:
    chroma_client = chromadb.PersistentClient(path="./memory_db")
    collection = chroma_client.get_or_create_collection(name="game_memory")
    print("✅ ChromaDB 연결 성공")
except Exception as e:
    print(f"❌ ChromaDB 초기화 실패: {e}")
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

# === 함수 ===
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
        memories = results['documents'][0]
        return "\n".join([f"- {m}" for m in memories])
    except Exception:
        return ""

@app.get("/mission/{scenario_id}")
async def get_mission_info(scenario_id: str):
    return get_mission_metadata(scenario_id)

# === 채팅 엔드포인트 (안전장치 강화됨) ===
@app.post("/chat", response_model=GameResponse)
async def chat_endpoint(request: GameRequest):
    print(f"📩 수신: {request.player_input} (Scenario: {request.scenario_id})")

    # ⭐ 모든 과정을 try로 감싸서 에러 원인을 출력하게 함
    try:
        # 1. 기억 검색
        relevant_memories = retrieve_memory(request.player_input)
        
        # 2. 프롬프트 생성 (여기서 에러날 확률 높음)
        system_instruction = get_system_prompt(request.scenario_id, relevant_memories)

        messages = [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": request.player_input}
        ]

        payload = {
            "model": MODEL_NAME,
            "messages": messages,
            "stream": False,
            "format": "json",
            "options": {"temperature": 0.7}
        }

        # 3. AI 통신
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(OLLAMA_URL, json=payload, timeout=30.0)
                response.raise_for_status()
                ollama_data = response.json()
                raw_content = ollama_data.get("message", {}).get("content", "")
                
                # 로그에 토큰 사용량 표시
                tokens = ollama_data.get("eval_count", 0)
                print(f"🤖 AI 응답 완료 (토큰: {tokens})")

                add_memory(f"플레이어: {request.player_input}", "player")

                # JSON 파싱 및 청소
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
                    print("⚠️ AI가 JSON 형식을 어겼습니다. 원본 반환.")
                    cleaned_raw = re.sub(r"[^\uAC00-\uD7A30-9a-zA-Z\s.,?!'\"~()]", "", raw_content)
                    return GameResponse(dialogue=cleaned_raw, suspicion_delta=0)

            except httpx.ConnectError:
                print("❌ Ollama 연결 실패! (Ollama가 켜져 있나요?)")
                return GameResponse(dialogue="[시스템 오류] AI 서버에 연결할 수 없습니다.", suspicion_delta=0)

    except Exception as e:
        # ⭐ 여기가 핵심! 에러 내용을 정확히 출력해 줌
        print(f"❌ 치명적 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc() # 상세 위치 출력
        raise HTTPException(status_code=500, detail=f"Server Error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)