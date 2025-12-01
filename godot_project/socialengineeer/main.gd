extends Control

# 노드 가져오기 (이름이 틀리면 오류가 납니다!)
@onready var http_request = $ServerRequest
@onready var chat_output = $VBoxContainer/ChatOutput
@onready var user_input = $VBoxContainer/UserInput
@onready var send_button = $VBoxContainer/SendButton

# 내 컴퓨터의 Python 서버 주소
const SERVER_URL = "http://127.0.0.1:8000/chat"

func _ready():
	# 버튼이 눌렸을 때 실행할 함수 연결
	send_button.pressed.connect(_on_send_button_pressed)
	# 서버 응답이 왔을 때 실행할 함수 연결
	http_request.request_completed.connect(_on_request_completed)
	
	add_chat_log("System", "서버 연결 준비 완료. 메시지를 입력하세요.")

func _on_send_button_pressed():
	var text = user_input.text.strip_edges()
	if text == "":
		return

	# 1. 내가 쓴 글 화면에 표시
	add_chat_log("Player", text)
	user_input.text = "" # 입력창 비우기
	user_input.editable = false # 잠시 입력 막기
	send_button.disabled = true

	# 2. 서버로 보낼 편지(데이터) 포장하기
	var data = {
		"player_input": text,
		"suspicion": 0
	}
	var json_string = JSON.stringify(data)
	var headers = ["Content-Type: application/json"]

	# 3. 우체통(HTTP)에 편지 넣기
	var error = http_request.request(SERVER_URL, headers, HTTPClient.METHOD_POST, json_string)
	if error != OK:
		add_chat_log("System", "오류: 요청 전송 실패")
		_reset_input_state()

func _on_request_completed(result, response_code, headers, body):
	# 4. 답장 도착!
	_reset_input_state()
	
	if result != HTTPRequest.RESULT_SUCCESS:
		add_chat_log("System", "통신 오류 발생!")
		return

	if response_code == 200:
		var json = JSON.new()
		var parse_result = json.parse(body.get_string_from_utf8())
		
		if parse_result == OK:
			var response_data = json.get_data()
			# 서버가 준 JSON에서 "dialogue" 꺼내기
			var npc_reply = response_data.get("dialogue", "...")
			add_chat_log("NPC", npc_reply)
		else:
			add_chat_log("System", "데이터 해석 실패")
	else:
		add_chat_log("System", "서버 오류: 코드 " + str(response_code))

func add_chat_log(sender: String, message: String):
	# 채팅창에 글자 띄우기 (색깔 넣기)
	var color = "white"
	if sender == "Player": color = "#569CD6" # 파란색
	elif sender == "NPC": color = "#CE9178" # 주황색
	elif sender == "System": color = "gray"
	
	chat_output.append_text("[color=%s]%s:[/color] %s\n" % [color, sender, message])

func _reset_input_state():
	user_input.editable = true
	send_button.disabled = false
	user_input.grab_focus()
