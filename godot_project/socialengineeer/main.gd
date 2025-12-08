extends Control

@onready var game_over_overlay = $GameOverOverlay
@onready var retry_button = $GameOverOverlay/RetryButton
@onready var suspicion_bar = $SuspicionBar
@onready var http_request = $ServerRequest
@onready var chat_output = $VBoxContainer/ChatOutput
@onready var user_input = $VBoxContainer/UserInput
@onready var send_button = $VBoxContainer/SendButton
@onready var bg_rect = get_node_or_null("/root/Desktop/ScreenEffects/AlertOverlay")
const SERVER_URL = "http://127.0.0.1:8000/chat"

# 의심도 0으로 초기 선언
var current_suspicion = 0

# ⭐ 핵심: 서버에서 받아올 비밀번호를 저장할 변수 (비어있음)
var target_password = ""

#경고 상태 추적
var is_alarm_mode = false

# Desktop 씬의 배경 경로


func _ready():
	send_button.pressed.connect(_on_send_button_pressed)
	http_request.request_completed.connect(_on_request_completed)
	user_input.gui_input.connect(_on_user_input_gui_input)
	chat_output.meta_clicked.connect(_on_meta_clicked)
	retry_button.pressed.connect(_on_retry_button_pressed)
	
	# 1. 게임 시작 시 서버에 미션 정보(정답) 요청
	var mission_url = "http://127.0.0.1:8000/mission/" + Global.current_scenario
	print("📡 미션 정보 요청: ", mission_url)
	http_request.request(mission_url)

func _on_send_button_pressed():
	var text = user_input.text.strip_edges()
	if text == "": return
	
	add_chat_log(Global.player_name, text)
	user_input.text = ""
	user_input.editable = false
	send_button.disabled = true
	
	# 시나리오 ID도 명시적으로 보냄 (확장성 고려)
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
			# 2. 응답 종류 구분하기
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
				add_chat_log(Global.npc_name, npc_reply)
				
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
	if sender == Global.player_name: color = "#569CD6" # [cite: 52]3
	elif sender == Global.npc_name: color = "#CE9178"
	elif sender == "System": color = "gray"
	
	# 1. 치환할 키워드 정의 (순서 중요하지 않음, 아래에서 정렬함)
	var replacements = []
	if target_password != "": replacements.append([target_password, "password"])
	
	# 시나리오별 특수 키워드 추가
	replacements.append(["2024001", "id"])
	replacements.append(["2024", "hint"]) 
	replacements.append(["12024CorpX", "password"]) # 튜토리얼 비번
	replacements.append(["Server", "server"])
	replacements.append(["서버", "server"])

	# ⭐ [핵심 1] 긴 단어부터 먼저 처리하도록 정렬 (길이 내림차순)
	replacements.sort_custom(func(a, b): return a[0].length() > b[0].length())

	# 2. 임시 마커로 치환 (중복 방지)
	var markers = {}
	var index = 0
	
	for item in replacements:
		var keyword = item[0]
		var type = item[1]
		
		if keyword in message:
			# 최종적으로 보여줄 BBCode 미리 생성
			var bbcode = '[url={"type":"%s", "value":"%s"}]%s[/url]' % [type, keyword, keyword]
			var marker = "★LINK_%d★" % index # 절대 겹치지 않을 특수 문자 사용
			
			# 메시지 내의 키워드를 마커로 변경
			message = message.replace(keyword, marker)
			markers[marker] = bbcode
			index += 1
	
	# 3. 마커를 다시 BBCode로 복원
	for marker in markers:
		message = message.replace(marker, markers[marker])

	# 4. 출력 및 타자기 효과
	var prev_char_count = chat_output.get_parsed_text().length()
	chat_output.append_text("\n[color=%s]%s:[/color] %s" % [color, sender, message])
	
	if sender != Global.player_name and sender != "System":
		AudioManager.play_alert()
		
	var total_char_count = chat_output.get_parsed_text().length()
	chat_output.visible_characters = prev_char_count
	
	while chat_output.visible_characters < total_char_count:
		chat_output.visible_characters += 1
		if chat_output.visible_characters % 2 == 0:
			AudioManager.play_typing()
		chat_output.scroll_to_line(chat_output.get_line_count() - 1)
		await get_tree().create_timer(0.03).timeout # 타자 속도
		
	AudioManager.stop_typing()
		
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
	
	# 1. 의심도가 올랐을 때 화면 흔들기 (Screen Shake)
	if delta > 0:
		_trigger_screen_shake()
		# 의심도가 오르는 소리 (실패음 활용)
		AudioManager.play_result(false) 
	
	# 2. 80% 이상이면 경고 모드 발동 (Red Alert)
	if current_suspicion >= 80 and not is_alarm_mode:
		_set_alarm_mode(true)
	elif current_suspicion < 80 and is_alarm_mode:
		_set_alarm_mode(false)
		
	# 3. 게임 오버 체크
	if current_suspicion >= 100:
		game_over()

func game_over():
	add_chat_log("System", "🚨 [CRITICAL] 보안 프로토콜 위반 감지. 접속을 차단합니다.")
	user_input.editable = false
	send_button.disabled = true
	Global.game_over_triggered.emit()

func _on_retry_button_pressed():
	get_tree().reload_current_scene()

func _set_alarm_mode(on: bool):
	is_alarm_mode = on
	if on:
		print("🚨 경고: 보안 프로토콜 위반 임박!")
		# 배경음악을 끄고 경고음 재생
		AudioManager.play_alert()
		
		# 붉은 점멸 효과 (Tween Loop)
		if bg_rect:
			var tween = create_tween().set_loops()
			tween.tween_property(bg_rect, "modulate", Color(1, 0.5, 0.5), 0.5) # 붉게
			tween.tween_property(bg_rect, "modulate", Color(1, 1, 1), 0.5) # 원래대로
	else:
		print("✅ 경고 해제")
		if bg_rect:
			bg_rect.modulate = Color(1, 1, 1) # 색상 초기화
			# 실행 중인 모든 Tween 중단이 필요할 수 있음 (간단히는 modulate 강제 복구)

func _trigger_screen_shake():
	# 윈도우 창 전체를 흔드는 연출
	var original_pos = position
	var tween = create_tween()
	
	for i in range(5):
		var offset = Vector2(randf_range(-5, 5), randf_range(-5, 5))
		tween.tween_property(self, "position", original_pos + offset, 0.05)
	
	tween.tween_property(self, "position", original_pos, 0.05)
