extends Node

# [설정] 리소스 경로 (나중에 실제 파일 경로로 수정 필요)
# 소리가 없어도 에러가 나지 않도록 null 체크를 포함했습니다.
var sfx_typing = preload("res://assets/sfx/keyboard_tap.wav") if FileAccess.file_exists("res://assets/sfx/KeyBoard_typing.mp3") else null
var sfx_alert = preload("res://assets/sfx/notification.wav") if FileAccess.file_exists("res://assets/sfx/notification.mp3") else null
var sfx_success = preload("res://assets/sfx/access_granted.wav") if FileAccess.file_exists("res://assets/sfx/access_granted.mp3") else null
var sfx_fail = preload("res://assets/sfx/error_buzz.wav") if FileAccess.file_exists("res://assets/sfx/error.mp3") else null

# 오디오 플레이어 노드들
var typing_player: AudioStreamPlayer
var sfx_player: AudioStreamPlayer

func _ready():
	# 플레이어 동적 생성 (씬에 일일이 추가할 필요 없음)
	typing_player = AudioStreamPlayer.new()
	typing_player.max_polyphony = 3 # 빠른 타자 소리가 겹쳐서 들리게
	add_child(typing_player)
	
	sfx_player = AudioStreamPlayer.new()
	add_child(sfx_player)

# 1. 타자 소리 (피치 변조로 자연스럽게)
func play_typing():
	if sfx_typing:
		typing_player.stream = sfx_typing
		# 소리 높낮이를 0.9 ~ 1.1 사이로 랜덤 조절하여 기계적인 느낌 제거
		typing_player.pitch_scale = randf_range(0.9, 1.1)
		typing_player.play()

# 2. 알림음
func play_alert():
	if sfx_alert:
		sfx_player.stream = sfx_alert
		sfx_player.pitch_scale = 1.0
		sfx_player.play()

# 3. 결과음 (성공/실패)
func play_result(is_success: bool):
	if is_success and sfx_success:
		sfx_player.stream = sfx_success
		sfx_player.play()
	elif not is_success and sfx_fail:
		sfx_player.stream = sfx_fail
		sfx_player.play()
