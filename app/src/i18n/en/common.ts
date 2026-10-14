// UI strings (English): common. Same shape as ../ko/common.ts
import type { common as Ko } from '../ko/common'

export const common: typeof Ko = {
  back: 'Back',
  toMissions: 'Back to missions',
  retryCheck: 'Check again',
  health: {
    checking: 'Checking the dialogue model…',
    down: "Can't reach the dialogue model server. Make sure the model server is running. The tutorial works without a model.",
    nomodel: 'The model server is running, but no dialogue model is loaded. Check the model in Settings.',
  },
}
