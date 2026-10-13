// OpenAI 호환 채팅 API 클라이언트. 개발은 Ollama, 배포는 llama-server (주소만 다름)
import type { ChatMessage } from './prompts'

export interface ChatOptions {
  json?: boolean
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}

export interface Llm {
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string>
}

/** 모델 서버 상태: 정상 · 서버에 닿지 않음 · 서버는 있는데 모델이 없음 */
export type LlmHealth = 'ok' | 'down' | 'nomodel'

export class OpenAICompatLlm implements Llm {
  private baseUrl: string
  private model: string

  constructor(baseUrl: string, model: string) {
    this.baseUrl = baseUrl
    this.model = model
  }

  /** 서버가 떠 있고 모델이 올라와 있는지 (OpenAI 호환 /v1/models, Ollama·llama-server 모두 지원) */
  async ping(timeoutMs = 3000): Promise<LlmHealth> {
    try {
      const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/v1/models`, { signal: AbortSignal.timeout(timeoutMs) })
      if (!res.ok) return 'down'
      const data = (await res.json()) as { data?: { id: string }[] }
      const ids = (data.data ?? []).map((m) => m.id)
      // Ollama는 "이름:latest", llama-server는 파일 이름을 돌려준다. 목록이 하나뿐이면 그것을 쓴다
      return ids.length === 1 || ids.some((id) => id === this.model || id.startsWith(`${this.model}:`)) ? 'ok' : 'nomodel'
    } catch {
      return 'down'
    }
  }

  async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: opts.signal,
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 256,
        ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      }),
    })
    if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`)
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? ''
  }
}
