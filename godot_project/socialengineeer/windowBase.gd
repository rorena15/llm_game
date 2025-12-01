extends PanelContainer

# 창을 드래그 중인지 확인하는 변수
var dragging = false
var drag_start_position = Vector2()

@onready var title_bar = $Layout/TitleBar
@onready var close_button = $Layout/TitleBar/CloseButton

func _ready():
	# 닫기 버튼 연결
	close_button.pressed.connect(_on_close_button_pressed)
	
	# 제목 표시줄(TitleBar)의 마우스 입력을 감지하도록 설정
	title_bar.gui_input.connect(_on_title_bar_gui_input)

func _on_title_bar_gui_input(event):
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				# 클릭 시작: 드래그 모드 ON
				dragging = true
				drag_start_position = get_global_mouse_position() - global_position
				move_to_front() # 클릭한 창을 맨 위로 올리기 [cite: 152]
			else:
				# 클릭 해제: 드래그 모드 OFF
				dragging = false

	elif event is InputEventMouseMotion and dragging:
		# 마우스 움직임: 창 위치 이동
		global_position = get_global_mouse_position() - drag_start_position

func _on_close_button_pressed():
	# 창 닫기 (실제로는 숨기기만 할 수도 있음)
	queue_free() # 아예 삭제
