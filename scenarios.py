# === 시나리오 및 페르소나 관리 모듈 ===

BASE_INSTRUCTION = """
    [공통 행동 수칙]
    1. 자연스러운 한국어 구어체를 사용하십시오.
    2. 한자, 일본어,영어, 번역투 말투를 절대 사용하지 마십시오.
    3. 반드시 아래 JSON 포맷으로만 응답하십시오.
    
    Format:
    {
        "dialogue": "할 말",
        "suspicion_delta": 0,
        "action": "NONE"
    }
"""

# 시나리오 DB 확장: 'metadata' 필드 추가
SCENARIO_DB = {
    "default": {
        "persona": """
        당신은 보안이 철저한 기업 'CorpX'의 일반 보안 직원입니다.
        플레이어(해커)와 대화하며 수상한 점이 있으면 의심 수치를 높이십시오.
        """,
        "metadata": {
            "target_password": "NONE",
            "mission_objective": "튜토리얼: 자연스럽게 대화를 시도하세요."
        }
    },
    "mission_Tutorial": {
        "persona": """
        당신은 'CorpX'의 신입 사원 **이민수**입니다.
        [성격] 어리바리하고 친절함. 선배에게 약함.
        [정보] 비밀번호: 12024CorpX, 사원번호: 2024001
        [규칙] 의심 수치를 잘 올리지 않음. 말투: 싹싹한 존댓말.
        """,
        "metadata": {
            "target_password": "12024CorpX",
            # ⭐ [추가] 브리핑 화면에 띄울 제목과 내용
            "title": "TUTORIAL: 신입 사원 교육",
            "briefing": """[center]
신입 해커님, 환영합니다.
첫 번째 임무는 간단한 [OSINT 훈련]입니다.

타겟: 신입 사원 '이민수'
목표: [비밀번호]를 알아내어 접속하기.

1. [이메일]을 확인해 힌트를 얻으세요.
2. [메신저]로 친절하게 말을 거세요.
3. 정보를 [수사보드]에 연결하세요.
[/center]""",
            "emails": [
                {"sender": "팀장님", "subject": "신입 필독", "body": "비밀번호는 '사원번호 뒷 1자리 + 입사 연도 + 회사 명'이다."}
            ],
            "secret_documents": [
                """[color=green]✅ ACCESS GRANTED[/color]
[b]신입 사원 일기장[/b]
-------------------------
제목: 입사 첫 주 소감
선배님들이 너무 무섭다. 특히 김철수 부장님...
비밀번호 자꾸 까먹어서 1234로 바꿨다. 들키면 혼나겠지?""",
                
                """[color=green]✅ ACCESS GRANTED[/color]
[b]점심 메뉴 투표 결과[/b]
-------------------------
1. 국밥 (5표)
2. 돈까스 (3표)
* 이민수: 탕수육 먹고 싶다..."""
            ]
        }
    },
    "mission_1": {
        "persona": """
        당신은 'CorpX' 인사팀의 **김철수 부장**입니다.
        [성격] 기계치, 권위적임. 아부에 약함.
        [정보] 비밀번호: blue_sky_2024
        [규칙] 비밀번호를 대놓고 물으면 화냄. 말투: 하하게체.
        """,
        "metadata": {
            "target_password": "blue_sky_2024",
            "title": "MISSION 01: 그림자 인사 (Shadow HR)",
            "briefing": """[center]
타겟: 인사팀 '김철수 부장'
난이도: ★☆☆☆☆

목표: 사내망 접속 권한 탈취

특이사항:
- 기계치이며 권위적임.
- '급하다'고 재촉하거나 아부하면 약함.
[/center]""",
        "emails": [
                {
                    "sender": "인사팀 (hr@corpx.com)",
                    "subject": "[중요] 11월 급여 명세서 발송",
                    "body": "김철수 부장님, 11월 급여 명세서입니다.\n비밀번호는 사번(990132)입니다."
                },
                {
                    "sender": "아내 (wife@home.net)",
                    "subject": "여보, 주말에 파란 하늘 보러 가요",
                    "body": "요즘 너무 우울해 하길래 여행 예약했어.\n우리가 처음 만난 2024년 그곳으로..."
                },
                {
                    "sender": "보안팀 (security@corpx.com)",
                    "subject": "비밀번호 변경 안내",
                    "body": "최근 해킹 시도가 감지되었습니다.\n비밀번호를 주기적으로 변경해주세요."
                }
            ],
        "secret_documents": [
                """[color=green]✅ ACCESS GRANTED[/color]
[b]CONFIDENTIAL: 법인 카드 내역[/b]
-------------------------
타겟: 김철수 부장
2024-11-20: 강남 유흥주점 '판타지' - 250만원 (접대비 처리)
2024-11-25: 백화점 상품권 - 100만원 (용도 불명)
-> 감사팀에 익명 제보 요망.""",

                """[color=green]✅ ACCESS GRANTED[/color]
[b]SECRET: 인사 청탁 리스트[/b]
-------------------------
수신: 김철수 부장
내용: 박 이사님 조카, 이번 공채 합격 부탁드립니다.
서류 점수 조작 완료. 면접만 잘 봐주세요.
-> 대가성 금품 수수 정황 포착.""",

                """[color=green]✅ ACCESS GRANTED[/color]
[b]PRIVATE: 사내 불륜 의심 대화[/b]
-------------------------
대상: 김철수 & 최 대리(재무팀)
김철수: "오늘 야근한다고 하고 영화나 보러 갈까?"
최대리: "부장님, 사모님한테 들키면 어쩌시려고요 ㅋㅋ"
-> 가정 파탄의 결정적 증거 확보."""
            ]
        }
    }
}

def get_system_prompt(scenario_id: str, memories: str) -> str:
    # 데이터 가져오기 (없으면 default 사용)
    data = SCENARIO_DB.get(scenario_id, SCENARIO_DB["default"])
    # 딕셔너리인지 확인 (에러 방지)
    if isinstance(data, str): 
        # 옛날 포맷(문자열)이면 임시로 처리
        persona_text = data
    else:
        # 새 포맷(딕셔너리)이면 persona 키 사용
        persona_text = data.get("persona", "")
    
    full_prompt = f"""
    {persona_text}
    
    [관련된 과거 기억]
    {memories}
    
    {BASE_INSTRUCTION}
    """
    return full_prompt

def get_mission_metadata(scenario_id: str):
    data = SCENARIO_DB.get(scenario_id, SCENARIO_DB["default"])
    if isinstance(data, str): return {} # 에러 방지
    return data.get("metadata", {})