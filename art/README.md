# 사이트 사진 출처

게임 속 웹사이트 사진(`app/src/assets/sites/`)은 모두 이 저장소에서 직접 생성한 그림입니다. 외부 사진이나 스톡 이미지는 쓰지 않습니다.

## 생성 도구

- 모델: Stable Diffusion XL base 1.0 (`stabilityai/stable-diffusion-xl-base-1.0`), CreativeML Open RAIL++-M
- 빠른 생성: SDXL-Lightning 8단계 LoRA (`ByteDance/SDXL-Lightning`, `sdxl_lightning_8step_lora.safetensors`), OpenRAIL++
- VAE: `madebyollin/sdxl-vae-fp16-fix`
- 설정: 1024×1024, 8단계, guidance 0, Euler(trailing). 그림마다 후보 4장을 만들고 사용자가 한 장을 골랐습니다
- 게임에는 512×512 webp(품질 80)로 줄여 넣습니다

## 그림 목록

| 파일 | 스크립트 | 고른 후보 |
|---|---|---|
| `instargram.com/dev_jihyun/` profile, p1~p8, h1~h3 | `gen_sns.py` (프롬프트와 시드가 스크립트에 있습니다) | profile A, p1 C, p2 D, p3 D, p4 C, p5 D, p6 C, p7 D, p8 B, h1 D, h2 C, h3 A |

다시 만들려면 `E:/Git_Project/stigma-train/.venv`의 파이썬으로 `python gen_sns.py <출력 폴더>`를 실행합니다. 고른 후보는 위 표의 글자(A=1번 시드)입니다.
