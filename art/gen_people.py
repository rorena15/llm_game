# 사람이 나오는 사진 다시 뽑기: SDXL base 1.0 원래 방식(30단계, guidance 6), 빠른 LoRA 없이. 얼굴·손 표현이 낫다 (2026-10-17 사용자 결정)
# 실행: <stigma-train>/.venv/Scripts/python.exe gen_people.py <출력 폴더>
import os, sys, time
import torch
from diffusers import AutoencoderKL, StableDiffusionXLPipeline
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1]
PER = 4
STEPS = 30
os.makedirs(OUT, exist_ok=True)
PHOTO = ', DSLR photograph, realistic, natural colors, detailed natural faces and hands'
NEG = 'illustration, painting, drawing, cartoon, deformed, disfigured face, extra fingers, extra limbs, bad hands, text, letters, logo, watermark'
WIDE = (1216, 832)
SQUARE = (1024, 1024)

ITEMS = [
    ('instargram.com/dev_jihyun/h1', SQUARE, 'inside a crowded seoul subway car during morning rush hour, commuters holding handles, candid smartphone photo' + PHOTO),
    ('bizdaily.co.kr/news/1120-04/photo', WIDE, 'office workers clinking glasses over a table at a korean restaurant year-end dinner, warm light' + PHOTO),
    ('bizdaily.co.kr/news/1121-05/photo', WIDE, 'korean elementary school children raising hands in a bright classroom, teacher at the front' + PHOTO),
    ('corpx.com/news1', WIDE, 'office staff applauding and celebrating in a bright modern office, a few paper confetti in the air' + PHOTO),
    ('hanbit-es.kr/news/photo', WIDE, 'a korean elementary school girl speaking into a microphone on a small school stage, classmates sitting on the gym floor watching' + PHOTO),
]

vae = AutoencoderKL.from_pretrained('madebyollin/sdxl-vae-fp16-fix', torch_dtype=torch.float16)
pipe = StableDiffusionXLPipeline.from_pretrained(
    'stabilityai/stable-diffusion-xl-base-1.0', vae=vae, torch_dtype=torch.float16, variant='fp16'
).to('cuda')

t0 = time.time()
n = 0
for r, (key, (w, h), prompt) in enumerate(ITEMS):
    for k in range(PER):
        path = f'{OUT}/{r + 1:02d}_{k + 1}.png'
        if os.path.exists(path):
            continue
        g = torch.Generator('cuda').manual_seed(4000 + r * 13 + k * 97)
        pipe(prompt, negative_prompt=NEG, num_inference_steps=STEPS, guidance_scale=6.0, width=w, height=h, generator=g).images[0].save(path)
        n += 1
        print(f'{n} {key} {k + 1} {time.time() - t0:.0f}s', flush=True)

TW, TH = 360, 246
sheet = Image.new('RGB', (360 + TW * PER, TH * len(ITEMS)), (24, 24, 28))
d = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype('malgun.ttf', 18)
except OSError:
    font = ImageFont.load_default()
for r, (key, _, _) in enumerate(ITEMS):
    d.text((10, r * TH + TH // 2 - 10), f'{r + 1}. {key}', fill=(230, 230, 230), font=font)
    for k in range(PER):
        im = Image.open(f'{OUT}/{r + 1:02d}_{k + 1}.png')
        im.thumbnail((TW, TH))
        sheet.paste(im, (360 + k * TW, r * TH))
        d.text((360 + k * TW + 8, r * TH + 6), chr(65 + k), fill=(255, 230, 0), font=font)
sheet.save(f'{OUT}/_sheet.jpg', quality=88)
print('sheet', f'{time.time() - t0:.0f}s', flush=True)
