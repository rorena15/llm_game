extends Control

@onready var btn_mission_Tutorial = $ColorRect/Btn_Tutorial
@onready var btn_mission1 = $ColorRect/Btn_Mission1
@onready var btn_mission2 = $ColorRect/Btn_Mission2
@onready var btn_quit = $ColorRect/Btn_Quit
@onready var http_request = $HTTPRequest # 씬에 추가 필요!

# 게임 화면 씬 미리 로드
var desktop_scene = preload("res://desktop.tscn")

func _ready():
	#미션 1 버튼 클릭시 호출
	btn_mission1.pressed.connect(_on_mission_1_pressed)
	#미션 2 버튼 클릭시 호출
	btn_mission2.pressed.connect(_on_mission_2_pressed)
	btn_mission_Tutorial.pressed.connect(_on_mission_Tutorial_pressed)
	btn_quit.pressed.connect(get_tree().quit)
	_update_buttons()

func _update_buttons():
	# 1. 일단 튜토리얼은 항상 열어둠
	btn_mission_Tutorial.disabled = false
	
	# 2. 미션은 기본적으로 잠금 (미션을 하나씩 클리어하면 잠금 해제)
	btn_mission1.disabled = true
	btn_mission1.text = "🔒 Mission 1 (잠김)" # 잠금 표시 텍스트 변경
	btn_mission2.text = "🔒 Mission 2 (잠김)"
	
	# 3. 튜토리얼 클리어 여부 확인
	if "mission_Tutorial" in Global.cleared_missions:
		btn_mission1.disabled = false
		btn_mission1.text = "Mission 1: 그림자 인사" # 원래 텍스트 복구
		
	# (나중에 Mission 2를 추가한다면 아래와 같이 작성)
	if "mission_1" in Global.cleared_missions:
		btn_mission2.disabled = false
		btn_mission2.text = "Mission 2: SNS의 비밀"
	
func _on_mission_Tutorial_pressed():
	print("🚀 튜토리얼 시작 요청...")
	# 2. 게임 화면으로 전환
	_start_game("mission_Tutorial")
	
func _on_mission_1_pressed():
	print("🚀 미션 1 시작 요청...")
	# 2. 게임 화면으로 전환
	_start_game("mission_1")
	
func _on_mission_2_pressed():
	print("🚀 미션 2 시작 요청...")
	# 2. 게임 화면으로 전환
	_start_game("mission_2")
	
func _start_game(scenario_id):
	# Global에 현재 시나리오 저장 (나중에 앱들이 이걸 참조)
	Global.current_scenario = scenario_id
	# 씬 전환
	get_tree().change_scene_to_packed(desktop_scene)
