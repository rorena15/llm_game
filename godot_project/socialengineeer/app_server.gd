extends PanelContainer

# 정답 비밀번호 (나중에는 Global 변수나 시나리오에서 받아올 수도 있음)
const TARGET_PASSWORD = "bluesky2024"

@onready var password_input = $Layout/ContentArea/LoginContainer/PasswordInput
@onready var login_button = $Layout/ContentArea/LoginContainer/LoginButton
@onready var login_container = $Layout/ContentArea/LoginContainer
@onready var secret_data = $Layout/ContentArea/SecretData

func _ready():
	# 닫기 버튼
	$Layout/TitleBar/CloseButton.pressed.connect(queue_free)
	
	# 로그인 버튼 연결
	login_button.pressed.connect(_on_login_button_pressed)
	
	# 엔터키 연결 (UX 편의성)
	password_input.text_submitted.connect(func(text): _on_login_button_pressed())

func _on_login_button_pressed():
	var input_text = password_input.text.strip_edges()
	
	if input_text == TARGET_PASSWORD:
		_show_success_screen()
	else:
		_show_fail_animation()

func _show_success_screen():
	# 로그인 창 숨기고 기밀 문서 보여주기
	login_container.visible = false
	secret_data.visible = true
	
	# 멋진 해커 텍스트 출력
	secret_data.text = """
	[color=green]✅ ACCESS GRANTED[/color]
	
	[b]PROJECT: SHADOW[/b]
	-------------------------
	일급 기밀 문서 접근 승인.
	
	대상: 김철수
	내용: 법인 카드 불법 사용 내역 확보됨.
	...
	(다음 미션 암시 내용)
	"""

func _show_fail_animation():
	password_input.text = ""
	password_input.placeholder_text = "❌ 접속 거부됨 (다시 시도)"
	# 여기에 '화면 흔들림'이나 '빨간색 깜빡임' 효과를 넣으면 더 좋습니다.
