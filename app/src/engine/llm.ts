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

export class OpenAICompatLlm implements Llm {
  private baseUrl: string
  private model: string

  constructor(baseUrl: string, model: string) {
    this.baseUrl = baseUrl
    this.model = model
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
