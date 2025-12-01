extends Control

@onready var http_request = $ServerRequest
@onready var chat_output = $VBoxContainer/ChatOutput
@onready var user_input = $VBoxContainer/UserInput
@onready var send_button = $VBoxContainer/SendButton

const SERVER_URL = "http://127.0.0.1:8000/chat"

func _ready():
	send_button.pressed.connect(_on_send_button_pressed)
	http_request.request_completed.connect(_on_request_completed)
	user_input.gui_input.connect(_on_user_input_gui_input)
	
	# ⭐ 핵심: 링크(BBCode URL) 클릭 신호 연결
	chat_output.meta_clicked.connect(_on_meta_clicked)
	
	add_chat_log("System", "서버 연결 준비 완료. 메시지를 입력하세요.")

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
			var npc_reply = json.get_data().get("dialogue", "...")
			add_chat_log("NPC", npc_reply)
	else:
		add_chat_log("System", "통신 오류 발생")
	
	# 입력 잠금 해제 (이제 여기서 풀어줍니다)
	user_input.editable = true
	send_button.disabled = false
	user_input.grab_focus()

# ⭐ 업그레이드된 타자기 효과 함수
func add_chat_log(sender: String, message: String):
	var color = "white"
	if sender == "Player": color = "#569CD6"
	elif sender == "NPC": color = "#CE9178"
	elif sender == "System": color = "gray"
	
	# 1. 키워드 자동 감지 및 링크 걸기 (간단한 버전)
	# "admin123"이나 "Server" 같은 단어가 있으면 클릭 가능한 태그[url]로 감쌉니다.
	# 형식: [url={"type":"종류", "value":"값"}]화면에보일글자[/url]
	if "admin123" in message:
		message = message.replace("admin123", '[url={"type":"password", "value":"admin123"}]admin123[/url]')
	
	if "Server" in message: # 예시: 서버라는 단어도 클릭 가능하게
		message = message.replace("Server", '[url={"type":"server", "value":"Database Server"}]Server[/url]')
	
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
