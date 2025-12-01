extends Node
var server_pid = -1
# "단서 발견했어!" 라고 외치는 신호
# type: 단서 종류 (IP, Password, Name 등)
# value: 실제 값 (192.168.0.1, admin123 등)
@warning_ignore("unused_signal")
signal clue_found(type, value)

func _ready():
	# ⭐ 수정됨: "배포된 게임(standalone)"일 때만 서버를 자동으로 켭니다.
	# 에디터에서 개발 중일 때는 Python 서버를 따로 켜두시는 게 디버깅에 좋습니다.
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

func _notification(what):
	# 게임 종료 시 서버 프로세스도 같이 종료
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		if server_pid != -1:
			OS.kill(server_pid)
