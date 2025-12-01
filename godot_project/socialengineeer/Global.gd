extends Node

# "단서 발견했어!" 라고 외치는 신호
# type: 단서 종류 (IP, Password, Name 등)
# value: 실제 값 (192.168.0.1, admin123 등)
signal clue_found(type, value)
