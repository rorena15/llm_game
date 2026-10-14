// UI strings (English): game. Same shape as ../ko/game.ts
import type { game as Ko } from '../ko/game'

export const game: typeof Ko = {
  noticeClue: 'Clue collected',
  noticeFact: 'Clue found in chat',
  noticeInference: 'Deduction complete',
  noticeWarnTitle: 'Alert rising',
  noticeSuspicious: (name: string) => `${name} is getting suspicious`,
  noticeLoginDenied: 'Access denied',
  noticeAlertUp: (n: number) => `Alert +${n}`,
  noticeHintTitle: 'Login hint unlocked',
  noticeHintText: 'Check the Intranet Login screen',
  chatModelDown: 'The dialogue model is not responding. Please try sending again in a moment.',
  chatSecurityAlarm: '[Security alert] Suspicious access detected. Your connection has been blocked.',
}
