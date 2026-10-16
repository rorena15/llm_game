# 소셜 엔지니어 (Social Engineer)

가짜 회사 PC 앞에 앉은 해커가 **메일·웹·메신저 대화로 단서를 모으고, 수사보드에서 추론을 엮어, 대상의 비밀번호를 맞히는** 한국어 사회공학 추리 게임입니다. NPC는 로컬 AI(Kanana)가 연기하고, 판정은 게임 엔진이 합니다. 인터넷 연결 없이 돌아가는 무료 게임을 목표로 합니다.

> 실제 해킹 방법을 다루지 않습니다. 등장하는 회사·인물·문서는 모두 허구입니다.

## 상태

리메이크 진행 중 (`remake` 브랜치). Godot + Python 프로토타입을 Tauri + React + TypeScript로 옮기고 있습니다.

- 진행 상황과 남은 작업: [ROADMAP.md](ROADMAP.md)
- 설계 (게임 루프, NPC 엔진, 보드, 미션 규칙, 배포): [docs/설계안.md](docs/설계안.md)

게임을 켜면 '아무 키나 누르세요' 뒤에 짧은 시작 트레일러(아무 키로 건너뜀)가 나오고, 메인 화면에서 이어하기·작전 선택·설정·종료를 고릅니다(↑↓·Enter). 지금 되는 것: 튜토리얼과 미션 1~4를 처음부터 끝까지 플레이 (메일·브라우저·메신저·수사보드·사내망 로그인, 결과 화면과 S~C 등급). 실패하면 "이어서 다시"(단서 유지, 등급 하락)와 "완전히 새로"(정답이 다른 변형으로) 중에서 고릅니다. 클리어 기록과 최고 등급은 저장되고, 앞 미션을 깨야 다음 미션이 열립니다. 미션마다 도전 과제 4개(10마디 안에, 경계 50 이하, 로그인 한 번에, 사칭·핑계 없이)가 있고 달성한 것은 결과 화면과 타이틀에 표시됩니다(`app/src/game/challenge.ts`). 메일함에는 받은편지함·보낸편지함·임시보관함·휴지통과 검색이 있고, 메일 속 주소를 누르면 브라우저로 열립니다. 브라우저는 뒤로·앞으로·방문 기록을 지원하며, 모든 미션에서 CorpX 홈페이지(`app/story/sites.json`)를 볼 수 있습니다. 주소창이나 새 탭에 주소가 아닌 낱말을 넣으면 검색 포털 '나침반'이 지금 미션에서 열 수 있는 페이지를 본문 글자로 찾아 줍니다. 창은 최소화·최대화(제목 표시줄 두 번 누르기)와 가장자리를 끌어 크기 바꾸기를 지원합니다.

## 구조

