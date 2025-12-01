extends Control

@onready var btn_mission1 = $VBoxContainer/Btn_Mission1
@onready var btn_quit = $VBoxContainer/Btn_Quit
@onready var http_request = $HTTPRequest # 씬에 추가 필요!

# 게임 화면 씬 미리 로드
var desktop_scene = preload("res://Desktop.tscn")

func _ready():
	btn_mission1.pressed.connect(_on_mission_1_pressed)
	btn_quit.pressed.connect(get_tree().quit)

func _on_mission_1_pressed():
	print("🚀 미션 1 시작 요청...")
	# 1. 서버에 "이번 판은 mission_1 이야"라고 알림 (선택 사항이지만 추천)
	# (이건 나중에 Global 변수나 서버 API로 처리하면 됩니다.)
	
	# 2. 게임 화면으로 전환
	_start_game("mission_1")

func _start_game(scenario_id):
	# Global에 현재 시나리오 저장 (나중에 앱들이 이걸 참조)
	Global.current_scenario = scenario_id 
	
	# 씬 전환
	get_tree().change_scene_to_packed(desktop_scene)
