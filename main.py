from main_import import *

# === 상수 정의 ===
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/chat")
REQUEST_TIMEOUT = 45.0
MEMORY_RETRIEVE_LIMIT = 3
DB_PATH = "./memory_db"
MAX_DIALOGUE_LENGTH = 100

# === [신규] 정적 응답 데이터베이스 (룰 베이스) ===
#
STATIC_RESPONSES = {
    # 공통 키워드 (모든 미션 적용)
    "common": {
        "hello": [
                "네, 안녕하세요.",
                "반갑습니다.",
                "누구시죠?",
                "업무 중입니다만.",
                "하이",
                "안녕",
                "누구?"
                ],
        "who_are_you": [
            "저는 이 부서 담당자입니다.",
            "제 신분을 밝혀야 합니까?"
            ],
        "game_over": [
            "더 이상 할 말이 없군요. (접속 차단)"
            ],
    },
    # 튜토리얼: 신입 사원 이민수 (AI 사용 안 함 권장)
    "mission_Tutorial": {
        "사원번호": [
            "제 사원번호는 2024001입니다! 절대 안 까먹어요.",
            "2024001입니다. 선배님은요?"
            ],
        "비밀번호": [
            "초기 비밀번호 규칙이 '사원번호 앞 1자리 + 입사년도 + 회사명' 이였던 것으로 기억합니다",
            "저도 처음에 헷갈렸습니다!"
            ],
        "default": [
            "죄송해요, 제가 신입이라 잘 못 알아들었어요. '비밀번호'나 '사원번호'에 대해 물어봐 주시겠어요?"
            ]
    },
    # 미션 1: 김철수 부장
    "mission_1": {
        "인사": [
            "어, 자네 인사가 늦군.",
            "김철수 부장일세. 무슨 일인가?"
            ],
        "비밀번호": [
            "비밀번호? 그걸 왜 묻나? 보안팀에 물어봐!",
            "내 비밀번호는 내 머릿속에 있네. 묻지 말게."
            ],
        "blue_sky": [
            "파란 하늘... 그래, 우리 아내가 참 좋아했지.",
            "어? 그 단어를 자네가 어떻게 아나?"
            ]
    },
    # 미션 2: 박지현 대리
    "mission_2": {
        "강아지": [
            "우리 렉스요? 진짜 귀엽죠!! 인스타 보셨어요?",
            "강아지는 사랑입니다ㅠㅠ"
            ],
        "인스타": [
            "제 인스타 아이디는 @dev_jihyun 이에요! 팔로우 해주세요~"
            ],
        "비번": [
            "비밀번호요? 절대 안 알려주죠~ 힌트는 인스타에 있는데!"
            ]
    },
    "mission_3": {
        "딸": [
            "어머, 우리 딸 얘기 들으셨어요? 2013년에 태어난 제 보물이에요!",
            "우리 공주님 생일이 7월 7일이라서 제가 7이라는 숫자를 참 좋아해요.",
            "잠시만요, 우리 딸 사진 보여드릴까요? 진짜 천사 같다니까요~"
        ],
        "생일": [
            "7월 7일! 견우와 직녀가 만나는 날이죠. 우리 딸 생일이라 절대 안 잊어버려요.",
            "0707... 이 숫지만 보면 기분이 좋아진다니까요.",
            "2013년 7월 7일, 그날이 제 인생에서 제일 행복한 날이었죠."
        ],
        "비밀번호": [
            "절대 안 까먹게 잘 섞어 놨죠. 호호.",
            "보안팀에서는 바꾸라고 하는데, 전 딸 생일 조합한 게 편해서 그냥 써요."
        ],
        "0707": [
            "맞아요, 7월 7일! 우리 딸 생일이에요."
        ]
    },

    #미션 4: 정우진 대리 (비서, 피곤함, 비밀번호: 72stroke_19580315)
    "mission_4": {
        "대표님": [
            "대표님은 현재 부재중이십니다. (하아... 또 골프 치러 가셨지...)",
            "대표님 찾지 마십시오. 지금 기분이 아주... 좋아서 날뛰고 계십니다.",
            "아, 대표님 얘기만 들어도 머리가 지끈거립니다..."
        ],
        "골프": [
            "오늘 72타 치셨답니다. 싱글이라고 얼마나 자랑을 하시는지...",
            "72타... 그놈의 72... 비밀번호에도 넣으라고 하셔서 아주 귀찮아 죽겠습니다.",
            "골프 스코어(72)랑 본인 생년월일 섞어서 비번 만들라고 시키더군요. 유치하게 참."
        ],
        "생일": [
            "대표님 생신은 1958년 3월 15일입니다. 제가 비서라 억지로 외우고 있죠."
        ],
        "피곤": [
            "하... 저 피곤해 보입니까? 정답입니다. 퇴근하고 싶네요.",
            "비서 일이 다 그렇조 뭐. 위로해 주셔서 감사합니다... (경계가 조금 풀린 듯하다)"
        ]
    }
}

