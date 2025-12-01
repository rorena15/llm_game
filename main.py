import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx
import json

# === 설정 ===
OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL_NAME = "llama3.1"  # 사용자 사양에 맞춘 최적 모델 (변경 가능: llama3, mistral)

# === 앱 초기화 ===
app = FastAPI(title="Social Engineer Backend")

# === 데이터 모델 정의 (Godot과 주고받을 데이터 형식) ===
class GameRequest(BaseModel):
    player_input: str     # 플레이어가 입력한 대화
    suspicion: int = 0    # (추후 구현) 현재 의심 수치

class GameResponse(BaseModel):
    dialogue: str         # NPC의 대답
    action: str = "NONE"  # (추후 구현) NPC의 행동 (예: 끊기, 검색 등)

# [cite_start]=== 시스템 프롬프트 (NPC의 페르소나 정의) [cite: 111] ===
SYSTEM_PROMPT = {
    "role": "system",
    "content": """
    당신은 가상의 기업 'CorpX'의 보안 시스템 속에 있는 직원입니다.
    플레이어(해커)의 질문에 자연스러운 한국어로 대답하십시오.
    말투는 사무적이고 약간은 방어적이어야 합니다.
    답변은 1~2문장으로 간결하게 하세요.
    """
}

# === 메인 채팅 엔드포인트 ===
@app.post("/chat", response_model=GameResponse)
async def chat_endpoint(request: GameRequest):
    print(f"📩 Godot 수신: {request.player_input}") # 로그 출력

    # Ollama에 보낼 메시지 구성
    messages = [
        SYSTEM_PROMPT,
        {"role": "user", "content": request.player_input}
    ]

    payload = {
        "model": MODEL_NAME,
        "messages": messages,
        "stream": False, # 스트리밍 없이 한 번에 받기 (구현 용이성)
        "options": {
            "temperature": 0.7 # 창의성 조절
        }
    }

    # [cite_start]비동기(Async)로 Ollama 서버와 통신 [cite: 79]
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(OLLAMA_URL, json=payload, timeout=30.0)
            response.raise_for_status()
            
            # Ollama 응답 파싱
            ollama_data = response.json()
            npc_reply = ollama_data.get("message", {}).get("content", "")
            
            print(f"📤 NPC 응답: {npc_reply}") # 로그 출력

            return GameResponse(dialogue=npc_reply)

        except Exception as e:
            print(f"❌ 오류 발생: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

# === 서버 실행 코드 ===
if __name__ == "__main__":
    # 0.0.0.0은 외부(Godot) 접속 허용, 포트는 8000번 사용
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)