// 영어 프롬프트 문구 (설계안 §17.3). 사용자가 쓴다. 빈 칸이 하나라도 있으면 영어 시나리오의 대화는 시작하지 않는다.
//
// 칸마다 같은 이름의 한국어 문구(ko.ts)가 같은 역할을 한다. 틀 문자열의 {이름}은 ko.ts와 같은 것을 모두 넣는다
// (빠지면 npm test가 알려 준다). 말투 등급은 영어에서 formal · neutral · casual 셋을 쓴다.
// 대사 프롬프트의 [규칙]에는 "영어로만 말한다, 한글·한자·일본어를 쓰지 않는다"에 해당하는 줄을 넣는다
// (guard는 영어 대사에서 한글·한자·가나가 나오면 다시 만든다).
import type { PromptText } from './types'

export const en: PromptText = {
  tactic: {
    flatter: '',
    rush: '',
    empathy: '',
    pretext: '',
    ask: '',
    chat: '',
    hostile: '',
  },
  speech: {
    formal: '',
    neutral: '',
    casual: '',
  },
  directive: {
    normal: '',
    reveal: '',
    evade: '',
    wary: '',
    angry: '',
    confused: '',
  },
  passwordTopic: '',
  none: '(none)',
  player: 'Player',
  recentConvo: '',
  thisLine: '',
  judgeSystem: '',
  speakSystem: '',
  revealBlock: '',
  hiddenBlock: '',
}