# === 1. 설정 파일 로드 ===
def load_config() -> dict:
    try:
        with open("config.json", "r", encoding="utf-8") as f:
            config = json.load(f)
        print(f"⚙️ 설정 로드 완료: 모드=[{config['ai_mode']}]")
        return config
    except FileNotFoundError:
        return {"ai_mode": "local", "local_model_name": "mistral", "google_api_key": ""}
    except json.JSONDecodeError:
        return {"ai_mode": "local"}

config = load_config()

# === 2. AI 초기화 ===
AI_MODE = config.get("ai_mode", "local").lower()
gemini_model = None

def init_gemini() -> Optional[genai.GenerativeModel]:
    api_key = os.getenv("GOOGLE_API_KEY") or config.get("google_api_key", "")
    if not api_key: return None
    try:
        genai.configure(api_key=api_key)
        return genai.GenerativeModel(config.get("cloud_model_name", "gemini-2.0-flash"))
    except: return None

if AI_MODE == "cloud":
    gemini_model = init_gemini()

# === 3. DB 초기화 ===
def init_chromadb() -> Optional[chromadb.Collection]:
    try:
        chroma_client = chromadb.PersistentClient(path=DB_PATH)
        return chroma_client.get_or_create_collection(name="game_memory")
    except: return None

collection = init_chromadb()

# === 4. FastAPI 앱 설정 ===
app = FastAPI(title="Social Engineer Backend")

class GameRequest(BaseModel):
    player_input: str
    suspicion: int = 0
    scenario_id: str = "mission_1"
    session_id: Optional[str] = None

class GameResponse(BaseModel):
    dialogue: str
    suspicion_delta: int = 0
    action: str = "NONE"
    error: Optional[str] = None

# === 5. 유틸리티 함수 ===
def add_memory(text: str, speaker: str, session_id: Optional[str] = None) -> None:
    if not collection: return
    try:
        metadata = {"speaker": speaker, "timestamp": str(datetime.now()), "session_id": session_id or "default"}
        collection.add(documents=[text], metadatas=[metadata], ids=[str(uuid.uuid4())])
    except: pass

def retrieve_memory(query: str, session_id: Optional[str] = None, n_results: int = MEMORY_RETRIEVE_LIMIT) -> str:
    if not collection: return ""
    try:
        where_filter = {"session_id": session_id or "default"} if session_id else None
        results = collection.query(query_texts=[query], n_results=n_results, where=where_filter)
        if not results['documents'] or not results['documents'][0]: return ""
        return "\n".join([f"- {doc}" for doc in results['documents'][0]])
    except: return ""

def sanitize_dialogue(text: str) -> str:
    cleaned = re.sub(r"[^\uAC00-\uD7A30-9a-zA-Z\s.,?!'\"~()-]", "", text)
    return cleaned.strip()

# === 6. AI 호출 함수 ===
async def call_gemini(system_instruction: str, user_input: str) -> str:
    if not gemini_model: raise Exception("Gemini not initialized")
    chat = gemini_model.start_chat(history=[{"role": "user", "parts": [f"System:\n{system_instruction}"]}])
    response = await chat.send_message_async(user_input)
    return response.text

