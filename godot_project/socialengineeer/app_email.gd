extends PanelContainer

@onready var email_list = $Layout/ContentArea/HSplitContainer/EmailList
@onready var subject_label = $Layout/ContentArea/HSplitContainer/EmailDetail/SubjectLabel
@onready var body_label = $Layout/ContentArea/HSplitContainer/EmailDetail/BodyLabel
@onready var http_request = $HTTPRequest
var dragging = false
var drag_start_position = Vector2()
@onready var title_bar = $Layout/TitleBar

var emails = []

func _ready():
	$Layout/TitleBar/CloseButton.pressed.connect(queue_free)
	title_bar.gui_input.connect(_on_title_bar_gui_input)
	email_list.item_selected.connect(_on_email_selected)
	
	body_label.bbcode_enabled = true 
	body_label.meta_clicked.connect(_on_meta_clicked)
	
	http_request.request_completed.connect(_on_data_received)
	http_request.request("http://127.0.0.1:8000/mission/mission_1")
	
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

func _on_data_received(result, response_code, _headers, body):
	print("📨 [EmailApp] 응답 코드: ", response_code)
	
	if result != HTTPRequest.RESULT_SUCCESS or response_code != 200:
		print("❌ [EmailApp] 통신/서버 오류")
		return

	var json = JSON.new()
	if json.parse(body.get_string_from_utf8()) != OK:
		print("❌ [EmailApp] JSON 파싱 실패")
		return
		
	var data = json.get_data()
	print("✅ [EmailApp] 데이터 수신: ", data)
	
	emails = data.get("emails", [])
	print("📧 이메일 개수: ", emails.size())
	
	_update_list_ui()

func _update_list_ui():
	email_list.clear()
	for email in emails:
		var sender = email.get("sender", "알 수 없음")
		var subject = email.get("subject", "제목 없음")
		email_list.add_item("%s - %s" % [sender, subject])
	
	# ⭐ [추가됨] 메일이 하나라도 있으면 첫 번째를 자동으로 선택해서 보여줌
	if emails.size() > 0:
		email_list.select(0)       # 1. UI에서 첫 번째 항목을 파란색으로 선택
		_on_email_selected(0)      # 2. 선택됐을 때 실행되는 함수를 강제로 실행

func _on_email_selected(index):
	print("🖱️ 이메일 선택됨: 인덱스 ", index)
	
	if index < 0 or index >= emails.size():
		return

	var email = emails[index]
	subject_label.text = email.get("subject", "")
	
	var text = email.get("body", "(내용이 없습니다)")
	
	# 힌트 하이라이팅
	text = _highlight_clue(text, "blue_sky_2024", "password")
	text = _highlight_clue(text, "2024", "hint")
	text = _highlight_clue(text, "990132", "id")
	
	body_label.text = text

func _highlight_clue(text: String, keyword: String, type: String) -> String:
	if keyword in text:
		# 노란색으로 강조해서 보여줌
		var bbcode = '[url={"type":"%s", "value":"%s"}][color=yellow]%s[/color][/url]' % [type, keyword, keyword]
		return text.replace(keyword, bbcode)
	return text

func _on_meta_clicked(meta):
	var data = JSON.parse_string(meta)
	if data:
		print("이메일 단서 발견: ", data.value)
		Global.clue_found.emit(data.type, data.value)
