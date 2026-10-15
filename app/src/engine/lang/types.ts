// 판정·대사 프롬프트의 언어별 문구 (설계안 §17.3). 조립은 prompts.ts가 하고, 여기는 글만 둔다.
// 틀 문자열의 {이름}은 prompts.ts가 채운다. 쓸 수 있는 이름은 항목마다 적어 둔다.
import type { Directive, Speech, Tactic } from '../types'

export interface PromptText {
  /** 판정 프롬프트에 보이는 tactic 설명 */
  tactic: Record<Tactic, string>
  /** 이 언어의 말투 등급 설명. 이 언어에서 쓸 수 있는 등급만 넣는다 */
  speech: Partial<Record<Speech, string>>
  /** 대사 호출의 엔진 지시 */
  directive: Record<Directive, string>
  /** 판정 topic 목록 맨 끝의 password 이름표 */
  passwordTopic: string
  /** 목록이 비었을 때 */
  none: string
  /** 대화 기록에서 플레이어 이름표 */
  player: string
  /** 판정 user 메시지의 머리말: 최근 대화, 이번 플레이어 말 */
  recentConvo: string
  thisLine: string
  /** 판정 system 프롬프트. {npc} {persona} {tactics} {topics} {cards} */
  judgeSystem: string
  /** 대사 system 프롬프트. {npc} {persona} {speech} {facts} {reveal} {hidden} {directive} */
  speakSystem: string
  /** 이번 턴에 공개할 사실 칸 ({reveal} 자리). {text} */
  revealBlock: string
  /** 말하지 않을 화제 칸 ({hidden} 자리). {list} */
  hiddenBlock: string
}
