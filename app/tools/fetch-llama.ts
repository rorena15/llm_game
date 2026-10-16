// llama-server를 받아 src-tauri/llama/에 둔다. 배포본에 그대로 들어간다 (설계안 §12).
// 실행: npm run fetch-llama   (tauri dev·build 전에 자동으로 돈다. 이미 같은 빌드가 있으면 넘어간다)
// 플랫폼마다 빌드가 다르다: Windows는 Vulkan 빌드, macOS(Apple Silicon)는 Metal이 든 arm64 빌드.
// 빌드를 바꾸려면 BUILD와 각 플랫폼의 SHA256을 같이 고친다 (GitHub 릴리스 자산의 digest).
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ROOT } from './content'

const BUILD = 'b11269'
const LICENSE = `https://raw.githubusercontent.com/ggml-org/llama.cpp/${BUILD}/LICENSE`

interface Target {
  file: string
  sha256: string
  /** 압축 안에서 파일이 든 폴더 ('' = 맨 위) */
  dir: string
  /** 실을 파일 고르기. 심볼릭 링크면 가리키는 파일 내용을 그 이름으로 복사한다 */
  keep: (name: string, symlink: boolean) => boolean
}

const TARGETS: Record<string, Target> = {
  'win32-x64': {
    file: `llama-${BUILD}-bin-win-vulkan-x64.zip`,
    sha256: '34a27c239727047adc5aed80b656b13373ff136b27d28bd898a14b7b7283695a',
    dir: '',
    // llama-server가 실제로 쓰는 파일만 (나머지 도구는 싣지 않는다)
    keep: (f) =>
      f === 'llama-server.exe' || f === 'libomp.dll' || f.startsWith('LICENSE') || /^(llama-server-impl|llama|llama-common|mtmd|ggml.*)\.dll$/.test(f),
  },
  'darwin-arm64': {
    file: `llama-${BUILD}-bin-macos-arm64.tar.gz`,
    sha256: '294fc3148359cf56ecddf94a84b66922025c2ab87a464fe6fcfcefd737159777',
    dir: `llama-${BUILD}`,
    // 라이브러리는 lib*.0.dylib 이름으로 불러온다. 그 이름은 압축 안에서 심볼릭 링크라, 내용을 그 이름으로 복사한다
    // (배포본 리소스는 링크를 그대로 옮기지 못한다)
    keep: (f, symlink) => (!symlink && (f === 'llama-server' || f === 'libllama-server-impl.dylib')) || (symlink && /^lib[\w-]+\.0\.dylib$/.test(f)),
  },
}

const platform = `${process.platform}-${process.arch}`
const target = TARGETS[platform]
if (!target) {
  console.log(`fetch-llama: ${platform}용 빌드가 없어 넘어감`)
  process.exit(0)
}

const OUT = join(ROOT, 'src-tauri', 'llama')
const STAMP = join(OUT, 'BUILD')
const stamp = `${BUILD} ${platform}`
if (existsSync(STAMP) && readFileSync(STAMP, 'utf8').trim() === stamp) process.exit(0)

async function get(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

console.log(`fetch-llama: llama.cpp ${BUILD} (${platform}) 받는 중`)
const archive = await get(`https://github.com/ggml-org/llama.cpp/releases/download/${BUILD}/${target.file}`)
const hash = createHash('sha256').update(archive).digest('hex')
if (hash !== target.sha256) throw new Error(`체크섬이 다름: ${hash}`)

const tmp = mkdtempSync(join(tmpdir(), 'llama-'))
try {
  const file = join(tmp, target.file)
  writeFileSync(file, archive)
  mkdirSync(join(tmp, 'x'))
  // Windows 10 이상과 macOS에 들어 있는 bsdtar는 zip과 tar.gz를 모두 푼다
  const tar = process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:/Windows', 'System32', 'tar.exe') : 'tar'
  execFileSync(tar, ['-xf', file, '-C', join(tmp, 'x')])
  const src = join(tmp, 'x', target.dir)
  rmSync(OUT, { recursive: true, force: true })
  mkdirSync(OUT, { recursive: true })
  const files = readdirSync(src).filter((f) => target.keep(f, lstatSync(join(src, f)).isSymbolicLink()))
  for (const f of files) {
    copyFileSync(join(src, f), join(OUT, f))
    if (process.platform !== 'win32') chmodSync(join(OUT, f), 0o755)
  }
  writeFileSync(join(OUT, 'LICENSE-llama.cpp'), await get(LICENSE))
  writeFileSync(STAMP, stamp + '\n')
  console.log(`fetch-llama: ${files.length}개 파일 → src-tauri/llama/`)
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
