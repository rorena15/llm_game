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

# === 상수 정의 ===
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/chat")
REQUEST_TIMEOUT = 45.0
MEMORY_RETRIEVE_LIMIT = 3
DB_PATH = "./memory_db"
MAX_DIALOGUE_LENGTH = 100

# === 1. 설정 파일 로드 ===
def load_config() -> dict:
    """설정 파일을 로드하고 검증"""
    try:
        with open("config.json", "r", encoding="utf-8") as f:
            config = json.load(f)
        print(f"⚙️ 설정 로드 완료: 모드=[{config['ai_mode']}]")
        return config
    except FileNotFoundError:
        print("❌ config.json 파일을 찾을 수 없습니다! 기본값(local)으로 시작합니다.")
        return {
            "ai_mode": "local",
            "local_model_name": "mistral",
            "google_api_key": ""
        }
    except json.JSONDecodeError as e:
        print(f"❌ config.json 파싱 오류: {e}")
        raise

config = load_config()

# === 2. AI 초기화 ===
AI_MODE = config.get("ai_mode", "local").lower()
gemini_model = None

def init_gemini() -> Optional[genai.GenerativeModel]:
    """Gemini AI 초기화"""
    # 환경 변수 우선, 없으면 config 사용
    api_key = os.getenv("GOOGLE_API_KEY") or config.get("google_api_key", "")
    
    if not api_key or "여기에" in api_key:
        print("⚠️ 경고: Google API 키가 설정되지 않았습니다.")
        print("   환경 변수 GOOGLE_API_KEY 또는 config.json을 확인하세요.")
        return None
    
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            config.get("cloud_model_name", "gemini-1.5-flash"),
            generation_config={"response_mime_type": "application/json"}
        )
        print("☁️ Cloud AI (Gemini) 모드로 대기 중...")
        return model
    except Exception as e:
        print(f"❌ Gemini 초기화 실패: {e}")
        return None

if AI_MODE == "cloud":
    gemini_model = init_gemini()
else:
    LOCAL_MODEL = config.get("local_model_name", "mistral")
    print(f"🏠 Local AI ({LOCAL_MODEL}) 모드로 대기 중... (Ollama 켜져 있나요?)")

# === 3. DB 초기화 ===
def init_chromadb() -> Optional[chromadb.Collection]:
    """ChromaDB 초기화"""
    try:
        chroma_client = chromadb.PersistentClient(path=DB_PATH)
        collection = chroma_client.get_or_create_collection(name="game_memory")
        print(f"💾 ChromaDB 초기화 완료 (경로: {DB_PATH})")
        return collection
    except Exception as e:
        print(f"⚠️ ChromaDB 초기화 실패: {e}")
        print("   메모리 기능 없이 계속합니다.")
        return None

collection = init_chromadb()

# === 4. FastAPI 앱 설정 ===
app = FastAPI(
    title="Social Engineer Backend",
    description="하이브리드 AI 기반 소셜 엔지니어링 게임",
    version="1.0.0"
)

class GameRequest(BaseModel):
    player_input: str
    suspicion: int = 0
    scenario_id: str = "mission_1"
    session_id: Optional[str] = None  # 세션별 메모리 분리

class GameResponse(BaseModel):
    dialogue: str
    suspicion_delta: int = 0
    action: str = "NONE"
    error: Optional[str] = None

# === 5. 유틸리티 함수 ===
def add_memory(text: str, speaker: str, session_id: Optional[str] = None) -> None:
    """대화 메모리에 추가"""
    if not collection:
        return
    
    try:
        metadata = {
            "speaker": speaker,
            "timestamp": str(datetime.now()),
            "session_id": session_id or "default"
        }
        collection.add(
            documents=[text],
            metadatas=[metadata],
            ids=[str(uuid.uuid4())]
        )
    except Exception as e:
        print(f"⚠️ 메모리 저장 실패: {e}")

def retrieve_memory(query: str, session_id: Optional[str] = None, n_results: int = MEMORY_RETRIEVE_LIMIT) -> str:
    """관련 메모리 검색"""
    if not collection:
        return ""
    
    try:
        # 세션별 필터링
        where_filter = {"session_id": session_id or "default"} if session_id else None
        
        results = collection.query(
            query_texts=[query],
            n_results=n_results,
            where=where_filter
        )
        
        if not results['documents'] or not results['documents'][0]:
            return ""
        
        return "\n".join([f"- {doc}" for doc in results['documents'][0]])
    except Exception as e:
        print(f"⚠️ 메모리 검색 실패: {e}")
        return ""

def sanitize_dialogue(text: str) -> str:
    """대화 텍스트 정제"""
    # 특수문자 제거 (한글, 영문, 숫자, 기본 문장부호만 남김)
    cleaned = re.sub(r"[^\uAC00-\uD7A30-9a-zA-Z\s.,?!'\"~()-]", "", text)
    return cleaned.strip()

# === 6. API 엔드포인트 ===
@app.get("/")
async def root():
    """헬스 체크"""
    return {
        "status": "online",
        "ai_mode": AI_MODE,
        "memory_enabled": collection is not None,
        "model": LOCAL_MODEL if AI_MODE == "local" else config.get("cloud_model_name")
    }

@app.get("/mission/{scenario_id}")
async def get_mission_info(scenario_id: str):
    """미션 정보 조회"""
    try:
        metadata = get_mission_metadata(scenario_id)
        docs = metadata.get("secret_documents", [])
        selected_secret = random.choice(docs) if docs else "기밀 문서 없음"
        
        response_data = metadata.copy()
        response_data["target_secret"] = selected_secret
        if "secret_documents" in response_data:
            del response_data["secret_documents"]
        
        return response_data
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"시나리오를 찾을 수 없습니다: {scenario_id}")

