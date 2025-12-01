import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx
import json

# === 설정 ===
OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL_NAME = "llama3.1"  # 노트북 모델
# MODEL_NAME = "mistral-nemo" # 데스트탑 모델 사용시 주석 제거

# === 앱 초기화 ===
app = FastAPI(title="Social Engineer Backend")

# === 데이터 모델 정의 (Godot과 주고받을 데이터 형식) ===
class GameRequest(BaseModel):
    player_input: str     # 플레이어가 입력한 대화
    suspicion: int = 0    # (추후 구현) 현재 의심 수치

class GameResponse(BaseModel):
    dialogue: str
    suspicion_delta: int = 0  # 의심 수치 변화량 (기본값 0)
    action: str = "NONE"

# [cite_start]=== 시스템 프롬프트 (NPC의 페르소나 정의) [cite: 111] ===
SYSTEM_PROMPT = {
    "role": "system",
    "content": """
    당신은 보안이 철저한 기업의 직원입니다.
    플레이어(해커)와 대화하며 다음 규칙을 따르십시오:

    1. 말투: 사무적이고, 조금은 방어적이어야 합니다.
    
    2. JSON 형식 필수: 반드시 아래 JSON 포맷으로만 응답하십시오.
    
    {
        "dialogue": "플레이어에게 할 말 (한국어)",
        "suspicion_delta": 0
    }

    3. 의심 수치(suspicion_delta) 계산 규칙:
        - 일상적인 인사나 업무 관련 대화: 0
        - 비밀번호, 서버 IP, 개인정보 요구: +10 ~ +20
        - 협박하거나 이상한 말을 함: +30
        - 해킹 시도가 명백함: +50
        - 플레이어가 신뢰를 얻는 행동을 함 (사번 제시 등): -5

    4. **언어:** 오직 '자연스러운 한국어'만 사용하십시오.
    5. **금지:** 한자(Chinese characters), 일본어(Kana), 영어 단어를 절대 섞어 쓰지 마십시오.
    6. **형식:** 반드시 지정된 JSON 포맷으로만 응답하십시오.
    7. **말투:** 번역투가 아닌, 한국인이 실제로 쓰는 구어체를 사용하십시오.
    
    예시:
    (X) "시스템의 異常 징후를 감지했습니다."
    (O) "시스템에서 이상 징후를 감지했습니다."
    절대 JSON 외의 다른 말을 덧붙이지 마십시오.
    """
}

# === 메인 채팅 엔드포인트 ===
@app.post("/chat", response_model=GameResponse)
async def chat_endpoint(request: GameRequest):
    print(f"📩 Godot 수신: {request.player_input}") 

    messages = [
        SYSTEM_PROMPT,
        {"role": "user", "content": request.player_input}
    ]

    payload = {
        "model": MODEL_NAME,
        "messages": messages,
        "stream": False, 
        "options": {"temperature": 0.3,
                    "repeat_penalty": 1.2},
        "format": "json" # ⭐ AI에게 JSON 포맷을 강제하는 옵션 (중요!)
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(OLLAMA_URL, json=payload, timeout=30.0)
            response.raise_for_status()
            
            ollama_data = response.json()
            # AI가 준 원본 텍스트 (JSON 형태의 문자열)
            raw_content = ollama_data.get("message", {}).get("content", "")
            print(f"🤖 AI 원본: {raw_content}")

            # === ⭐ 여기가 수정된 핵심 파트입니다! ===
            try:
                # 1. AI가 준 문자열을 파이썬 딕셔너리로 변환 (포장 뜯기)
                ai_json = json.loads(raw_content)
                
                # 2. 필요한 정보만 쏙쏙 뽑아서 GameResponse에 넣기
                return GameResponse(
                    dialogue=ai_json.get("dialogue", "..."),
                    suspicion_delta=ai_json.get("suspicion_delta", 0),
                    action=ai_json.get("action", "NONE")
                )
                
            except json.JSONDecodeError:
                # 만약 AI가 JSON 형식을 실수로 어겼을 때를 대비한 안전장치
                print("⚠️ JSON 파싱 실패. 원본 텍스트를 그대로 보냅니다.")
                # 가끔 AI가 딴소리를 할 때는 그냥 그 말을 dialogue로 보냅니다.
                return GameResponse(dialogue=raw_content, suspicion_delta=0)

        except Exception as e:
            print(f"❌ 오류 발생: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

# === 서버 실행 코드 ===
if __name__ == "__main__":
    # 0.0.0.0은 외부(Godot) 접속 허용, 포트는 8000번 사용
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)