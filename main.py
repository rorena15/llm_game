import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx
import json
import re
import chromadb # ⭐ 추가됨
import uuid     # 고유 ID 생성용
from datetime import datetime

# === 설정 ===
OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL_NAME = "gemma2" # 사용 중인 모델 이름 (mistral-nemo 등)

# === 장기 기억(ChromaDB) 초기화 ===
# ./memory_db 폴더에 기억을 파일로 영구 저장합니다.
chroma_client = chromadb.PersistentClient(path="./memory_db")
collection = chroma_client.get_or_create_collection(name="game_memory")

app = FastAPI(title="Social Engineer Backend")

class GameRequest(BaseModel):
    player_input: str
    suspicion: int = 0

class GameResponse(BaseModel):
    dialogue: str
    suspicion_delta: int = 0
    action: str = "NONE"

# === 기억 관련 함수 ===
def add_memory(text, speaker):
    """대화 내용을 DB에 저장"""
    collection.add(
        documents=[text],
        metadatas=[{"speaker": speaker, "timestamp": str(datetime.now())}],
        ids=[str(uuid.uuid4())]
    )

def retrieve_memory(query, n_results=3):
    """관련된 과거 기억을 검색"""
    results = collection.query(
        query_texts=[query],
        n_results=n_results
    )
    # 검색된 기억들을 하나의 문자열로 합침
    memories = results['documents'][0]
    return "\n".join([f"- {m}" for m in memories])

# === 메인 엔드포인트 ===
@app.post("/chat", response_model=GameResponse)
async def chat_endpoint(request: GameRequest):
    print(f"📩 Godot 수신: {request.player_input}")

    # 1. 과거 기억 검색 (RAG 핵심)
    # 플레이어의 말과 관련된 과거 기억을 3개 가져옵니다.
    relevant_memories = retrieve_memory(request.player_input)
    print(f"📚 검색된 기억: {relevant_memories}")

    # 2. 시스템 프롬프트에 기억 주입
    # AI에게 "이 기억을 참고해서 대답해"라고 지시합니다.
    system_instruction = f"""
    당신은 보안 직원입니다. 아래 '관련된 과거 기억'을 참고하여 대화를 이어가십시오.
    
    [관련된 과거 기억]
    {relevant_memories}
    
    [규칙]
    - 자연스러운 한국어 구어체 사용.
    - 한자/일본어 절대 금지.
    - JSON 포맷 준수.
    - 의심스러우면 suspicion_delta 증가.
    """

    messages = [
        {"role": "system", "content": system_instruction},
        {"role": "user", "content": request.player_input}
    ]

    payload = {
        "model": MODEL_NAME,
        "messages": messages,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.3}
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(OLLAMA_URL, json=payload, timeout=30.0)
            response.raise_for_status()
            
            ollama_data = response.json()
            raw_content = ollama_data.get("message", {}).get("content", "")

            # 3. 이번 대화도 기억에 저장 (플레이어 말 + AI 말)
            add_memory(f"플레이어: {request.player_input}", "player")
            
            try:
                ai_json = json.loads(raw_content)
                original_dialogue = ai_json.get("dialogue", "...")
                
                # AI의 대답도 저장해야 문맥이 이어짐
                add_memory(f"NPC: {original_dialogue}", "npc")

                # 청소 및 반환
                cleaned_dialogue = re.sub(r"[^\uAC00-\uD7A30-9a-zA-Z\s.,?!'\"~()]", "", original_dialogue)
                
                return GameResponse(
                    dialogue=cleaned_dialogue,
                    suspicion_delta=ai_json.get("suspicion_delta", 0),
                    action=ai_json.get("action", "NONE")
                )
                
            except json.JSONDecodeError:
                print("⚠️ JSON 파싱 실패")
                return GameResponse(dialogue=raw_content, suspicion_delta=0)

        except Exception as e:
            print(f"❌ 오류: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)