extends Control

# 1. 실행할 앱들을 미리 로드(Preload)해둡니다.
# (파일 경로가 다르면 본인의 경로에 맞춰 수정하세요!)
var app_messenger_scene = preload("res://app_messenger.tscn")
var app_board_scene = preload("res://app_board.tscn")
var app_server_scene = preload("res://app_server.tscn")
var app_email_scene = preload("res://app_email.tscn")

# 버튼 노드 경로 (TaskbarLayer 안에 있으니 경로 주의)
@onready var btn_messenger = $TaskbarLayer/Taskbar/AppContainer/Btn_Messenger
@onready var btn_board = $TaskbarLayer/Taskbar/AppContainer/Btn_Board
@onready var btn_server = $TaskbarLayer/Taskbar/AppContainer/Btn_Server
@onready var btn_email = $TaskbarLayer/Taskbar/AppContainer/Btn_Email

# 윈도우가 생성될 위치 (랜덤하게 흩뿌리기 위함)
var spawn_pos = Vector2(50, 50)

func _ready():
	# 각 버튼에 앱 실행 함수 연결
	# bind()를 사용하면 함수에 인자(앱 씬)를 같이 넘겨줄 수 있습니다.
	btn_messenger.pressed.connect(open_app.bind(app_messenger_scene))
	btn_board.pressed.connect(open_app.bind(app_board_scene))
	btn_server.pressed.connect(open_app.bind(app_server_scene))
	btn_email.pressed.connect(open_app.bind(app_email_scene))

# 앱을 여는 공통 함수
func open_app(app_scene: PackedScene):
	# 1. 씬 인스턴스화 (설계도에서 실체 만들기)
	var window = app_scene.instantiate()
	
	# 2. 데스크톱의 자식으로 추가 (화면에 나타남)
	add_child(window)
	
	# 3. 위치 설정 (겹치지 않게 약간씩 이동)
	# window가 Control 노드인지 확인 후 위치 조정
	if window is Control:
		window.position = spawn_pos
		spawn_pos += Vector2(30, 30) # 다음 창은 좀 더 아래 오른쪽에
		
		# 화면 밖으로나가면 다시 초기화
		if spawn_pos.x > 300 or spawn_pos.y > 300:
			spawn_pos = Vector2(50, 50)
