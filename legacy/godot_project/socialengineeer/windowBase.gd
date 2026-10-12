extends PanelContainer

var dragging = false
var drag_start_position = Vector2()
	
@onready var title_bar = $Layout/TitleBar
@onready var close_button = $Layout/TitleBar/CloseButton

func _ready():
	close_button.pressed.connect(_on_close_button_pressed)
	title_bar.gui_input.connect(_on_title_bar_gui_input)

func _on_close_button_pressed():
	queue_free()

func _on_title_bar_gui_input(event):
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				dragging = true
				drag_start_position = get_global_mouse_position() - global_position
				move_to_front()
			else:
				dragging = false

	elif event is InputEventMouseMotion and dragging:
		global_position = get_global_mouse_position() - drag_start_position
		
		# [개선된 탈출 방지 로직]
		var screen_size = get_viewport_rect().size # DisplayServer보다 뷰포트 크기가 더 안전할 수 있음
		var window_size = size
		
		# X축 제한
		global_position.x = clamp(global_position.x, 0, screen_size.x - window_size.x)
		# Y축 제한 (하단 50px 여유)
		global_position.y = clamp(global_position.y, 0, screen_size.y - window_size.y - 50)
