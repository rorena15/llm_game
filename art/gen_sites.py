# 사이트 사진 후보 (뉴스, CorpX, 학교, 골프장): SDXL base 1.0 + SDXL-Lightning 8단계 LoRA, 그림마다 4장, 번호판 한 장
# 실행: <stigma-train>/.venv/Scripts/python.exe gen_sites.py <출력 폴더>
import os, sys, time
import torch
from diffusers import AutoencoderKL, EulerDiscreteScheduler, StableDiffusionXLPipeline
from huggingface_hub import hf_hub_download
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1]
PER = 4
os.makedirs(OUT, exist_ok=True)

NEWS = ', documentary news photograph, realistic, natural colors, no text, no letters, no logos, no signage, no watermark'
CORP = ', corporate website hero photograph, bright, clean, realistic, no text, no letters, no logos, no watermark'
WIDE = (1216, 832)
HERO = (1344, 768)

# (저장 경로 = 페이지 주소/이름, 크기, 프롬프트)
ITEMS = [
    ('bizdaily.co.kr/news/1118-02/photo', WIDE, 'officials in dark business suits walking through a modern office building lobby carrying document boxes, seen from behind' + NEWS),
    ('bizdaily.co.kr/news/1119-01/photo', WIDE, 'a press conference room with an empty podium and microphones, reporters with cameras in the foreground out of focus' + NEWS),
    ('bizdaily.co.kr/news/1021-01/photo', WIDE, 'close-up of a hand tapping a credit card on a payment terminal at a small cafe counter' + NEWS),
    ('bizdaily.co.kr/news/1120-01/photo', WIDE, 'workers in a small factory office looking at a tablet together, machines in the background' + NEWS),
    ('bizdaily.co.kr/news/1119-03/photo', WIDE, 'glass office towers along a wide boulevard in gangnam seoul, daytime, wide shot from street level' + NEWS),
    ('bizdaily.co.kr/news/1120-04/photo', WIDE, 'office workers clinking glasses over a table at a korean restaurant year-end dinner, faces blurred, warm light' + NEWS),
    ('bizdaily.co.kr/news/1121-02/photo', WIDE, 'empty golf course fairway in early winter, frost on the grass, morning mist, bare trees' + NEWS),
    ('bizdaily.co.kr/news/1121-05/photo', WIDE, 'elementary school children raising hands in a bright classroom, seen from behind, teacher at the front' + NEWS),
    ('bizdaily.co.kr/news/1118-05/photo', WIDE, 'several dogs playing in a bright pet cafe while owners sit at tables, wide shot' + NEWS),
    ('technow.kr/article/3381/photo', WIDE, 'laptop on an office desk with a blurry chat application window, a smartphone beside it, coffee cup' + NEWS),
    ('technow.kr/article/3402/photo', WIDE, 'hands holding a smartphone in a dark room, screen glow on the fingers, worried mood' + NEWS),
    ('technow.kr/article/3410/photo', WIDE, 'empty open-plan office with rows of desks in the evening, one person working far away, moody light' + NEWS),
    ('technow.kr/article/3415/photo', WIDE, 'software developers seen from behind watching monitors with graphs late at night, tense atmosphere' + NEWS),
    ('technow.kr/article/3419/photo', WIDE, 'close-up of a businessperson hands approving something on a smartphone in the back seat of a taxi' + NEWS),
    ('corpx.com/slide1', HERO, 'modern bright open office, a team collaborating around a large wall screen, wide shot' + CORP),
    ('corpx.com/slide2', HERO, 'close-up of a card payment terminal at a busy store checkout, blurred shoppers in the background' + CORP),
    ('corpx.com/slide3', HERO, 'young professionals walking into a modern glass office building lobby in the morning, wide shot' + CORP),
    ('corpx.com/news1', WIDE, 'office staff applauding and celebrating in a bright office, a few paper confetti in the air' + CORP),
    ('corpx.com/news2', WIDE, 'new employees in business attire seated in rows in a conference room orientation, seen from behind' + CORP),
    ('corpx.com/news3', WIDE, 'close-up of a smartphone showing colorful chat bubbles without readable text, office in the background' + CORP),
    ('hanbit-es.kr/news/photo', WIDE, 'elementary school english speech contest on a small auditorium stage, a child at a microphone seen from behind, parents in the audience' + NEWS),
    ('greenhill-cc.com/record/course', WIDE, 'green golf course fairway and green with a flag, autumn trees, clear sky, wide landscape' + NEWS),
    ('greenhill-cc.com/record/club', WIDE, 'golf clubhouse terrace with chairs overlooking the course, autumn afternoon' + NEWS),
]

vae = AutoencoderKL.from_pretrained('madebyollin/sdxl-vae-fp16-fix', torch_dtype=torch.float16)
pipe = StableDiffusionXLPipeline.from_pretrained(
    'stabilityai/stable-diffusion-xl-base-1.0', vae=vae, torch_dtype=torch.float16, variant='fp16'
).to('cuda')
pipe.load_lora_weights(hf_hub_download('ByteDance/SDXL-Lightning', 'sdxl_lightning_8step_lora.safetensors'))
pipe.fuse_lora()
pipe.scheduler = EulerDiscreteScheduler.from_config(pipe.scheduler.config, timestep_spacing='trailing')

t0 = time.time()
n = 0
for r, (key, (w, h), prompt) in enumerate(ITEMS):
    for k in range(PER):
        path = f'{OUT}/{r + 1:02d}_{k + 1}.png'
        if os.path.exists(path):
            continue
        g = torch.Generator('cuda').manual_seed(2000 + r * 13 + k * 97)
        pipe(prompt, num_inference_steps=8, guidance_scale=0, width=w, height=h, generator=g).images[0].save(path)
        n += 1
        print(f'{n} {key} {k + 1} {time.time() - t0:.0f}s', flush=True)

# 번호판: 줄마다 그림 하나, 후보 4장 (A~D)
TW, TH = 300, 180
sheet = Image.new('RGB', (330 + TW * PER, TH * len(ITEMS)), (24, 24, 28))
d = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype('malgun.ttf', 18)
except OSError:
    font = ImageFont.load_default()
for r, (key, _, _) in enumerate(ITEMS):
    d.text((10, r * TH + TH // 2 - 10), f'{r + 1}. {key}', fill=(230, 230, 230), font=font)
    for k in range(PER):
        im = Image.open(f'{OUT}/{r + 1:02d}_{k + 1}.png').resize((TW, TH))
        sheet.paste(im, (330 + k * TW, r * TH))
        d.text((330 + k * TW + 8, r * TH + 6), chr(65 + k), fill=(255, 230, 0), font=font)
sheet.save(f'{OUT}/_sheet.jpg', quality=85)
print('sheet', f'{time.time() - t0:.0f}s', flush=True)
