# itch.io 페이지 초안

한국어 → 영어 순서입니다. 페이지에는 두 섹션을 이어 붙여 올립니다.

---

# 소셜 엔지니어

완벽한 시스템, 완벽한 틈새

## 소개

가짜 회사 PC 앞에 앉은 해커가 되어 CorpX 직원들과 사내 메신저로 대화합니다. 직원들은 내 PC에서 돌아가는 AI 모델이 연기하므로, 정해진 선택지 없이 하고 싶은 말을 직접 입력합니다. 메일, 웹페이지, SNS에서 단서를 모으고, 수사보드에서 단서를 이어 대상의 비밀번호를 추론합니다.

익명의 의뢰인 K가 일을 보냅니다. 인사팀의 채용 기록에서 시작한 의뢰는 미션을 거치며 점점 커지고, 의뢰인이 왜 이 회사를 노리는지는 마지막까지 알 수 없습니다.

인물마다 약한 부분과 의심하는 정도가 따로 있습니다. 치켜세우면 풀리는 사람이 있고, 급하다고 매달리면 넘어오는 사람이 있으며, 비밀번호를 대놓고 물으면 누구든 경계합니다. 미션마다 변형이 3개라서 다시 해도 같은 답이 나오지 않습니다.

## 특징

- 튜토리얼 1개와 미션 4개, 선택이 있는 엔딩까지 한 번에 완주할 수 있습니다.
- 자유 입력 대화입니다. 한 번 모델을 내려받은 뒤에는 인터넷 연결이 필요 없고, 계정도 없으며, 대화는 어디로도 전송되지 않습니다.
- 수사보드에서 단서 카드를 이어 추론 카드를 만듭니다. 추론을 만들면 로그인 힌트가 열리고, 대화에서 지렛대로 쓸 수도 있습니다.
- 미션을 마치면 S부터 C까지 등급이 매겨지고, 미션마다 도전 과제가 4개 있습니다.
- 실패하면 단서를 유지한 채 이어서 다시 하거나(등급 하락), 정답이 다른 변형으로 완전히 새로 시작할 수 있습니다.
- 한국어와 영어로 플레이할 수 있고, 설정에서 언어를 바꿉니다.

## 사양

- 운영체제: Windows 10/11 64비트
- 최소: VRAM 4GB 그래픽카드, 가벼운 모델(2.1B)
- 권장: VRAM 6GB 이상 그래픽카드, 고품질 모델(8B)
- 그래픽카드 없이 CPU만으로도 실행되지만 대사 한 번에 20초 안팎이 걸려 권장하지 않습니다.
- 저장 공간: 게임 약 100MB에 모델이 더해집니다. 가벼운 모델은 약 1.6GB, 고품질 모델은 약 5GB가 필요합니다.
- 처음 실행하면 모델을 한 번 내려받습니다. 받는 동안 튜토리얼을 할 수 있습니다.

## 콘텐츠 안내

이 게임은 허구의 이야기입니다. 기업 비리, 불륜과 닿아 있는 부부 갈등, 개인정보 오남용, 뇌물이 이야기에 나오고, 소재는 사회공학(사람을 속여 정보를 얻는 일)입니다.

실제 해킹 방법은 다루지 않습니다. 등장하는 회사, 인물, 문서는 모두 허구입니다. AI가 연기하는 대사이므로 가끔 어색하거나 엉뚱한 말이 나올 수 있습니다.

## 개인정보

AI는 전부 내 PC 안에서 돌아갑니다. 대화 내용은 어디로도 보내지 않습니다. 인터넷을 쓰는 경우는 모델 내려받기와 새 버전 확인, 두 가지뿐입니다.

## 버그 신고

itch.io 댓글에 남겨 주세요. 로그 폴더(설정 → 로그 폴더 열기)의 game.log를 첨부해 주시면 원인을 찾는 데 큰 도움이 됩니다. 모델 실행 문제라면 llama-server.log도 함께 부탁드립니다.

## 크레딧과 라이선스

외부 구성 요소의 고지와 전문은 게임 안의 라이선스 화면(설정에서 엽니다)에 있습니다.

