// UI strings (English): desktop. Same shape as ../ko/desktop.ts
import type { desktop as Ko } from '../ko/desktop'

export const desktop: typeof Ko = {
  apps: {
    email: 'Mail',
    messenger: 'Messenger',
    browser: 'Browser',
    board: 'Case Board',
    server: 'Intranet Login',
  },
  playerName: 'Me',
  debugBadge: (variant: string, password: string) => `Variant ${variant} · password ${password}`,
  quit: 'Abort mission',
  suspicionTitle: (n: number) => `Suspicion ${n}`,
  alert: 'Alert',
  volume: 'Volume',
  mute: 'Mute',
  guide: 'Guide',
  blocked: {
    title: 'Access blocked',
    body: (name: string) => `${name} got suspicious and alerted the security team.`,
    keepTitle: 'Retry and keep clues',
    keepDesc: 'Your clues and deductions stay. The conversation and alert reset. Your grade drops one step.',
    freshTitle: 'Start over',
    freshDescChanges: 'Clues and conversation start from scratch. The target\'s circumstances change, so the answer changes too. No penalty.',
    freshDesc: 'Clues and conversation start from scratch. No penalty.',
  },
  window: {
    minimize: 'Minimize',
    maximize: 'Maximize',
    restore: 'Restore',
    close: 'Close',
  },
}
