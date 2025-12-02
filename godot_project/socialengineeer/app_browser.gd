extends PanelContainer

# === UI 노드 경로 (씬에 이 이름대로 노드가 있어야 함) ===
@onready var url_input = $Layout/ContentArea/HBoxContainer/LineEdit_URL
@onready var btn_go = $Layout/ContentArea/HBoxContainer/Button_Go
@onready var web_view = $Layout/ContentArea/RichTextLabel_Content
@onready var title_bar = $Layout/TitleBar

# === 창 이동 변수 (app_email.gd 참고) ===
var dragging = false
var drag_start_position = Vector2()

# 서버에서 받은 웹사이트 데이터 {"url": "content"}
var website_data = {}

func _ready():
	# 1. 닫기 버튼
	$Layout/TitleBar/CloseButton.pressed.connect(queue_free)
	
	# 2. 드래그 기능
	title_bar.gui_input.connect(_on_title_bar_gui_input)
	
	# 3. 브라우저 기능 연결
	btn_go.pressed.connect(_on_navigate)
	url_input.text_submitted.connect(func(_text): _on_navigate())
	
	# 4. Global에서 데이터 가져오기
	if Global.mission_data.has("websites"):
		website_data = Global.mission_data["websites"]
	
	# 5. 초기 화면
	web_view.text = "[center]\n\n🌐 접속할 주소를 입력하세요.\n(예: www.corpx.com)[/center]"

func _on_navigate():
	var input_url = url_input.text.strip_edges()
	
	# 로딩 연출
	web_view.text = "[center]Connecting...[/center]"
	await get_tree().create_timer(0.3).timeout
	
	if website_data.has(input_url):
		# 사이트 내용 표시 (BBCode 지원)
		web_view.text = website_data[input_url]
	else:
		# 404 에러
		web_view.text = "[center][color=red]❌ 404 Not Found[/color]\n\n해당 URL을 찾을 수 없습니다.[/center]"

# === 창 드래그 로직 (기존 앱들과 동일) ===
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
