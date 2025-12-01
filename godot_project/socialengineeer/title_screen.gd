extends Control

@onready var btn_mission1 = $ColorRect/Btn_Mission1
@onready var btn_mission_Tutorial = $ColorRect/Btn_Tutorial
@onready var btn_quit = $ColorRect/Btn_Quit
@onready var http_request = $HTTPRequest # 씬에 추가 필요!

# 게임 화면 씬 미리 로드
var desktop_scene = preload("res://desktop.tscn")

func _ready():
	btn_mission1.pressed.connect(_on_mission_1_pressed)
	btn_mission_Tutorial.pressed.connect(_on_mission_Tutorial_pressed)
	btn_quit.pressed.connect(get_tree().quit)

func _on_mission_Tutorial_pressed():
	print("🚀 튜토리얼 시작 요청...")
	# 2. 게임 화면으로 전환
	_start_game("mission_Tutorial")
	
func _on_mission_1_pressed():
	print("🚀 미션 1 시작 요청...")
	# 2. 게임 화면으로 전환
	_start_game("mission_1")

func _start_game(scenario_id):
	# Global에 현재 시나리오 저장 (나중에 앱들이 이걸 참조)
	Global.current_scenario = scenario_id
	# 씬 전환
	get_tree().change_scene_to_packed(desktop_scene)
