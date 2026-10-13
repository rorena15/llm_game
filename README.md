# 소셜 엔지니어 (Social Engineer)

가짜 회사 PC 앞에 앉은 해커가 **메일·웹·메신저 대화로 단서를 모으고, 수사보드에서 추론을 엮어, 대상의 비밀번호를 맞히는** 한국어 사회공학 추리 게임입니다. NPC는 로컬 AI(Kanana)가 연기하고, 판정은 게임 엔진이 합니다. 인터넷 연결 없이 돌아가는 무료 게임을 목표로 합니다.

> 실제 해킹 방법을 다루지 않습니다. 등장하는 회사·인물·문서는 모두 허구입니다.

## 상태

리메이크 진행 중 (`remake` 브랜치). Godot + Python 프로토타입을 Tauri + React + TypeScript로 옮기고 있습니다.

- 진행 상황과 남은 작업: [ROADMAP.md](ROADMAP.md)
- 설계 (게임 루프, NPC 엔진, 보드, 미션 규칙, 배포): [docs/설계안.md](docs/설계안.md)

지금 되는 것: 튜토리얼과 미션 1~4를 처음부터 끝까지 플레이 (메일·브라우저·메신저·수사보드·사내망 로그인, 결과 화면과 S~C 등급). 실패하면 "이어서 다시"(단서 유지, 등급 하락)와 "완전히 새로"(정답이 다른 변형으로) 중에서 고릅니다. 클리어 기록과 최고 등급은 저장되고, 앞 미션을 깨야 다음 미션이 열립니다.

## 구조

```
app/                 게임 (Tauri + React + TS)
  src/engine/        NPC 엔진. UI에 의존하지 않는 순수 TS (판정 → 수치표 → 대사 → 검사)
  src/game/          미션 한 판의 상태(MissionRun), 시나리오·모델 연결
  src/ui/            데스크톱, 창, 앱 화면
  scenarios/         미션 데이터 (JSON, 변형 포함)
  eval/convos/       모델 평가용 대화 세트
  tools/             시나리오 검증, 대화 실행, 평가 실행 (Node)
  src-tauri/         데스크톱 앱 껍데기 (Rust)
train/               모델 준비 (배포본에 들어가지 않음)
  modelfiles/        Ollama Modelfile
  out/               변환한 GGUF (git 제외)
docs/                설계 문서
legacy/              Godot + Python 프로토타입 (이식이 끝나면 삭제)
```

## 실행

필요한 것: Node.js 24, Rust (Tauri용), [Ollama](https://ollama.com).

```sh
cd app && npm install && cd ..   # 처음 한 번
npm run dev           # 데스크톱 창으로 실행 (Vite 개발 서버도 함께 뜸)
npm run web           # 브라우저로만 실행: http://localhost:5173
```

최상위의 `package.json`은 `app/`으로 넘겨 주는 바로 가기입니다. `app/` 안에서는 `npm run tauri dev`, `npm run dev`로 같은 일을 합니다.

주소 끝에 `?debug`를 붙이면 매 턴의 판정·수치와 정답이 보이고, 잠긴 미션도 고를 수 있습니다.

진행 저장은 데스크톱 앱에서는 앱 데이터 폴더(`%APPDATA%\com.socialengineer.game\save.json`), 브라우저 실행에서는 localStorage에 남습니다. 처음부터 다시 하려면 이 파일을 지웁니다.

### 모델

개발 중에는 Ollama에 등록한 Kanana-1.5 원본 모델을 씁니다. 기본값은 `se-kanana-8b`이고, `app/.env.local`에서 바꿀 수 있습니다.

```sh
VITE_LLM_URL=http://localhost:11434
VITE_LLM_MODEL=se-kanana-8b
```

Kanana-1.5-8B-instruct (또는 2.1B)를 llama.cpp `convert_hf_to_gguf.py`로 f16 GGUF로 바꾸고 `llama-quantize`로 Q4_K_M을 만든 뒤 `train/out/`에 두고 등록합니다.

```sh
cd train/modelfiles
ollama create se-kanana-8b -f Modelfile.kanana-8b
```

배포본에서는 Ollama 대신 `llama-server`를 앱에 함께 넣을 예정입니다 (같은 OpenAI 호환 API라 주소만 바뀝니다).

## 개발 명령 (`app/`에서)

| 명령 | 하는 일 |
|---|---|
| `npm test` | 엔진·보드 테스트 (모델 없이, 가짜 모델로) |
| `npm run validate` | 시나리오 형식과 미션 설계 규칙 검사 (변형마다) |
| `npm run chat -- mission_1 a < 대사.txt` | 실제 모델에 대사를 차례로 보내 판정·응답 보기 |
| `npm run eval -- se-kanana-8b se-kanana-2.1b` | 평가 대화 세트를 모델별로 돌려 요약표와 기록 남김 (`app/eval/runs/`) |
| `npm run lint` | ESLint |
| `npm run build` | 타입 검사 + 웹 빌드 |

## 미션 만들기

미션 하나는 `app/scenarios/<id>.json` 파일 하나입니다. 형식과 규칙은 설계안 §7·§8에 있고, 핵심은 다음과 같습니다.

- 비밀번호는 조각 2~4개의 조합이며, 최소 하나는 **대화로만**, 최소 하나는 **문서로만** 얻을 수 있다.
- NPC가 아는 정보는 `free`(누구에게나) / `guarded`(조건을 채우면) / `secret`(대화로는 절대 안 나옴) 등급을 가진다. 비밀번호 원문은 프롬프트에 들어가지 않는다.
- 미션마다 변형 3개 (값만 바뀌고 구조는 같음). 실패 후 "완전 초기화"하면 다른 변형으로 바뀐다.

작성 뒤 `npm run validate`로 검사합니다.

## 라이선스

정해지지 않았습니다. 배포 전에 정합니다. 사용 예정인 외부 구성 요소: Kanana 1.5 (Apache 2.0), llama.cpp (MIT), Tauri (MIT/Apache 2.0), React Flow (MIT).
