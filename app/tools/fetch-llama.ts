// llama-server(Vulkan 빌드)를 받아 src-tauri/llama/에 둔다. 배포본에 그대로 들어간다 (설계안 §12).
// 실행: npm run fetch-llama   (tauri dev·build 전에 자동으로 돈다. 이미 같은 빌드가 있으면 넘어간다)
// 빌드를 바꾸려면 BUILD와 SHA256을 같이 고친다 (GitHub 릴리스 자산의 digest).
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ROOT } from './content'

const BUILD = 'b11269'
const SHA256 = '34a27c239727047adc5aed80b656b13373ff136b27d28bd898a14b7b7283695a'
const ZIP = `https://github.com/ggml-org/llama.cpp/releases/download/${BUILD}/llama-${BUILD}-bin-win-vulkan-x64.zip`
const LICENSE = `https://raw.githubusercontent.com/ggml-org/llama.cpp/${BUILD}/LICENSE`
/** llama-server가 실제로 쓰는 파일만 (나머지 도구는 싣지 않는다) */
const KEEP = (f: string) =>
  f === 'llama-server.exe' ||
  f === 'libomp.dll' ||
  f.startsWith('LICENSE') ||
  /^(llama-server-impl|llama|llama-common|mtmd|ggml.*)\.dll$/.test(f)

const OUT = join(ROOT, 'src-tauri', 'llama')
const STAMP = join(OUT, 'BUILD')

if (process.platform !== 'win32') {
  console.log('fetch-llama: Windows가 아니라 넘어감')
  process.exit(0)
}
if (existsSync(STAMP) && readFileSync(STAMP, 'utf8').trim() === BUILD) process.exit(0)

async function get(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

console.log(`fetch-llama: llama.cpp ${BUILD} 받는 중`)
const zip = await get(ZIP)
const hash = createHash('sha256').update(zip).digest('hex')
if (hash !== SHA256) throw new Error(`체크섬이 다름: ${hash}`)

const tmp = mkdtempSync(join(tmpdir(), 'llama-'))
try {
  writeFileSync(join(tmp, 'l.zip'), zip)
  mkdirSync(join(tmp, 'x'))
  // Windows 10 이상에 들어 있는 bsdtar는 zip을 푼다
  execFileSync(join(process.env.SystemRoot ?? 'C:/Windows', 'System32', 'tar.exe'), ['-xf', join(tmp, 'l.zip'), '-C', join(tmp, 'x')])
  rmSync(OUT, { recursive: true, force: true })
  mkdirSync(OUT, { recursive: true })
  const files = readdirSync(join(tmp, 'x')).filter(KEEP)
  for (const f of files) copyFileSync(join(tmp, 'x', f), join(OUT, f))
  writeFileSync(join(OUT, 'LICENSE-llama.cpp'), await get(LICENSE))
  writeFileSync(STAMP, BUILD + '\n')
  console.log(`fetch-llama: ${files.length}개 파일 → src-tauri/llama/`)
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
