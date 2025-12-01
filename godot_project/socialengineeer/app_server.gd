extends PanelContainer


# === [창 이동 변수] ===
var dragging = false
var drag_start_position = Vector2()
@onready var title_bar = $Layout/TitleBar

# 정답 비밀번호 (서버에서 받아옴)
var target_password = ""
# 노드 경로
@onready var password_input = $Layout/ContentArea/LoginContainer/PasswordInput
@onready var login_button = $Layout/ContentArea/LoginContainer/LoginButton
@onready var login_container = $Layout/ContentArea/LoginContainer
@onready var secret_data = $Layout/ContentArea/SecretData

# 서버 통신을 위한 HTTPRequest 노드 (씬에 추가 필요)
@onready var http_request = $HTTPRequest 

func _ready():
	title_bar.gui_input.connect(_on_title_bar_gui_input)
	# UI 연결
	$Layout/TitleBar/CloseButton.pressed.connect(queue_free)
	login_button.pressed.connect(_on_login_button_pressed)
	password_input.text_submitted.connect(func(_text): _on_login_button_pressed())
	
	# 서버에 미션 정보 요청 (시나리오 ID: mission_1)
	# 씬에 HTTPRequest 노드가 있어야 오류가 나지 않습니다.
	if http_request:
		http_request.request_completed.connect(_on_mission_info_received)
		var error = http_request.request("http://127.0.0.1:8000/mission/" + Global.current_scenario)
		if error != OK:
			print("❌ 서버 요청 실패")
	else:
		print("❌ HTTPRequest 노드를 찾을 수 없습니다.")

func _on_mission_info_received(result, response_code, _headers, body):
	if result == HTTPRequest.RESULT_SUCCESS and response_code == 200:
		var json = JSON.new()
		var parse_err = json.parse(body.get_string_from_utf8())
		if parse_err == OK:
			var data = json.get_data()
			# 서버가 알려준 정답으로 설정
			target_password = data.get("target_password", "")
			print("🎯 미션 목표 동기화 완료: PW는 [", target_password, "] 입니다.")
		else:
			print("❌ JSON 파싱 실패")
	else:
		print("❌ 미션 정보 수신 실패 (서버가 켜져 있는지 확인하세요)")

func _on_login_button_pressed():
	var input_text = password_input.text.strip_edges()
	
	# 동기화된 정답과 비교
	# 정답이 비어있으면(로딩 전) 로그인을 막습니다.
	if target_password != "" and input_text == target_password:
		_show_success_screen()
	else:
		_show_fail_animation()

func _on_title_bar_gui_input(event):
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				dragging = true
				drag_start_position = get_global_mouse_position() - global_position
				move_to_front()
			else:
				dragging = false
	elif event is InputEventMouseMotion and dragging:
		global_position = get_global_mouse_position() - drag_start_position

func _show_success_screen():
	# 로그인 창 숨기고 기밀 문서 보여주기
	login_container.visible = false
	secret_data.visible = true
	
	# 동적으로 받아온 비밀번호를 포함해 텍스트 출력
	secret_data.text = """
	[color=green]✅ ACCESS GRANTED[/color]
	
	[b]PROJECT: SHADOW[/b]
	-------------------------
	일급 기밀 문서 접근 승인.
	
	대상: 김철수 부장
	탈취된 비밀번호: [b]%s[/b]
	
	내용: 
	법인 카드 불법 사용 내역 확보됨.
	2024-11-20: 강남 유흥주점 250만원
	2024-11-25: 백화점 상품권 100만원
	...
	(증거 확보 완료)
	""" % target_password

func _show_fail_animation():
	password_input.text = ""
	password_input.placeholder_text = "❌ 접속 거부됨"
