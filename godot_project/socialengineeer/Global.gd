extends Node
var server_pid = 0
# "단서 발견했어!" 라고 외치는 신호
# type: 단서 종류 (IP, Password, Name 등)
# value: 실제 값 (192.168.0.1, admin123 등)
signal clue_found(type, value)
func _ready():
	# 게임 시작 시 서버 실행
	# (배포 시에는 main.exe 경로를 상대 경로로 지정해야 함)
	var output = []
	server_pid = OS.create_process(OS.get_executable_path().get_base_dir() + "/server/main.exe", [], false)

func _notification(what):
	# 게임 종료 시(WM_CLOSE_REQUEST) 서버도 같이 죽임
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		if server_pid > 0:
			OS.kill(server_pid)