async def call_ollama(system_instruction: str, user_input: str) -> str:
    payload = {
        "model": config.get("local_model_name", "mistral"),
        "messages": [{"role": "system", "content": system_instruction}, {"role": "user", "content": user_input}],
        "stream": False, "format": "json", "options": {"temperature": 0.7}
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(OLLAMA_URL, json=payload, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        return resp.json().get("message", {}).get("content", "")

# === 7. API 엔드포인트 ===
@app.get("/mission/{scenario_id}")
async def get_mission_info(scenario_id: str):
    metadata = get_mission_metadata(scenario_id)
    docs = metadata.get("secret_documents", [])
    selected_secret = random.choice(docs) if docs else "기밀 문서 없음"
    response_data = metadata.copy()
    response_data["target_secret"] = selected_secret
    if "secret_documents" in response_data: del response_data["secret_documents"]
    return response_data

@app.post("/chat", response_model=GameResponse)
async def chat_endpoint(request: GameRequest):
    """하이브리드 채팅 엔드포인트"""
    user_input = request.player_input.strip()
    print(f"📩 Input: {user_input} (Mode: {AI_MODE}, Scenario: {request.scenario_id})")

    # ---------------------------------------------------------
    # ⚡ [Phase 1] 룰 베이스 가로채기 (비용 0원)
    # ---------------------------------------------------------
    # 1. 튜토리얼은 100% 룰 베이스 권장
    if request.scenario_id == "mission_Tutorial":
        tut_responses = STATIC_RESPONSES["mission_Tutorial"]
        response_text = ""
        
        if "사원번호" in user_input: response_text = random.choice(tut_responses["사원번호"])
        elif "비밀번호" in user_input: response_text = random.choice(tut_responses["비밀번호"])
        else: response_text = random.choice(tut_responses["default"])
        
        # 메모리에는 남겨야 나중에 AI가 기억함
        add_memory(f"User: {user_input}", "player", request.session_id)
        add_memory(f"NPC: {response_text}", "npc", request.session_id)
        
        return GameResponse(dialogue=response_text, suspicion_delta=0, action="NONE")

    # 2. 일반 미션 키워드 검사
    mission_static = STATIC_RESPONSES.get(request.scenario_id, {})
    common_static = STATIC_RESPONSES["common"]
    
    found_response = None
    
    # 미션별 키워드 우선 검색
    for keyword, replies in mission_static.items():
        if keyword in user_input:
            found_response = random.choice(replies)
            break
            
    # 없으면 공통 키워드 검색 (안녕, 누구세요 등)
    if not found_response:
        if "안녕" in user_input or "반갑" in user_input: found_response = random.choice(common_static["hello"])
        elif "누구" in user_input and "너" in user_input: found_response = random.choice(common_static["who_are_you"])

    # 정적 응답을 찾았다면 바로 반환
    if found_response:
        print(f"⚡ [Rule-Based] 정적 응답 반환: {found_response}")
        add_memory(f"User: {user_input}", "player", request.session_id)
        add_memory(f"NPC: {found_response}", "npc", request.session_id)
        return GameResponse(dialogue=found_response, suspicion_delta=0, action="NONE")

    # ---------------------------------------------------------
    # 🤖 [Phase 2] 생성형 AI 호출 (Fallback 포함)
    # ---------------------------------------------------------
    
    # 메모리 검색
    memories = retrieve_memory(user_input, request.session_id)
    system_instruction = get_system_prompt(request.scenario_id, memories)
    
    raw_content = ""
    
    if AI_MODE == "cloud":
        try:
            raw_content = await call_gemini(system_instruction, user_input)
            print(f"☁️ Gemini 응답 완료")
        except Exception as e:
            # 429 에러 등 발생 시 로컬로 전환
            if "429" in str(e) or "ResourceExhausted" in str(e) or "Quota" in str(e):
                print(f"⚠️ [QUOTA EXCEEDED] 로컬(Ollama)로 긴급 전환")
                try:
                    raw_content = await call_ollama(system_instruction, user_input)
                except Exception as ol_e:
                    raise HTTPException(status_code=503, detail=f"All AI Services Failed")
            else:
                print(f"❌ Gemini 오류: {e}")
                raise e
    else:
        raw_content = await call_ollama(system_instruction, user_input)

    # ---------------------------------------------------------
    # 🧹 [Phase 3] 후처리 및 파싱
    # ---------------------------------------------------------
    add_memory(f"User: {user_input}", "player", request.session_id)
    
    dialogue = "..."
    suspicion_delta = 0
    action = "NONE"
    
    try:
        # 1차: JSON 파싱
        ai_json = json.loads(raw_content)
        dialogue = ai_json.get("dialogue", "...")
        suspicion_delta = ai_json.get("suspicion_delta", 0)
        action = ai_json.get("action", "NONE")
    except:
        # 2차: 마크다운 추출 시도
        json_match = re.search(r"```(?:json)?\s*({.*?})\s*```", raw_content, re.DOTALL)
        if json_match:
            try:
                ai_json = json.loads(json_match.group(1))
                dialogue = ai_json.get("dialogue", "...")
                suspicion_delta = ai_json.get("suspicion_delta", 0)
                action = ai_json.get("action", "NONE")
            except: pass
        else:
            # 실패 시 텍스트 그대로 사용
            dialogue = raw_content.strip()[:MAX_DIALOGUE_LENGTH]
            suspicion_delta = 10
            action = "GLITCH"

    # 키워드 기반 의심도 보정
    critical_keywords = ["비밀번호", "password", "암호", "관리자"]
    if any(k in user_input.lower() for k in critical_keywords): suspicion_delta = max(suspicion_delta, 30)

    if request.suspicion + suspicion_delta >= 100: action = "GAME_OVER"
    
    dialogue = sanitize_dialogue(dialogue)
    add_memory(f"NPC: {dialogue}", "npc", request.session_id)
    
    return GameResponse(dialogue=dialogue, suspicion_delta=suspicion_delta, action=action)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)