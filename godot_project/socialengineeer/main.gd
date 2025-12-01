extends Control

@onready var game_over_overlay = $GameOverOverlay
@onready var retry_button = $GameOverOverlay/RetryButton
@onready var suspicion_bar = $SuspicionBar
@onready var http_request = $ServerRequest
@onready var chat_output = $VBoxContainer/ChatOutput
@onready var user_input = $VBoxContainer/UserInput
@onready var send_button = $VBoxContainer/SendButton

const SERVER_URL = "http://127.0.0.1:8000/chat"

var current_suspicion = 0
# ⭐ 핵심: 서버에서 받아올 비밀번호를 저장할 변수 (비어있음)
var target_password = ""

func _ready():
	send_button.pressed.connect(_on_send_button_pressed)
	http_request.request_completed.connect(_on_request_completed)
	user_input.gui_input.connect(_on_user_input_gui_input)
	chat_output.meta_clicked.connect(_on_meta_clicked)
	retry_button.pressed.connect(_on_retry_button_pressed)
	
	#add_chat_log("System", "서버 로그인 완료.")
	
	# ⭐ 1. 게임 시작 시 서버에 미션 정보(정답) 요청
	# 기존 채팅용 HTTPRequest 노드를 재사용합니다.
	var mission_url = "http://127.0.0.1:8000/mission/" + Global.current_scenario
	print("📡 미션 정보 요청: ", mission_url)
	http_request.request(mission_url)

func _on_send_button_pressed():
	var text = user_input.text.strip_edges()
	if text == "": return
	
	add_chat_log("Player", text)
	user_input.text = ""
	user_input.editable = false
	send_button.disabled = true
	
	# ⭐ 시나리오 ID도 명시적으로 보냄 (확장성 고려)
	var data = {
		"player_input": text, 
		"suspicion": 0,
		"scenario_id": Global.current_scenario
	}
	var headers = ["Content-Type: application/json"]
	http_request.request(SERVER_URL, headers, HTTPClient.METHOD_POST, JSON.stringify(data))

func _on_request_completed(result, response_code, _headers, body):
	if result == HTTPRequest.RESULT_SUCCESS and response_code == 200:
		var json = JSON.new()
		if json.parse(body.get_string_from_utf8()) == OK:
			var response_data = json.get_data()
			
			# ⭐ 2. 응답 종류 구분하기
			
			# [경우 A] 미션 정보가 도착한 경우 (target_password 키가 있음)
			if response_data.has("target_password"):
				target_password = response_data["target_password"]
				print("✅ [Main] 비밀번호 동기화 완료: ", target_password)
				return # 채팅 처리는 하지 않고 종료
			
			# [경우 B] 채팅 응답이 도착한 경우 (dialogue 키가 있음)
			if response_data.has("dialogue"):
				var npc_reply = response_data.get("dialogue", "...")
				var delta = response_data.get("suspicion_delta", 0)
				update_suspicion(delta)
				add_chat_log("NPC", npc_reply)
				
				# 입력 잠금 해제 (채팅일 때만 해제)
				user_input.editable = true
				send_button.disabled = false
				user_input.grab_focus()
				return

	else:
		add_chat_log("System", "통신 오류 발생")
		# 오류 시에도 입력은 풀어줘야 함
		user_input.editable = true
		send_button.disabled = false

func add_chat_log(sender: String, message: String):
	var color = "white"
	if sender == "Player": color = "#569CD6"
	elif sender == "NPC": color = "#CE9178"
	elif sender == "System": color = "gray"
	# === ⭐ [수정됨] 힌트 자동 링크 걸기 ===
	# 1. 정답(비밀번호) 감지
	if target_password != "" and target_password in message:
		message = _make_link(message, target_password, "password")
	# 2. 튜토리얼용 사원번호 (2024001) 감지
	if "2024001" in message:
		message = _make_link(message, "2024001", "id")
	# 3. 튜토리얼용 연도 (2024) 감지
	if "2024" in message:
		message = _make_link(message, "2024", "hint")
	# 4. 서버 감지
	if "Server" in message or "서버" in message:
		message = message.replace("Server", '[url={"type":"server", "value":"Database Server"}]Server[/url]')
		message = message.replace("서버", '[url={"type":"server", "value":"Database Server"}]서버[/url]')
	
	chat_output.append_text("\n[color=%s]%s:[/color] %s" % [color, sender, message])
	
	# 타자기 연출
	var total_chars = chat_output.get_parsed_text().length()
	chat_output.visible_characters = total_chars - message.length()
	
	for i in range(message.length() + 1):
		chat_output.visible_characters += 1
		await get_tree().create_timer(0.03).timeout
	
	chat_output.visible_ratio = 1.0

func _make_link(text, keyword, type):
	var bbcode = '[url={"type":"%s", "value":"%s"}]%s[/url]' % [type, keyword, keyword]
	return text.replace(keyword, bbcode)

func _on_user_input_gui_input(event):
	if event is InputEventKey and event.pressed and event.keycode == KEY_ENTER:
		if not event.shift_pressed:
			get_viewport().set_input_as_handled()
			_on_send_button_pressed()

func _on_meta_clicked(meta):
	var data = JSON.parse_string(meta)
	if data:
		print("단서 클릭됨! 종류: %s, 값: %s" % [data.type, data.value])
		Global.clue_found.emit(data.type, data.value)

func update_suspicion(delta):
	current_suspicion += delta
	current_suspicion = clamp(current_suspicion, 0, 100)
	
	if suspicion_bar:
			var tween = create_tween()
			tween.tween_property(suspicion_bar, "value", current_suspicion, 0.5).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
		
	print("현재 의심도: ", current_suspicion, " (변화량: ", delta, ")")
	
	if current_suspicion >= 100:
		game_over()

func game_over():
	add_chat_log("System", "🚨 [CRITICAL] 보안 프로토콜 위반 감지. 접속을 차단합니다.")
	user_input.editable = false
	send_button.disabled = true
	game_over_overlay.visible = true

func _on_retry_button_pressed():
	get_tree().reload_current_scene()
