extends PanelContainer

@onready var email_list = $Layout/ContentArea/HSplitContainer/EmailList
@onready var subject_label = $Layout/ContentArea/HSplitContainer/EmailDetail/SubjectLabel
@onready var body_label = $Layout/ContentArea/HSplitContainer/EmailDetail/BodyLabel
@onready var http_request = $HTTPRequest # 씬에 추가 필요!

var emails = []

func _ready():
	$Layout/TitleBar/CloseButton.pressed.connect(queue_free)
	
	# 리스트 클릭 시 본문 보여주기
	email_list.item_selected.connect(_on_email_selected)
	
	# 본문 내 단서 클릭 연결 (수사 보드로 전송)
	body_label.meta_clicked.connect(func(meta):
		var data = JSON.parse_string(meta)
		if data: Global.clue_found.emit(data.type, data.value)
	)
	
	# 서버에 데이터 요청
	http_request.request_completed.connect(_on_data_received)
	http_request.request("http://127.0.0.1:8000/mission/mission_1")

func _on_data_received(result, response_code, _headers, body):
	if result == HTTPRequest.RESULT_SUCCESS and response_code == 200:
		var json = JSON.new()
		json.parse(body.get_string_from_utf8())
		var data = json.get_data()
		
		# 이메일 데이터 파싱
		emails = data.get("emails", [])
		_update_email_list()

func _update_email_list():
	email_list.clear()
	for email in emails:
		email_list.add_item(email["sender"] + " - " + email["subject"])

func _on_email_selected(index):
	var email = emails[index]
	subject_label.text = email["subject"]
	
	# 본문 내용에서 힌트 자동 링크 걸기 (간단한 버전)
	var text = email["body"]
	if "990132" in text: # 사번
		text = text.replace("990132", '[url={"type":"id", "value":"990132"}]990132[/url]')
	if "2024" in text: # 연도 힌트
		text = text.replace("2024", '[url={"type":"hint", "value":"2024"}]2024[/url]')
		
	body_label.text = text