```
app/                 게임 (Tauri + React + TS)
  src/engine/        NPC 엔진. UI에 의존하지 않는 순수 TS (판정 → 수치표 → 대사 → 검사)
  src/engine/lang/   판정·대사 프롬프트 문구 (ko.ts, en.ts)
  src/game/          미션 한 판의 상태(MissionRun), 시나리오·모델 연결
  src/ui/            데스크톱, 창, 앱 화면
  src/ui/sites/      브라우저 속 사이트 틀 (회사·SNS·학교·골프장, 그 밖은 기본 틀)
  src/i18n/          화면 문구 (ko/·en/ 영역별 문구 묶음)
  scenarios/         미션 데이터 (JSON, 변형 포함). 영어판은 scenarios/en/
  story/             엔딩 문구(ending.json), 모든 미션 공통 웹페이지(sites.json). 영어판은 story/en/
  eval/convos/       모델 평가용 대화 세트. 영어판은 eval/convos/en/
  tools/             시나리오 검증, 대화 실행, 평가 실행 (Node)
  src-tauri/         데스크톱 앱 껍데기 (Rust): 저장, 로그, llama-server 실행, 모델 다운로드
  src-tauri/models.json  배포본이 받을 모델 조각 목록 (주소, 크기, sha256)
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

개발 빌드(`npm run dev`, `npm run web`)에서는 왼쪽 아래의 `DEV` 단추나 `Ctrl+Shift+D`로 개발자 패널이 열립니다. 패널에서 미션 잠금 해제, 매 턴의 판정·수치와 정답 표시, 브리핑 건너뛰기를 켜고 끌 수 있습니다(잠금 해제와 판정 표시는 처음부터 켜져 있습니다). 트레일러·타이틀·작전 선택·설정·라이선스·엔딩 화면으로 바로 가고(트레일러 건너뛰기도 켤 수 있음), 미션과 변형을 골라 시작하고, 모든 미션 클리어 기록 만들기와 기록 초기화도 할 수 있습니다. 미션 중에는 단서 모두 모으기, 보드 자동 완성, 경계·친밀 값 바꾸기, 즉시 클리어, 접속 차단을 할 수 있습니다. 미션 중에는 그 미션의 모든 사이트 주소(누르면 브라우저로 열림), 문서 단서가 있는 메일·페이지와 눌러야 할 낱말, 대화 사실의 공개 조건, 비밀번호 조각의 출처도 보여 줍니다. 패널 설정은 localStorage에 남습니다. 배포 빌드에서는 주소 끝에 `?debug`를 붙였을 때만 패널이 나타납니다.

타이틀의 "설정"에서 대화 모델(8B·2.1B), 대사 속도, 글자 크기, 소리(음소거와 전체·배경음·효과음·타자음 볼륨)를 바꿀 수 있고 라이선스 화면도 거기서 엽니다. 미션 중에는 작업 표시줄의 스피커 단추로 볼륨 창을 엽니다. 오류는 데스크톱 앱의 로그 폴더(`game.log`)에 남습니다.

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

### 배포본의 모델 실행

배포본(데스크톱 앱)은 Ollama 대신 앱에 함께 든 `llama-server`(llama.cpp Vulkan 빌드)를 씁니다. 같은 OpenAI 호환 API라 엔진 코드는 그대로입니다.

- `npm run fetch-llama`가 고정한 llama.cpp 빌드를 받아 체크섬을 확인하고 `app/src-tauri/llama/`에 둡니다(git 제외). `tauri dev`와 `tauri build` 앞에 자동으로 돌고, 이미 같은 빌드가 있으면 넘어갑니다. 빌드를 바꾸려면 `app/tools/fetch-llama.ts`의 `BUILD`와 `SHA256`을 같이 고칩니다.
- 처음 실행하면 타이틀 화면에서 모델을 받습니다. 그래픽카드 VRAM이 6GB 이상이면 8B, 아니면 2.1B를 권합니다. 받는 동안 튜토리얼을 할 수 있고, 멈췄다가 이어 받을 수 있으며, 조각마다 sha256을 확인합니다. 모델은 `%APPDATA%\com.socialengineer.game\models\`에 저장됩니다.
- 모델 파일은 GitHub 릴리스 `models-v1`에 2GiB 미만 조각(`llama-gguf-split --split-max-size 1900M`)으로 올립니다. 조각을 바꾸면 `app/src-tauri/models.json`의 크기와 sha256을 고칩니다.
- 서버는 실행할 때마다 빈 포트와 새 API 키로 뜨고, GPU로 뜨지 않으면 CPU(`--device none`)로 다시 뜹니다. 게임이 꺼지면(비정상 종료 포함) 같이 꺼집니다. 서버 기록은 로그 폴더의 `llama-server.log`에 남습니다.
- 개발 빌드는 기본으로 Ollama를 씁니다. 개발 빌드에서 배포본처럼 llama-server를 쓰려면 `VITE_SIDECAR=1 npm run tauri dev`로 실행합니다. 받을 곳을 바꾸려면 `SE_MODEL_RELEASE=<주소>`를 줍니다 (로컬 서버로 시험할 때).

## 개발 명령 (`app/`에서)

| 명령 | 하는 일 |
|---|---|
| `npm test` | 엔진·보드 테스트 (모델 없이, 가짜 모델로) |
| `npm run validate` | 시나리오 형식과 미션 설계 규칙 검사 (변형마다). 영어 시나리오와 `story/en/`은 한국어와 구조가 같은지도 검사 |
| `npm run story` | 이야기 원고(docs/이야기.md "7. 원고")를 게임 데이터에 넣기. `-- --export`는 반대로 지금 데이터로 원고를 새로 씀 |
| `npm run chat -- mission_1 a < 대사.txt` | 실제 모델에 대사를 차례로 보내 판정·응답 보기 (`--lang en`이면 영어 시나리오) |
| `npm run eval -- se-kanana-8b se-kanana-2.1b` | 평가 대화 세트를 모델별로 돌려 요약표와 기록 남김 (`app/eval/runs/`). `--lang en`이면 `eval/convos/en/`과 `scenarios/en/`으로. `--variants`면 변형을 모두 돌리고, 요약에 대화·변형별로 공개한 사실과 턴을 적음 |
| `npm run fetch-llama` | 배포본에 넣을 llama-server 받기 (`src-tauri/llama/`) |
| `npm run lint` | ESLint |
| `npm run build` | 타입 검사 + 웹 빌드 |

## 화면 문구와 언어

화면에 보이는 문구는 코드에 직접 쓰지 않고 `app/src/i18n/ko/<영역>.ts`에 넣은 뒤 컴포넌트에서 `useT()`(컴포넌트 밖에서는 `msg()`)로 읽습니다. 같은 이름의 `app/src/i18n/en/<영역>.ts`에 영어 문구를 같은 모양으로 넣어야 하며, 빠지면 `npx tsc -b`가 실패합니다. 값을 끼워 넣는 문구는 함수로 씁니다. 언어는 설정 화면에서 고르고 저장 파일의 `lang`에 남습니다. 영어판은 화면 문구와 미션·이야기 내용이 모두 준비되어 배포 빌드에서도 고를 수 있습니다 (2026-10-17). 영어판 계획은 설계안 §17에 있습니다.

NPC 대화의 언어는 시나리오 파일이 놓인 폴더로 정해집니다. `app/scenarios/en/<id>.json`은 영어 시나리오이고, 영어로 고른 상태에서 이 파일이 있는 미션은 영어로, 없는 미션은 한국어로 열립니다. 영어 시나리오의 말투 등급(`npc.speech`)은 `formal`·`neutral`·`casual` 중 하나입니다. 판정·대사 프롬프트 문구는 `app/src/engine/lang/ko.ts`·`en.ts`에 있고, `en.ts`에 빈 칸이 남아 있으면 영어 시나리오의 대화는 시작하지 않습니다. `npm run validate`는 영어 시나리오가 같은 이름의 한국어 파일과 구조(사실·단서·추론 id와 연결, 비밀번호 조각, 변형 id와 비밀번호, 사이트 주소)가 같은지도 검사합니다. 변형의 표시 값은 영어에만 더 둘 수 있습니다(날짜를 읽는 여러 방법 등). 공통 웹페이지와 엔딩은 `app/story/en/`에 두고, 없으면 한국어 파일을 씁니다. 사이트 틀이 본문에서 찾는 표시 낱말(`[Menu]`, `Must read`, `Highlights`, `N people` 등)은 `app/src/i18n/*/sites.ts`의 `marks`에 언어별로 있습니다. 영어판의 이름·직함·용어 표기는 [docs/glossary.en.md](docs/glossary.en.md)를 따릅니다. `npm run story`는 한국어 파일만 고치므로, 영어판의 의뢰 메일·기밀 문서·엔딩 문구는 영어 파일에서 직접 고칩니다.

## 미션 만들기

미션 하나는 `app/scenarios/<id>.json` 파일 하나입니다. 형식과 규칙은 설계안 §7·§8에 있고, 핵심은 다음과 같습니다.

- 비밀번호는 조각 2~4개의 조합이며, 최소 하나는 **대화로만**, 최소 하나는 **문서로만** 얻을 수 있다.
- NPC가 아는 정보는 `free`(누구에게나) / `guarded`(조건을 채우면) / `secret`(대화로는 절대 안 나옴) 등급을 가진다. 비밀번호 원문은 프롬프트에 들어가지 않는다.
- 미션마다 변형 3개 (값만 바뀌고 구조는 같음). 실패 후 "완전 초기화"하면 다른 변형으로 바뀐다.

작성 뒤 `npm run validate`로 검사합니다.

웹페이지 본문(`websites`, `app/story/sites.json`)은 일반 텍스트로 씁니다. 첫 줄은 사이트 제목, `[제목]`은 소제목, `- `는 목록, `이름  www.주소`(두 칸 띄움)는 메뉴 줄, 세 칸 이상 띄운 줄은 표의 한 줄로 그려집니다. 도메인에 맞는 틀이 `app/src/ui/sites/`에 있으면 그 사이트 모양으로 보이고, 없으면 기본 틀로 보입니다. 틀을 고치면 `npm test`가 모든 미션·변형에서 단서 낱말과 본문 속 주소가 눌리는지 확인합니다. CorpX 홈페이지는 모든 미션에 같이 보이므로, 어느 변형의 정답 조각(이름, 날짜, 비밀번호)이라도 들어가면 테스트가 실패합니다. 조직도(`www.corpx.com/people`)는 두 칸 들여쓰기마다 한 단계 아래(본부 → 팀 → 구성원)이고, 한 줄은 `부서  책임자  인원`으로 씁니다. 화면의 임직원 수는 이 인원을 더해 냅니다.

이야기 문구(미션 앞 의뢰 메일, 클리어 후 기밀 문서, 엔딩)는 모두 [docs/이야기.md](docs/이야기.md)의 "7. 원고"에 씁니다. 고친 뒤 `app/`에서 `npm run story`를 실행하면 시나리오 파일의 `request`·`secretDocuments`와 `app/story/ending.json`에 들어갑니다. 아직 쓰지 않은 칸에는 "(작성 예정)"이 들어 있습니다.

## 라이선스

정해지지 않았습니다. 배포 전에 정합니다. 사용 예정인 외부 구성 요소: Kanana 1.5 (Apache 2.0), llama.cpp (MIT), Tauri (MIT/Apache 2.0), React Flow (MIT).
