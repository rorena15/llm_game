extends Control

@onready var game_over_overlay = $GameOverOverlay # 게임 오버 화면
@onready var retry_button = $GameOverOverlay/RetryButton # 재시작 버튼
@onready var suspicion_bar = $SuspicionBar #의심도 진척
@onready var http_request = $ServerRequest
@onready var chat_output = $VBoxContainer/ChatOutput
@onready var user_input = $VBoxContainer/UserInput
@onready var send_button = $VBoxContainer/SendButton

const SERVER_URL = "http://127.0.0.1:8000/chat"
var current_suspicion = 0

func _ready():
	send_button.pressed.connect(_on_send_button_pressed)
	http_request.request_completed.connect(_on_request_completed)
	user_input.gui_input.connect(_on_user_input_gui_input)
	
	# ⭐ 핵심: 링크(BBCode URL) 클릭 신호 연결
	chat_output.meta_clicked.connect(_on_meta_clicked)
	
	add_chat_log("System", "서버 로그인 완료.")
	retry_button.pressed.connect(_on_retry_button_pressed)

func _on_send_button_pressed():
	var text = user_input.text.strip_edges()
	if text == "": return
	
	add_chat_log("Player", text)
	user_input.text = ""
	user_input.editable = false
	send_button.disabled = true
	
	var data = {"player_input": text, "suspicion": 0}
	var headers = ["Content-Type: application/json"]
	http_request.request(SERVER_URL, headers, HTTPClient.METHOD_POST, JSON.stringify(data))

func _on_request_completed(result, response_code, _headers, body):
	if result == HTTPRequest.RESULT_SUCCESS and response_code == 200:
		var json = JSON.new()
		if json.parse(body.get_string_from_utf8()) == OK:
			var response_data = json.get_data()
			
			# 1. 대화 내용 가져오기
			var npc_reply = response_data.get("dialogue", "...")
			
			# ⭐ [추가됨] 2. 의심 수치 변화량 가져오기 (기본값 0)
			# JSON에 "suspicion_delta"가 있으면 가져오고, 없으면 0으로 처리
			var delta = response_data.get("suspicion_delta", 0)
			update_suspicion(delta) # 의심 업데이트 함수 실행
			
			# 3. 로그 출력
			add_chat_log("NPC", npc_reply)
	else:
		add_chat_log("System", "통신 오류 발생")
	
	# 입력 잠금 해제
	user_input.editable = true
	send_button.disabled = false
	user_input.grab_focus()

# ⭐ 업그레이드된 타자기 효과 함수
func add_chat_log(sender: String, message: String):
	var color = "white"
	if sender == "Player": color = "#569CD6"
	elif sender == "NPC": color = "#CE9178"
	elif sender == "System": color = "gray"
	
	# 1. 비밀번호 감지 (bluesky2024)
	if "bluesky2024" in message:
		# 해당 단어를 클릭 가능한 태그[url]로 감싸기
		message = message.replace("bluesky2024", '[url={"type":"password", "value":"bluesky2024"}]bluesky2024[/url]')
	
	# 2. 서버 감지 (대소문자 무시를 위해 간단히 처리)
	if "Server" in message or "서버" in message:
		# "서버"라는 단어가 나오면 무조건 Database Server 노드를 만드는 링크로 변환
		message = message.replace("Server", '[url={"type":"server", "value":"Database Server"}]Server[/url]')
		message = message.replace("서버", '[url={"type":"server", "value":"Database Server"}]서버[/url]')
	
	# 2. 텍스트 추가 (BBCode 적용)
	chat_output.append_text("\n[color=%s]%s:[/color] %s" % [color, sender, message])
	
	# 3. 타자기 연출 (visible_ratio 사용)
	# 현재 총 글자 수 저장
	var total_chars = chat_output.get_parsed_text().length()
	chat_output.visible_characters = total_chars - message.length() # 방금 추가한 글자만 숨김
	
	# 한 글자씩 보이게 하기
	for i in range(message.length() + 1):
		chat_output.visible_characters += 1
		await get_tree().create_timer(0.03).timeout
	
	# 다 치면 전체 다 보이기 (안전장치)
	chat_output.visible_ratio = 1.0

func _on_user_input_gui_input(event):
	if event is InputEventKey and event.pressed and event.keycode == KEY_ENTER:
		if not event.shift_pressed:
			get_viewport().set_input_as_handled()
			_on_send_button_pressed()

# ⭐ 링크 클릭 시 실행되는 함수
func _on_meta_clicked(meta):
	# meta에는 아까 [url={...}] 안에 넣은 JSON 데이터가 들어옵니다.
	var data = JSON.parse_string(meta)
	if data:
		print("단서 클릭됨! 종류: %s, 값: %s" % [data.type, data.value])
		
		# 전화선(Global)을 통해 전 세계(모든 윈도우)에 알립니다!
		Global.clue_found.emit(data.type, data.value)

func update_suspicion(delta):
	# 의심 수치 더하기
	current_suspicion += delta
	
	# 0 ~ 100 사이를 벗어나지 않게 고정 (clamp)
	current_suspicion = clamp(current_suspicion, 0, 100)
	
	# UI 게이지 업데이트
	if suspicion_bar:
		suspicion_bar.value = current_suspicion
		
	print("현재 의심도: ", current_suspicion, " (변화량: ", delta, ")")
	
	# 게임 오버 체크 (100 이상이면)
	if current_suspicion >= 100:
		game_over()

func game_over():
	# 1. 채팅 로그에 시스템 메시지 출력
	add_chat_log("System", "🚨 [CRITICAL] 보안 프로토콜 위반 감지. 접속을 차단합니다.")
	
	# 2. 조작 불능 상태 만들기
	user_input.editable = false
	send_button.disabled = true
	
	# 3. 빨간 화면 띄우기 (연극 시작!)
	game_over_overlay.visible = true
	
	# (선택 사항) 깜빡거리는 효과 등을 주면 더 멋집니다.

func _on_retry_button_pressed():
	# 현재 씬(Main)을 처음부터 다시 로딩 (완전 초기화)
	get_tree().reload_current_scene()
