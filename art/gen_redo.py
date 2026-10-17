# gen_sites.py에서 덜 자연스러웠던 사진 다시 뽑기 (2026-10-17). 같은 모델·설정, 프롬프트만 바꿈
# 실행: <stigma-train>/.venv/Scripts/python.exe gen_redo.py <출력 폴더>
import os, sys, time
import torch
from diffusers import AutoencoderKL, EulerDiscreteScheduler, StableDiffusionXLPipeline
from huggingface_hub import hf_hub_download
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1]
PER = 4
os.makedirs(OUT, exist_ok=True)
PHOTO = ', photojournalism, DSLR photograph, sharp focus, realistic, natural colors, no text, no letters, no logos, no watermark'
WIDE = (1216, 832)

ITEMS = [
    ('bizdaily.co.kr/news/1119-01/photo', 'a central bank governor in a dark suit speaking at a podium in a press conference room, two photographers with cameras in the blurred foreground, wide shot' + PHOTO),
    ('bizdaily.co.kr/news/1121-02/photo', 'golf course in early winter, a flagstick on a frosty putting green in the foreground, fairway and sand bunkers behind, light morning mist' + PHOTO),
    ('bizdaily.co.kr/news/1118-05/photo', 'close-up of a corgi and a white poodle playing together on the floor of a bright pet cafe, tables and owners legs in the background' + PHOTO),
    ('hanbit-es.kr/news/photo', 'a korean elementary school girl speaking into a microphone on a small school stage, seen from the side, classmates sitting on the floor watching, school gym, photograph not illustration' + PHOTO),
]

vae = AutoencoderKL.from_pretrained('madebyollin/sdxl-vae-fp16-fix', torch_dtype=torch.float16)
pipe = StableDiffusionXLPipeline.from_pretrained(
    'stabilityai/stable-diffusion-xl-base-1.0', vae=vae, torch_dtype=torch.float16, variant='fp16'
).to('cuda')
pipe.load_lora_weights(hf_hub_download('ByteDance/SDXL-Lightning', 'sdxl_lightning_8step_lora.safetensors'))
pipe.fuse_lora()
pipe.scheduler = EulerDiscreteScheduler.from_config(pipe.scheduler.config, timestep_spacing='trailing')

t0 = time.time()
for r, (key, prompt) in enumerate(ITEMS):
    for k in range(PER):
        g = torch.Generator('cuda').manual_seed(3000 + r * 13 + k * 97)
        pipe(prompt, num_inference_steps=8, guidance_scale=0, width=WIDE[0], height=WIDE[1], generator=g).images[0].save(f'{OUT}/{r + 1:02d}_{k + 1}.png')
        print(f'{r * PER + k + 1} {key} {time.time() - t0:.0f}s', flush=True)

TW, TH = 360, 246
sheet = Image.new('RGB', (330 + TW * PER, TH * len(ITEMS)), (24, 24, 28))
d = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype('malgun.ttf', 18)
except OSError:
    font = ImageFont.load_default()
for r, (key, _) in enumerate(ITEMS):
    d.text((10, r * TH + TH // 2 - 10), f'{r + 1}. {key}', fill=(230, 230, 230), font=font)
    for k in range(PER):
        sheet.paste(Image.open(f'{OUT}/{r + 1:02d}_{k + 1}.png').resize((TW, TH)), (330 + k * TW, r * TH))
        d.text((330 + k * TW + 8, r * TH + 6), chr(65 + k), fill=(255, 230, 0), font=font)
sheet.save(f'{OUT}/_sheet.jpg', quality=88)
print('sheet', f'{time.time() - t0:.0f}s', flush=True)
