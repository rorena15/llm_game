# 인스타 그림 후보: SDXL base 1.0 + SDXL-Lightning 8단계 LoRA, 그림마다 4장, 번호판 한 장
import os, sys, time
import torch
from diffusers import EulerDiscreteScheduler, StableDiffusionXLPipeline, AutoencoderKL
from huggingface_hub import hf_hub_download
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1]
PER = 4
SIZE = 1024
os.makedirs(OUT, exist_ok=True)

STYLE = ', candid smartphone photo posted on instagram, natural light, realistic, shallow depth of field, no text, no letters, no watermark'
DOG = 'a golden retriever wearing a red collar'
ITEMS = [
    ('profile', f'close-up selfie of a young korean woman hugging {DOG}, her face mostly hidden behind the dog head, cozy apartment'),
    ('p1_deploy', 'developer desk at night after work, two monitors with blurry colorful code, small dog figurine next to the keyboard, warm desk lamp'),
    ('p2_birthday', f'{DOG} wearing a tiny party hat, a small dog birthday cake on the floor, a few balloons, living room'),
    ('p3_ramen', 'cup ramen with steam and chopsticks on a convenience store window counter at night, city lights outside'),
    ('p4_ball', f'{DOG} running toward the camera with a tennis ball in its mouth on green grass in a city park'),
    ('p5_bbq', 'korean barbecue grill with sizzling pork belly and many small side dishes, team dinner table, warm light, close-up'),
    ('p6_picnic', f'{DOG} lying on a picnic blanket by the Han River in Seoul, sandwiches, windy sunny day, bridge in the background'),
    ('p7_latte', 'latte art in a white ceramic cup on a wooden table in a minimalist cafe, morning light, top view'),
    ('p8_groom', f'{DOG} freshly groomed with a round fluffy teddy bear cut, sitting proudly in a pet grooming salon'),
    ('h1_commute', 'inside a crowded seoul subway car during morning rush hour, blurred commuters holding handles, motion blur'),
    ('h2_puddle', f'{DOG} soaking wet and muddy after jumping in a rain puddle on a park path, funny expression'),
    ('h3_note', 'a yellow sticky note stuck on the edge of a computer monitor, scribbled illegible handwriting out of focus, office desk, close-up'),
]

base = 'stabilityai/stable-diffusion-xl-base-1.0'
vae = AutoencoderKL.from_pretrained('madebyollin/sdxl-vae-fp16-fix', torch_dtype=torch.float16)
pipe = StableDiffusionXLPipeline.from_pretrained(base, vae=vae, torch_dtype=torch.float16, variant='fp16').to('cuda')
pipe.load_lora_weights(hf_hub_download('ByteDance/SDXL-Lightning', 'sdxl_lightning_8step_lora.safetensors'))
pipe.fuse_lora()
pipe.scheduler = EulerDiscreteScheduler.from_config(pipe.scheduler.config, timestep_spacing='trailing')

t0 = time.time()
done = 0
for name, prompt in ITEMS:
    for k in range(PER):
        path = f'{OUT}/{name}_{k + 1}.png'
        if os.path.exists(path):
            continue
        g = torch.Generator('cuda').manual_seed(1000 + k * 97 + len(name))
        img = pipe(prompt + STYLE, num_inference_steps=8, guidance_scale=0, width=SIZE, height=SIZE, generator=g).images[0]
        img.save(path)
        done += 1
        print(f'{done} {name}_{k + 1} {time.time() - t0:.0f}s', flush=True)

# 번호판: 줄마다 그림 하나, 후보 4장
TH = 256
sheet = Image.new('RGB', (160 + TH * PER, TH * len(ITEMS)), (24, 24, 28))
d = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype('malgun.ttf', 22)
except OSError:
    font = ImageFont.load_default()
for r, (name, _) in enumerate(ITEMS):
    d.text((10, r * TH + TH // 2 - 12), f'{r + 1}. {name}', fill=(230, 230, 230), font=font)
    for k in range(PER):
        im = Image.open(f'{OUT}/{name}_{k + 1}.png').resize((TH, TH))
        sheet.paste(im, (160 + k * TH, r * TH))
        d.text((160 + k * TH + 8, r * TH + 6), chr(65 + k), fill=(255, 230, 0), font=font)
sheet.save(f'{OUT}/_sheet.jpg', quality=88)
print('sheet', f'{time.time() - t0:.0f}s', flush=True)
