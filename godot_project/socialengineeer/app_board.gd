extends PanelContainer

@onready var graph_edit = $Layout/ContentArea/GraphEdit

# 노드를 생성할 위치 (점점 아래로 내려가게 하기 위함)
var next_spawn_pos = Vector2(100, 100)

func _ready():
	$Layout/TitleBar/CloseButton.pressed.connect(queue_free)
	graph_edit.connection_request.connect(_on_connection_request)
	
	# ⭐ 중요: Global의 신호(전화)를 받겠다고 구독 신청
	Global.clue_found.connect(_on_clue_found)
	# 1. 윈도우 닫기 버튼 연결 (기본 기능)
	$Layout/TitleBar/CloseButton.pressed.connect(queue_free)
	
	# 2. "연결 요청" 신호 감지 (이게 없으면 선이 안 이어집니다!)
	graph_edit.connection_request.connect(_on_connection_request)
	
	# 3. "연결 끊기 요청" 신호 감지
	graph_edit.disconnection_request.connect(_on_disconnection_request)

# ⭐ 신호를 받으면 실행되는 함수
func _on_clue_found(type, value):
	print("수사 보드: 단서 수신함 - ", value)
	
	var new_node = GraphNode.new()
	new_node.title = "단서 발견" # 제목은 단순하게 해도 됩니다
	new_node.position_offset = next_spawn_pos
	new_node.resizable = true
	new_node.size = Vector2(200, 100)
	
	# 슬롯 구멍 뚫기
	new_node.set_slot(0, true, 0, Color.WHITE, true, 0, Color.WHITE)
	
	# 내용물(Label) 만들기
	var label = Label.new()
	
	# ⭐ 여기가 핵심 수정 사항! ⭐
	# 라벨에 "종류"와 "실제 값"을 모두 적습니다.
	# 예: "PASSWORD" (엔터) "admin123"
	label.text = type.to_upper() + "\n" + value 
	
	new_node.add_child(label)
	graph_edit.add_child(new_node)
	
	next_spawn_pos += Vector2(30, 30)
	
func _on_connection_request(from_node_name, from_port, to_node_name, to_port):
	# 1. 시각적 연결 (선 긋기)
	graph_edit.connect_node(from_node_name, from_port, to_node_name, to_port)
	
	# 2. 노드 객체 가져오기 (str로 감싸서 안전하게)
	var from_node = graph_edit.get_node(str(from_node_name))
	var to_node = graph_edit.get_node(str(to_node_name))
	
	if not from_node or not to_node: return

	# 데이터를 가져옵니다 (이제 제목+내용물 전부 다, 소문자로 들어옵니다)
	var from_data = _get_node_content(from_node)
	var to_data = _get_node_content(to_node)
	
	print("🔎 전체 데이터 분석: [%s] <-> [%s]" % [from_data, to_data])
	
	# 검사 키워드를 전부 '소문자'로 적어주세요
	var condition_pw = "admin123" in from_data or "admin123" in to_data
	
	# "server"나 "서버"가 제목에 있든 내용에 있든 걸리게 됩니다.
	var condition_target = "server" in from_data or "server" in to_data or "서버" in from_data or "서버" in to_data
	
	if condition_pw and condition_target:
		_show_hack_success()
	else:
		print("❌ 정보 불일치. (서버 노드의 제목이나 라벨에 'Server'가 있는지 확인하세요)")
		

func _show_hack_success():
	print("✅ 해킹 성공! 관리자 권한 획득!")
	# 여기에 나중에 '잠금 해제 팝업'이나 '화면 전환' 효과를 넣으면 됩니다.
	# 임시로 노드 색깔을 초록색으로 바꿔볼까요?
	# (SelfModulate 등을 건드리면 됩니다)

func _on_disconnection_request(from_node, from_port, to_node, to_port):
	# 선을 끊는 명령
	graph_edit.disconnect_node(from_node, from_port, to_node, to_port)
	print("연결 해제됨")

func _get_node_content(node):
	# 1. 제목부터 가져오기
	var content = str(node.title) + " " 
	
	# 2. 자식들(Label)의 내용도 가져와서 이어 붙이기
	for child in node.get_children():
		if child is Label:
			content += child.text + " "
		elif child is RichTextLabel:
			content += child.get_parsed_text() + " "
			
	# 3. 중요: 헷갈리지 않게 전부 '소문자'로 바꿔서 돌려줌
	return content.to_lower()
