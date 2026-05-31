"""
승객 sprite 14종 일괄 생성 (M1 Mac MPS).
SD 1.5 base + 강한 픽셀 키워드 프롬프트. LoRA 없이 시작 (HuggingFace 인증 부담 X).

사용:
  .venv/bin/python scripts/generate_passengers.py

결과: public/sprites/passenger-*.png (14개)
"""
import os
import sys
import time
import torch
from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler

OUT_DIR = "public/sprites"
os.makedirs(OUT_DIR, exist_ok=True)

# 14종 승객 — game 톤 기준 영어 프롬프트
BASE_TONE = (
    "pixel art, 16-bit RPG sprite, single character, full body front view, "
    "simple flat shading, dark pixel outline, low resolution, retro game asset, "
    "transparent isolated background, ENDESGA-16 palette feel, "
)

PROMPTS = {
    "passenger-normal":      "casual office worker, plain white shirt, neutral standing pose, ordinary person",
    "passenger-vip":         "vip businessman, golden suit accent, confident posture, slight smirk, premium",
    "passenger-elderly":     "elderly character with cane, gray hair, hunched posture, purple cardigan",
    "passenger-suit":        "businessman in blue suit and tie, holding small briefcase, sharp posture, hurried",
    "passenger-group":       "three friends standing tightly together, orange shirts, casual chatty pose",
    "passenger-baggage":     "character carrying large brown suitcase, brown coat, wide silhouette",
    "passenger-shady":       "suspicious character in dark hoodie up, dark red tones, shifty pose",
    "passenger-tourist":     "tourist with camera around neck, green shirt, yellow sun hat, cheerful smile",
    "passenger-staff":       "maintenance staff in gray work uniform, name tag, neutral pose, modest",
    "passenger-thief":       "sneaky thief character, black hoodie with red mask, crouching low, sideways eyes",
    "passenger-patient":     "hospital patient in light pink gown, IV pole, weak slouched posture, pale palette",
    "passenger-medical":     "doctor in white coat with red cross, stethoscope, calm professional pose",
    "passenger-hotel-guest": "hotel guest with rolling suitcase, beige coat, comfortable travel look",
    "passenger-crew":        "airline crew, navy blue uniform with scarf, professional flight attendant pose",
}

NEGATIVE = (
    "realistic, photo, 3d render, blurry, anti-aliasing, soft edges, smooth gradient, "
    "high detail, noisy, multiple characters, crowd, text, watermark, signature, "
    "cropped, deformed, ugly, low quality"
)

SEED = 12345
STEPS = 25
GUIDANCE = 7.5
SIZE = 512

def main():
    print("[1/3] Loading SD 1.5 ...")
    t0 = time.time()
    pipe = StableDiffusionPipeline.from_pretrained(
        "runwayml/stable-diffusion-v1-5",
        torch_dtype=torch.float32,  # MPS 안전 (fp16 는 일부 op 미지원)
        safety_checker=None,
        requires_safety_checker=False,
    )
    # M1 16GB 메모리 최적화
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)
    pipe = pipe.to("mps")
    pipe.enable_attention_slicing()
    print(f"   loaded in {time.time() - t0:.1f}s")

    print(f"[2/3] Generating {len(PROMPTS)} passengers ...")
    for i, (key, suffix) in enumerate(PROMPTS.items(), 1):
        full_prompt = BASE_TONE + suffix
        out_path = os.path.join(OUT_DIR, f"{key}.png")
        t0 = time.time()
        gen = torch.Generator(device="mps").manual_seed(SEED + i)  # 키별로 시드 약간 다르게
        img = pipe(
            prompt=full_prompt,
            negative_prompt=NEGATIVE,
            num_inference_steps=STEPS,
            guidance_scale=GUIDANCE,
            width=SIZE,
            height=SIZE,
            generator=gen,
        ).images[0]
        img.save(out_path)
        print(f"   [{i:2d}/{len(PROMPTS)}] {key} ({time.time() - t0:.1f}s)")

    print(f"[3/3] Done. Files saved to {OUT_DIR}/")

if __name__ == "__main__":
    main()
