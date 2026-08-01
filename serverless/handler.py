"""
RunPod Serverless handler for FreeSurf Calorie Tracker.
Vision LLM identifies food from photos and estimates macros.

Model: Llama 3.2 Vision 11B (4-bit quantized, ~7GB VRAM)
GPU:  L4 or A5000 (24GB)

Input:  { "input": { "image_base64": "..." } }
Output: { "items": [{ "name": "...", "calories": 300, "protein": 25, "carbs": 30, "fat": 12 }] }
"""
print("BOOT: handler.py starting", flush=True)

import base64
import io
import traceback
import sys
import runpod

try:
    import torch
    from PIL import Image
    from transformers import MllamaForConditionalGeneration, AutoProcessor

    print(f"CUDA available: {torch.cuda.is_available()}", flush=True)
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}", flush=True)
        print(f"VRAM: {torch.cuda.get_device_properties(0).total_mem / 1024**3:.0f}GB", flush=True)
    print("All imports OK", flush=True)
except Exception:
    traceback.print_exc()
    sys.stderr.flush()
    raise

MODEL_ID = "meta-llama/Llama-3.2-11B-Vision-Instruct"

_model = None
_processor = None

SYSTEM_PROMPT = """You are a nutritionist. Analyze the food in this photo and return ONLY a JSON array. No explanations, no extra text.

Each item must have:
- name: short food name (e.g., "Cheeseburger")
- qty: estimated quantity (e.g., "1", "2 slices", "12oz", "1 cup")
- calories: integer estimate for the estimated quantity
- protein: grams for the estimated quantity (integer)
- carbs: grams for the estimated quantity (integer)
- fat: grams for the estimated quantity (integer)

If you can't identify a food, make your best guess. Return valid JSON only.

Example: [{"name":"Caesar salad","qty":"1 bowl","calories":350,"protein":20,"carbs":15,"fat":25},{"name":"Garlic bread","qty":"2 slices","calories":180,"protein":5,"carbs":22,"fat":8}]"""


def get_model():
    global _model, _processor
    if _model is None:
        print(f"Loading {MODEL_ID}...", flush=True)
        _model = MllamaForConditionalGeneration.from_pretrained(
            MODEL_ID,
            torch_dtype=torch.bfloat16,
            device_map="auto",
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.bfloat16,
        )
        _processor = AutoProcessor.from_pretrained(MODEL_ID)
        print("Model loaded", flush=True)
    return _model, _processor


def handler(event):
    job_input = event.get("input", {})
    image_base64 = job_input.get("image_base64", "")

    if not image_base64:
        return {"error": "No image_base64 provided"}

    try:
        image_bytes = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        model, processor = get_model()

        messages = [
            {"role": "user", "content": [
                {"type": "image"},
                {"type": "text", "text": SYSTEM_PROMPT},
            ]},
        ]

        text = processor.apply_chat_template(messages, add_generation_prompt=True)
        inputs = processor(image, text, return_tensors="pt").to(model.device)

        output = model.generate(**inputs, max_new_tokens=1024, temperature=0.3)
        response = processor.decode(output[0], skip_special_tokens=True)

        # Extract JSON from response
        import re
        json_match = re.search(r'\[.*\]', response.replace("\n", ""), re.DOTALL)
        if json_match:
            import json
            items = json.loads(json_match.group(0))
            return {"items": items}

        return {"error": "Could not parse food items from model response", "raw": response[:500]}

    except Exception:
        return {"error": traceback.format_exc()}


if __name__ == "__main__":
    try:
        print("Pre-warming model...", flush=True)
        get_model()
        print("Model ready!", flush=True)
        runpod.serverless.start({"handler": handler})
    except Exception:
        traceback.print_exc()
        sys.stderr.flush()
        raise
