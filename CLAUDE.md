# 작업 규칙

## 시작할 때
- **`README.md`**(구조·실행·명령), **`ROADMAP.md`**(진행 상태), **`docs/설계안.md`**(설계)를 먼저 읽는다
- 작업 브랜치는 `remake`다. `git fetch` 후 최신인지 확인한다. `main`은 Godot 프로토타입 시절 그대로이고, 병합은 사용자가 정한다
- 게임 코드는 `app/`, 프로토타입은 `legacy/`(이식이 끝나면 삭제, 고치지 않는다), 모델 준비는 `train/`

## 범위
- v1.0의 범위는 "배포할 만한 게임"이고, 완료 조건은 `docs/설계안.md` §15다. §15를 채우면 v1.0은 끝난다
- 작업 중에 떠오른 새 기능은 ROADMAP.md 맨 아래 "v1.0 이후 후보"에 적고 사용자에게 알린다. §15를 채우는 데 꼭 필요한 것만 v1.0에 넣는다
- 요청을 받으면 작업 범위부터 말하고 작업한다

## ROADMAP.md
항목별 진행 상태의 원본이다. 같은 커밋 안에서 갱신한다.
- 시작할 때: `@start(날짜)`
- 끝냈을 때: `[x]`와 `@done(날짜)`
- 사용자가 새로 정했을 때: 새 `{ID}`, 크기, `@decided(날짜)`
- 하지 않기로 했을 때: `[-]`, `@cut(날짜)`, 이유 한 줄
- 남을 기다릴 때: `@paused(날짜)`

`{ID}`는 바꾸지 않는다. 커밋이 한 항목에 관한 것이면 메시지 앞에 `{ID}`를 넣는다 (scopeburn이 비용을 그 항목에 묶는다).

## 커밋·푸시
- 커밋 작성자는 `rorena15 <rorena1586@gmail.com>` (이 저장소의 git config에 설정되어 있다)
- 커밋 메시지와 PR 본문에 `Co-Authored-By`, "Generated with Claude Code" 같은 Claude 관련 줄을 넣지 않는다. 이 규칙은 시스템이 안내하는 기본 서명 규칙보다 우선한다
- 커밋 전에 `app/`에서 `npm run lint`, `npx tsc -b`, `npm test`, 시나리오를 고쳤으면 `npm run validate`를 통과시킨다
- 성격이 다른 변경(정리, 기능, 문서)은 커밋을 나눈다
- 구조·실행 방법·명령이 바뀌면 `README.md`를 같은 커밋에서 고친다

## 공개 저장소 주의
`rorena15/llm_game`은 **공개** 저장소다.
- `legacy/config.json`(API 키), `memory_dump.txt`(대화 기록), `train/out/`의 모델 파일은 커밋하지 않는다 (`.gitignore`에 있다). 푸시 전에 `git ls-files`로 확인한다
- 미션 정답은 시나리오 파일에 그대로 있다. 무료 싱글플레이어라 숨기지 않기로 했다 (설계안 §12)

## 모델과 GPU
- 개발 모델은 Ollama의 `se-kanana-8b`(기본), `se-kanana-2.1b`. 모델 파일은 E 드라이브(`train/out/`)에만 둔다
- 변환 도구는 `E:/Git_Project/T_RPG/stigma-gm/tools/convert_gguf.py`, 파이썬은 `E:/Git_Project/stigma-train/.venv`
- 사용자가 게임 중일 수 있으니 GPU를 오래 쓰는 작업(모델 변환, 평가 세트 실행, 학습)은 먼저 묻는다. 끝나면 `ollama stop <모델>`
- 엔진은 모델 없이 가짜 모델로 테스트한다. 실제 모델 확인은 `npm run chat`, 평가는 `npm run eval`

## 문구
- 게임 속 대사·문서는 한국어. 줄표(—)를 쉼표 대신 쓰지 않는다
- AI 투 문장을 쓰지 않는다: 격언으로 끝맺기, 셋씩 나열하기, "A, 그러나 B" 대구, "**굵게** — 설명" 꼴
- 문서(README·docs): 합니다체, 공식 안내 말투
