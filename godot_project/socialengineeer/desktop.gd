extends Control

# 브라우저 변수
var app_browser_scene = preload("res://app_browser.tscn")
# 승리 화면 UI 경로
@onready var victory_layer = $VictoryLayer
@onready var btn_return = $VictoryLayer/ColorRect/VBoxContainer/Btn_Return

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
#태스크바의 브라우저 버튼 (에디터에서 노드 할당 필요)
@onready var btn_browser = $TaskbarLayer/Taskbar/AppContainer/Btn_Browser
# 브리핑 UI 노드
@onready var briefing_layer = $BriefingLayer
@onready var title_label = $BriefingLayer/BriefingPopup/VBoxContainer/TitleLabel
@onready var desc_label = $BriefingLayer/BriefingPopup/VBoxContainer/DescLabel
@onready var start_button = $BriefingLayer/BriefingPopup/VBoxContainer/StartButton
@onready var http_request = $HTTPRequest

# 윈도우 생성 위치
var spawn_pos = Vector2(50, 50)

func _ready():
	# 버튼 연결
	btn_messenger.pressed.connect(open_app.bind(app_messenger_scene))
	btn_board.pressed.connect(open_app.bind(app_board_scene))
	btn_server.pressed.connect(open_app.bind(app_server_scene))
	btn_email.pressed.connect(open_app.bind(app_email_scene))
	start_button.pressed.connect(_on_start_button_pressed)
	Global.mission_success.connect(_on_mission_success)
	btn_return.pressed.connect(_on_return_pressed)
	if http_request:
		http_request.process_mode = Node.PROCESS_MODE_ALWAYS
	# 게임 시작 시 브리핑 설정
	victory_layer.visible = false
	setup_briefing()
	if btn_browser:
		btn_browser.pressed.connect(open_app.bind(app_browser_scene))

func setup_briefing():
	# 1. 일시정지 먼저 걸기 (데이터 로딩 중 플레이 방지)
	briefing_layer.visible = true
	briefing_layer.process_mode = Node.PROCESS_MODE_ALWAYS
	get_tree().paused = true
	
	# 로딩 중 메시지 표시
	title_label.text = "Loading..."
	desc_label.text = "본부에서 작전 데이터를 수신 중입니다..."
	start_button.disabled = true
	
	# 2. 서버에 미션 정보 요청
	var current_id = Global.current_scenario
	if current_id == "": current_id = "mission_Tutorial"
	
	print("📂 시나리오 데이터 요청: ", current_id)
	
	if http_request:
		http_request.request_completed.connect(_on_briefing_received)
		http_request.request("http://127.0.0.1:8000/mission/" + current_id)
	else:
		print("❌ HTTPRequest 노드가 없습니다!")

func _on_briefing_received(result, response_code, _headers, body):
	var dots = [".", "..", "...", ".", ".."]
	for dot in dots:
		if title_label:
			title_label.text = "Loading" + dot
		await get_tree().create_timer(0.8).timeout
	
	if result == HTTPRequest.RESULT_SUCCESS and response_code == 200:
		var json = JSON.new()
		if json.parse(body.get_string_from_utf8()) == OK:
			var data = json.get_data()
			
			#받아온 전체 데이터를 전역 변수에 저장
			Global.mission_data = data
			
			# ⭐ 서버 데이터로 UI 업데이트
			title_label.text = data.get("title", "제목 없음")
			desc_label.text = data.get("briefing", "내용 없음")
			
			# 로딩 완료 후 시작 버튼 활성화
			start_button.disabled = false
			print("✅ 브리핑 데이터 수신 완료")
		else:
			desc_label.text = "데이터 파싱 실패"
	else:
		desc_label.text = "서버 연결 실패. (Python 서버를 확인하세요)"

func _on_start_button_pressed():
	# 팝업 숨기고 게임 재개
	briefing_layer.visible = false
	get_tree().paused = false
	
	# 미션 2일 경우만 브라우저 버튼 활성화
	var current_id = Global.current_scenario
	if current_id != "mission_2" :
		btn_browser.visible = false

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

func _on_mission_success(mission_id):
	print("🏆 미션 성공: ", mission_id)
	
	# 1. 1초 뒤에 승리 화면 띄우기 (여운을 주기 위해)
	await get_tree().create_timer(1.0).timeout
	
	victory_layer.visible = true
	victory_layer.process_mode = Node.PROCESS_MODE_ALWAYS # 멈춰도 작동하게
	
	# 2. 축하 효과음 재생 (선택 사항)
	# $VictorySound.play() 
	
	# 3. 게임 멈춤
	get_tree().paused = true

func _on_return_pressed():
	# 메인 화면으로 돌아가기 (씬 다시 로드 또는 타이틀로 이동)
	get_tree().paused = false
	# 타이틀 화면 씬 경로가 맞는지 확인하세요!
	get_tree().change_scene_to_file("res://title_screen.tscn")
