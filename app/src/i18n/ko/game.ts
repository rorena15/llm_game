// 화면 문구 (한국어): game
export const game = {
  noticeClue: '단서 수집',
  noticeFact: '대화에서 단서 발견',
  noticeInference: '추론 완성',
  noticeWarnTitle: '경계 위험',
  noticeSuspicious: (name: string) => `${name}이(가) 의심하기 시작했습니다`,
  noticeLoginDenied: '접속 거부',
  noticeAlertUp: (n: number) => `보안 경계 +${n}`,
  noticeHintTitle: '로그인 힌트 열림',
  noticeHintText: '사내망 접속 화면에서 확인하세요',
  chatModelDown: '대화 모델이 응답하지 않습니다. 잠시 뒤 다시 보내 주세요.',
  chatSecurityAlarm: '[보안 경보] 수상한 접근이 감지되어 접속이 차단되었습니다.',
}