- 대화 모델: Kakao Kanana 1.5 (Apache 2.0)
- 모델 실행: llama.cpp (MIT)
- 앱 틀: Tauri (MIT/Apache 2.0), 화면 구성: React Flow (MIT)
- 이 게임: 무료로 받아 플레이할 수 있으며, 게임의 코드와 글은 모든 권리를 보유합니다 (All rights reserved).

## 스크린샷 (개발자용, 페이지에는 올리지 않음)

`docs/itch/ko/`와 `docs/itch/en/`에 한국어·영어 화면이 같은 이름으로 있습니다 (1280×800, 미션 1). 정답이 드러나지 않게 수사보드는 추론 하나까지만, 결과 화면(기밀 문서가 보임)은 넣지 않았습니다.

1. `1_title.png`: 타이틀 화면
2. `2_messenger.png`: 김철수 부장과의 대화, 흘린 낱말 강조와 단서 칩
3. `3_mail_browser.png`: 메일과 CorpX 홈페이지
4. `4_board.png`: 수사보드, 단서를 이어 추론 하나를 만든 모습
5. `5_server.png`: 사내망 로그인과 첫 형식 힌트
6. `6_chat.gif`: 질문을 입력하고 부장이 답하며 단서 칩이 생기는 장면 (약 8초)

---

# Social Engineer

A perfect system, a perfect loophole

## About

You play a hacker sitting at a fake company PC. You talk to CorpX employees over an in-game messenger, and an AI model running on your own PC plays each of them. There are no dialogue options: you type whatever you want to say. You collect clues from mail, web pages and social media posts, then link them on the investigation board to work out each target's password.

An anonymous client called K sends you the jobs. The first one starts with a question about the HR Team's hiring records. Each job leads to a bigger one, and you will not learn why K is going after this company until the end.

Every character has weak spots and a level of suspicion. Some people soften under flattery, some give in when you push that something is urgent, and everyone gets wary if you ask for the password outright. Each mission has 3 variants, so the answers change when you try again.

## Features

- A tutorial, 4 missions and an ending with a choice, all playable start to finish.
- Free-form chat with a local AI. After a single model download you need no internet connection and no account, and nothing you type is sent anywhere.
- An investigation board where you link clue cards into deductions. Deductions unlock login hints and can be used as leverage in conversation.
- Grades from S to C for each mission, plus 4 challenges per mission.
- If you fail, you can retry with your clues kept (at a lower grade) or start over with a variant that has different answers.
- Playable in Korean and English. The language is set in Settings.

## System requirements

- OS: Windows 10/11, 64-bit
- Minimum: a graphics card with 4 GB VRAM, running the light model (2.1B)
- Recommended: a graphics card with 6 GB VRAM or more, running the high-quality model (8B)
- It also runs on CPU only, but each reply takes about 20 seconds, so we do not recommend it.
- Disk space: the game takes about 100 MB plus the model. You need about 1.6 GB with the light model and about 5 GB with the high-quality model.
- The first launch downloads the model once. You can play the tutorial while it downloads.

## Content notice

This is a work of fiction. The story involves corporate corruption, a marital storyline that touches on an affair, misuse of personal data, and bribery. The theme is social engineering, meaning getting information out of people by deceiving them.

The game does not teach real hacking techniques. All companies, people and documents are fictional. The characters are played by an AI, so it may occasionally say something odd.

## Privacy

The AI runs entirely on your PC and your conversations are not sent anywhere. The only network use is the model download and a check for new versions.

## Bug reports

Please leave a comment on this page. Attach game.log from the log folder (Settings, then open log folder). If the problem is with the model, llama-server.log from the same folder helps too.

## Credits and licenses

Notices and full license texts for third-party components are on the License screen in the game (open it from Settings).

- Language model: Kakao Kanana 1.5 (Apache 2.0)
- Model runtime: llama.cpp (MIT)
- App shell: Tauri (MIT/Apache 2.0); board UI: React Flow (MIT)
- This game: free to download and play. All rights reserved for the game's code and text.