async def call_gemini(system_instruction: str, user_input: str) -> str:
    """Gemini API 호출"""
    if not gemini_model:
        raise HTTPException(status_code=503, detail="Gemini 모델이 초기화되지 않았습니다")
    
    chat = gemini_model.start_chat(history=[
        {"role": "user", "parts": [f"System:\n{system_instruction}"]}
    ])
    response = await chat.send_message_async(user_input)
    return response.text

async def call_ollama(system_instruction: str, user_input: str) -> str:
    """Ollama API 호출"""
    messages = [
        {"role": "system", "content": system_instruction},
        {"role": "user", "content": user_input}
    ]
    
    payload = {
        "model": LOCAL_MODEL,
        "messages": messages,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.7}
    }
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(OLLAMA_URL, json=payload, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        return resp.json().get("message", {}).get("content", "")

@app.post("/chat", response_model=GameResponse)
async def chat_endpoint(request: GameRequest):
    """메인 채팅 엔드포인트"""
    print(f"📩 Input: {request.player_input} (Mode: {AI_MODE}, Session: {request.session_id})")

    try:
        # 메모리 검색
        memories = retrieve_memory(request.player_input, request.session_id)
        system_instruction = get_system_prompt(request.scenario_id, memories)
        
        # --- AI 호출 ---
        if AI_MODE == "cloud":
            raw_content = await call_gemini(system_instruction, request.player_input)
            print(f"☁️ Gemini 응답: {raw_content[:100]}...")
        else:
            raw_content = await call_ollama(system_instruction, request.player_input)
            print(f"🏠 Ollama 응답: {raw_content[:100]}...")

        # === [수정된 파싱 및 후처리 로직] ===
        add_memory(f"User: {request.player_input}", "player", request.session_id)
        
        dialogue = "..."
        suspicion_delta = 0
        action = "NONE"
        
        try:
            # 1. 1차 시도: 순수 JSON 파싱
            ai_json = json.loads(raw_content)
            dialogue = ai_json.get("dialogue", "...")
            suspicion_delta = ai_json.get("suspicion_delta", 0)
            action = ai_json.get("action", "NONE")
            print("✅ [파싱 성공] 순수 JSON 파싱 완료")
            
        except json.JSONDecodeError:
            print(f"⚠️ [파싱 실패] 1차 JSON 실패. 자동 복구 시도...")
            
            # 2. 2차 시도: 마크다운 코드 블록(```json ... ```) 추출
            json_match = re.search(r"```(?:json)?\s*({.*?})\s*```", raw_content, re.DOTALL)
            parsing_success = False
            
            if json_match:
                try:
                    ai_json = json.loads(json_match.group(1))
                    dialogue = ai_json.get("dialogue", "...")
                    suspicion_delta = ai_json.get("suspicion_delta", 0)
                    action = ai_json.get("action", "NONE")
                    parsing_success = True
                    print("✅ [복구 성공] 마크다운에서 JSON 추출 완료")
                except:
                    pass  # 추출했는데도 깨져있으면 패스
            
            # 3. 최후의 보루: 텍스트 그대로 출력 (게임적 허용)
            if not parsing_success:
                print("❌ [복구 실패] 원본 텍스트 사용 및 패널티 부여")
                dialogue = raw_content.strip()
                
                # 너무 길면 자르기 (UI 보호)
                if len(dialogue) > MAX_DIALOGUE_LENGTH:
                    dialogue = dialogue[:97] + "..."
                
                # 패널티: AI가 포맷을 어겼으므로 의심도 대폭 증가
                suspicion_delta = 20
                action = "GLITCH"  # 혹은 NONE
        
        # === 공통 후처리 (메모 저장 및 특수문자 제거) ===
        # 1. 특수문자 청소 (한국어, 영어, 숫자, 기본 문장부호만 허용)
        # 튜닝: 대괄호[]나 중괄호{}가 그대로 노출되는걸 막으려면 여기서 처리
        dialogue = sanitize_dialogue(dialogue)
        
        # 2. NPC 기억 저장
        add_memory(f"NPC: {dialogue}", "npc", request.session_id)
        
        # 3. 최종 응답 반환
        return GameResponse(
            dialogue=dialogue,
            suspicion_delta=suspicion_delta,
            action=action
        )

    except httpx.TimeoutException:
        error_msg = "[응답 시간 초과] AI 서버가 응답하지 않습니다."
        return GameResponse(dialogue=error_msg, suspicion_delta=0, error="timeout")
    
    except httpx.HTTPStatusError as e:
        error_msg = f"[연결 오류] 상태 코드: {e.response.status_code}"
        return GameResponse(dialogue=error_msg, suspicion_delta=0, error="http_error")
    
    except Exception as e:
        print(f"❌ 예상치 못한 오류: {type(e).__name__}: {str(e)}")
        error_msg = "[시스템 오류] 잠시 후 다시 시도해주세요."
        return GameResponse(dialogue=error_msg, suspicion_delta=0, error=str(e))

# === 7. 관리 엔드포인트 ===
@app.delete("/memory/{session_id}")
async def clear_session_memory(session_id: str):
    """특정 세션의 메모리 삭제"""
    if not collection:
        raise HTTPException(status_code=503, detail="메모리 시스템이 비활성화되어 있습니다")
    
    try:
        # 해당 세션의 모든 문서 삭제
        results = collection.get(where={"session_id": session_id})
        if results['ids']:
            collection.delete(ids=results['ids'])
            return {"message": f"{len(results['ids'])}개의 메모리를 삭제했습니다", "session_id": session_id}
        return {"message": "삭제할 메모리가 없습니다", "session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"메모리 삭제 실패: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)