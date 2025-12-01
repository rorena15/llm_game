extends PanelContainer

# === [창 이동 기능] 변수 (새로 추가됨) ===
var dragging = false
var drag_start_position = Vector2()
@onready var title_bar = $Layout/TitleBar

# === [수사 보드 기능] 변수 ===
@onready var graph_edit = $Layout/ContentArea/GraphEdit
var next_spawn_pos = Vector2(100, 100)

func _ready():
	# 1. 창 드래그 기능 연결 (⭐ 이게 추가되어야 움직입니다!)
	title_bar.gui_input.connect(_on_title_bar_gui_input)
	
	# 2. 닫기 버튼 연결
	var close_btn = $Layout/TitleBar/CloseButton
	if not close_btn.pressed.is_connected(queue_free):
		close_btn.pressed.connect(queue_free)
	
	# 3. 그래프 신호 연결 (안전장치 포함)
	if not graph_edit.connection_request.is_connected(_on_connection_request):
		graph_edit.connection_request.connect(_on_connection_request)
	
	if not graph_edit.disconnection_request.is_connected(_on_disconnection_request):
		graph_edit.disconnection_request.connect(_on_disconnection_request)
	
	if not Global.clue_found.is_connected(_on_clue_found):
		Global.clue_found.connect(_on_clue_found)

# === [창 이동 로직] (새로 추가됨) ===
func _on_title_bar_gui_input(event):
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				dragging = true
				drag_start_position = get_global_mouse_position() - global_position
				move_to_front() # 클릭하면 창을 맨 위로
			else:
				dragging = false
	elif event is InputEventMouseMotion and dragging:
		global_position = get_global_mouse_position() - drag_start_position

# === [수사 보드 로직] (기존 코드 유지) ===
func _on_clue_found(type, value):
	print("수사 보드: 단서 수신함 - ", value)
	
	var new_node = GraphNode.new()
	new_node.title = "단서 발견"
	new_node.position_offset = next_spawn_pos
	new_node.resizable = true
	new_node.size = Vector2(200, 100)
	new_node.set_slot(0, true, 0, Color.WHITE, true, 0, Color.WHITE)
	
	var label = Label.new()
	label.text = type.to_upper() + "\n" + value
	new_node.add_child(label)
	
	graph_edit.add_child(new_node)
	next_spawn_pos += Vector2(30, 30)

func _on_connection_request(from_node_name, from_port, to_node_name, to_port):
	graph_edit.connect_node(from_node_name, from_port, to_node_name, to_port)
	
	var from_node = graph_edit.get_node(str(from_node_name))
	var to_node = graph_edit.get_node(str(to_node_name))
	
	if not from_node or not to_node: return

	var from_data = _get_node_content(from_node)
	var to_data = _get_node_content(to_node)
	
	print("🔎 전체 데이터 분석: [%s] <-> [%s]" % [from_data, to_data])
	
	var condition_pw = "blue_sky_2024" in from_data or "blue_sky_2024" in to_data
	var condition_target = "server" in from_data or "server" in to_data or "서버" in from_data or "서버" in to_data
	
	if condition_pw and condition_target:
		_show_hack_success()
	else:
		print("❌ 정보 불일치. (서버 노드의 제목이나 라벨에 'Server'가 있는지 확인하세요)")

func _on_disconnection_request(from_node, from_port, to_node, to_port):
	graph_edit.disconnect_node(from_node, from_port, to_node, to_port)
	print("연결 해제됨")

func _get_node_content(node):
	var content = str(node.title) + " "
	for child in node.get_children():
		if child is Label:
			content += child.text + " "
		elif child is RichTextLabel:
			content += child.get_parsed_text() + " "
	return content.to_lower()

func _show_hack_success():
	print("✅ 해킹 성공! 관리자 권한 획득!")
