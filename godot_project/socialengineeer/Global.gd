extends Node
var current_scenario = "mission_Tutorial"
var server_pid = -1
@warning_ignore("unused_signal")
signal clue_found(type, value)

@warning_ignore("unused_signal")
signal mission_success(mission_id)

var mission_data = {}

#클리어한 미션 ID를 저장할 배열
var cleared_missions: Array = []

func _ready():
	mission_success.connect(_on_mission_success)
	if OS.has_feature("standalone"):
		_start_server()
	else:
		print("⚠️ [개발 모드] 서버 자동 실행 건너뜀. 터미널에서 'python main.py'를 실행하세요.")

func _start_server():
	# 배포 시, 게임 exe 옆에 있는 server 폴더 안의 main.exe를 찾습니다.
	var exe_path = OS.get_executable_path().get_base_dir() + "/server/main.exe"
	print("🚀 서버 자동 실행 시도: ", exe_path)
	
	# 서버 실행 (콘솔 창 숨기기 옵션 등은 배포 시 결정)
	server_pid = OS.create_process(exe_path, [], false)

func _on_mission_success(mission_id):
	if not mission_id in cleared_missions:
		cleared_missions.append(mission_id)
		print("🎉 미션 클리어 기록됨: ", mission_id)
		print("현재 완료 목록: ", cleared_missions)
		
func _notification(what):
	# 게임 종료 시 서버 프로세스도 같이 종료
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		if server_pid != -1:
			OS.kill(server_pid)
