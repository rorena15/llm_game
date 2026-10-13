import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { save } from './game/save'
import { unlockAudio } from './game/sound'

unlockAudio()

// 저장을 읽은 뒤 그린다 (미션 잠금·최고 등급이 처음부터 맞게)
save.load().then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
)
