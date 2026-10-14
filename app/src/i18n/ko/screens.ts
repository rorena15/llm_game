// 화면 문구 (한국어): 타이틀, 브리핑, 결과, 설정, 라이선스, 엔딩
export const screens = {
  title: {
    newVersion: (v: string) => `새 버전 ${v}이 나왔습니다. itch.io 페이지에서 받을 수 있습니다.`,
    tagline: '말 몇 마디로 열리는 문',
    locked: '잠김: 앞 미션을 완료하세요',
    tutorial: '튜토리얼',
    settings: '설정',
  },
  briefing: {
    start: '작전 시작',
  },
  result: {
    points: (n: number) => `${n}점`,
    time: '걸린 시간',
    minutes: (n: number) => `${n}분`,
    turns: '대화',
    turnsValue: (n: number) => `${n}마디`,
    maxSuspicion: '최대 경계',
    loginFails: '로그인 실패',
    wrongLinks: '헛짚은 연결',
    retries: '다시 접근',
    times: (n: number) => `${n}회`,
    newMail: '새 메일 확인',
  },
  settings: {
    title: '설정',
    model: '대화 모델',
    models: {
      'se-kanana-8b': { label: '고품질 (8B)', note: 'VRAM 6GB 이상 권장' },
      'se-kanana-2.1b': { label: '가벼움 (2.1B)', note: '그 외 PC, CPU 포함' },
    },
    speed: '대사 속도',
    speeds: { slow: '느리게', normal: '보통', fast: '빠르게', instant: '바로' },
    size: '글자 크기',
    sizes: { small: '작게', normal: '보통', large: '크게' },
    sound: '소리',
    soundOn: '켜기',
    soundOff: '음소거',
    volumes: { master: '전체', bgm: '배경음', sfx: '효과음', key: '타자음' },
    report: '문제 신고',
    reportBody:
      '게임이 멈추거나 이상하게 동작하면 itch.io 게임 페이지의 댓글로 알려 주세요. 오류 기록 파일(game.log)을 함께 올려 주시면 원인을 찾는 데 큰 도움이 됩니다.',
    licenses: '라이선스',
  },
  licenses: {
    title: '라이선스',
    intro: '이 게임은 아래 구성 요소를 사용합니다. 이름을 누르면 라이선스 전문이 보입니다.',
    readFail: '라이선스 파일을 읽지 못했습니다.',
    tauri: 'MIT License 또는 Apache License 2.0',
  },
  ending: {
    newMail: '새 메일 1통',
    next: '계속',
    thanks: '플레이해 주셔서 고맙습니다.',
    toTitle: '타이틀로',
    from: (sender: string) => `보낸 사람: ${sender}`,
  },
}
