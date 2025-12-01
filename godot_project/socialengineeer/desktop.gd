extends Control

# 앱 씬 미리 로드
var app_messenger_scene = preload("res://app_messenger.tscn")
var app_board_scene = preload("res://app_board.tscn")
var app_server_scene = preload("res://app_server.tscn")
var app_email_scene = preload("res://app_email.tscn")

# 태스크바 버튼
@onready var btn_messenger = $TaskbarLayer/Taskbar/AppContainer/Btn_Messenger
@onready var btn_board = $TaskbarLayer/Taskbar/AppContainer/Btn_Board
@onready var btn_server = $TaskbarLayer/Taskbar/AppContainer/Btn_Server
@onready var btn_email = $TaskbarLayer/Taskbar/AppContainer/Btn_Email

# 브리핑 UI 노드
@onready var briefing_layer = $BriefingLayer
@onready var title_label = $BriefingLayer/BriefingPopup/VBoxContainer/TitleLabel
@onready var desc_label = $BriefingLayer/BriefingPopup/VBoxContainer/DescLabel
@onready var start_button = $BriefingLayer/BriefingPopup/VBoxContainer/StartButton

# 윈도우 생성 위치
var spawn_pos = Vector2(50, 50)

# 시나리오별 브리핑 데이터 (튜토리얼 포함)
var mission_data = {
	"tutorial": {
		"title": "TUTORIAL: 신입 사원 교육",
		"desc": """
		[center]
		신입 해커님, 환영합니다.
		첫 번째 임무는 간단한 [OSINT 훈련]입니다.
		
		타겟: 신입 사원 '이민수'
		목표: [비밀번호]를 알아내어 접속하기.
		
		1. [이메일]을 확인해 힌트를 얻으세요.
		2. [메신저]로 친절하게 말을 거세요.
		3. 정보를 [수사보드]에 연결하세요.
		[/center]
		"""
	},
	"mission_1": {
		"title": "MISSION 01: 그림자 인사 (Shadow HR)",
		"desc": """
		[center]
		타겟: 인사팀 '김철수 부장'
		난이도: ★☆☆☆☆
		
		목표: 사내망 접속 권한 탈취
		
		특이사항:
		- 기계치이며 권위적임.
		- '급하다'고 재촉하거나 아부하면 약함.
		[/center]
		"""
	}
}

func _ready():
	# 버튼 연결
	btn_messenger.pressed.connect(open_app.bind(app_messenger_scene))
	btn_board.pressed.connect(open_app.bind(app_board_scene))
	btn_server.pressed.connect(open_app.bind(app_server_scene))
	btn_email.pressed.connect(open_app.bind(app_email_scene))
	
	start_button.pressed.connect(_on_start_button_pressed)
	
	# 게임 시작 시 브리핑 설정
	setup_briefing()

func setup_briefing():
	# 1. Global 변수에서 현재 시나리오 ID 가져오기
	var current_id = Global.current_scenario
	if current_id == "": current_id = "tutorial"
	
	print("📂 현재 시나리오 로딩: ", current_id)
	
	# 2. 데이터 사전에서 텍스트 꺼내기
	var data = mission_data.get(current_id, mission_data["tutorial"])
	
	# 3. UI 업데이트 (노드가 존재할 때만)
	if title_label: title_label.text = data["title"]
	if desc_label: desc_label.text = data["desc"]
	
	# 4. 화면 띄우기 및 일시정지
	briefing_layer.visible = true
	
	# ⭐ [핵심 수정] 브리핑 레이어는 일시정지 상태에서도 멈추지 않게 설정
	# 이 설정이 없으면 버튼이 눌리지 않습니다.
	briefing_layer.process_mode = Node.PROCESS_MODE_ALWAYS
	
	# 게임 세계 멈춤
	get_tree().paused = true

func _on_start_button_pressed():
	# 팝업 숨기고 게임 재개
	briefing_layer.visible = false
	get_tree().paused = false

# 앱을 여는 공통 함수
func open_app(app_scene: PackedScene):
	var window = app_scene.instantiate()
	add_child(window)
	if window is Control:
		# 화면 중앙 랜덤 배치
		var screen_size = get_viewport_rect().size
		var center = screen_size / 2
		var offset = Vector2(randf_range(-30, 30), randf_range(-30, 30))
		window.position = (center - window.size / 2) + offset
