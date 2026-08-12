"""
RunPod Serverless handler for FreeSurf Calorie Tracker.
Vision LLM identifies food from photos and estimates macros.
Llama 3.2 Vision 11B (4-bit quantized, ~6GB VRAM)
Model downloads on first cold start, cached on worker's local disk.
Keep >=1 worker always warm in RunPod to avoid cold start downloads.
"""
print("BOOT: handler.py starting", flush=True)

import base64
import io
import os
import re
import json
import time
import traceback
import sys
import runpod
from json_repair import repair_json

os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
os.environ.setdefault("HF_HUB_ENABLE_HF_TRANSFER", "1")

try:
    import torch
    from PIL import Image
    from transformers import MllamaForConditionalGeneration, AutoProcessor, BitsAndBytesConfig

    print(f"CUDA available: {torch.cuda.is_available()}", flush=True)
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}", flush=True)
        print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.0f}GB", flush=True)
    print("All imports OK", flush=True)
except Exception:
    traceback.print_exc()
    sys.stderr.flush()
    raise

MODEL_ID = "meta-llama/Llama-3.2-11B-Vision-Instruct"

_model = None
_processor = None

VISION_SYSTEM_PROMPT = """You are a nutrition database. Respond with ONLY a JSON array. No text before or after.

Format: [{"name":"food","amount":1,"unit":"whole","protein":30,"carbs":40,"fat":30}]

RULES:
- FIRST character must be [
- LAST character must be ]
- NO markdown, NO explanation, NO "Here is...", NO notes
- Units: whole (single items), cup, oz, g, tbsp, tsp, slice, piece, bowl
- Calories are NOT needed — they are calculated from macros"""

TEXT_SYSTEM_PROMPT = """You are a nutrition database. Respond with ONLY a JSON array. No text before or after.

Format: [{"name":"food","amount":1,"unit":"whole","protein":30,"carbs":40,"fat":30}]

RULES:
- FIRST character must be [
- LAST character must be ]
- NO markdown, NO explanation, NO "Here is...", NO notes
- Units: whole (single items), cup, oz, g, tbsp, tsp, slice, piece, bowl
- Calories are NOT needed — they are calculated from macros"""


def get_model():
    global _model, _processor
    if _model is None:
        t0 = time.time()
        hf_cache = os.path.expanduser("~/.cache/huggingface")
        repo_dir = os.path.join(hf_cache, "hub", "models--meta-llama--Llama-3.2-11B-Vision-Instruct")
        was_cached = os.path.isdir(repo_dir)
        print(f"Loading {MODEL_ID}... cached={was_cached}", flush=True)

        vram_gb = torch.cuda.get_device_properties(0).total_memory / 1024**3
        if vram_gb >= 40:
            print(f"VRAM {vram_gb:.0f}GB — loading in bfloat16 (no quantization needed)", flush=True)
            _model = MllamaForConditionalGeneration.from_pretrained(
                MODEL_ID,
                torch_dtype=torch.bfloat16,
                device_map="auto",
                attn_implementation="sdpa",
                token=os.environ.get("HF_TOKEN"),
            )
        else:
            print(f"VRAM {vram_gb:.0f}GB — using 4-bit quantization", flush=True)
            quant = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_compute_dtype=torch.bfloat16)
            _model = MllamaForConditionalGeneration.from_pretrained(
                MODEL_ID,
                quantization_config=quant,
                device_map="auto",
                attn_implementation="sdpa",
                token=os.environ.get("HF_TOKEN"),
            )
        _processor = AutoProcessor.from_pretrained(
            MODEL_ID,
            token=os.environ.get("HF_TOKEN"),
        )
        elapsed = time.time() - t0
        verb = "Loaded from cache" if was_cached else "Downloaded and loaded"
        print(f"{verb} in {elapsed:.0f}s", flush=True)
    return _model, _processor


def strip_markdown(text: str) -> str:
    """Remove markdown code fences and surrounding whitespace."""
    text = text.strip()
    text = re.sub(r'^```(?:json)?\s*\n?', '', text)
    text = re.sub(r'\n?```\s*$', '', text)
    return text.strip()


def _repair_with_lib(text: str):
    """Use json_repair to fix common LLM output errors."""
    text = strip_markdown(text)

    # Find array boundary — only repair the JSON portion
    start = text.find('[')
    if start == -1:
        start = text.find('{')
    if start == -1:
        return None
    end = text.rfind(']')
    if end == -1:
        end = text.rfind('}')
    if end == -1:
        return None

    candidate = text[start:end + 1]
    try:
        repaired = repair_json(candidate)
        parsed = json.loads(repaired)
        return parsed if isinstance(parsed, list) else [parsed]
    except Exception:
        return None


def parse_response(text: str):
    """Try multiple strategies to extract JSON from LLM output."""
    text = strip_markdown(text)

    strategies = [
        # 0: json_repair lib — fixes missing quotes, unquoted keys, trailing commas, broken brackets, etc.
        lambda t: _repair_with_lib(t),
        # 1: Look for [{...}] with balanced braces
        lambda t: _extract_balanced_array(t),
        # 2: Any [ followed by { up to the last }
        lambda t: re.search(r'\[\s*\{.*\}\s*\]', t, re.DOTALL),
        # 3: Try to repair missing } before ] — insert } then parse
        lambda t: _extract_balanced_array(t, repair=True),
        # 4: Repair garbled ["{", pattern — model sometimes inserts "{ as a string element
        lambda t: _repair_garbled(t),
        # 5: Fallback: parse markdown-style nutrition lists (model ignores JSON instruction)
        lambda t: _parse_markdown_nutrition(t),
        # 6: Any [...] non-greedy
        lambda t: re.search(r'\[.*?\]', t, re.DOTALL),
        # 7: Raw text as JSON
        lambda t: _try_raw_json(t),
    ]

    for strategy in strategies:
        result = strategy(text)
        if result is None:
            continue
        if isinstance(result, list):
            return _calc_calories(result)
        if hasattr(result, 'group'):
            try:
                parsed = json.loads(result.group(0))
                parsed = parsed if isinstance(parsed, list) else [parsed]
                return _calc_calories(parsed)
            except Exception:
                pass

    return None


def _calc_calories(items):
    for item in items:
        p = float(item.get("protein", 0) or 0)
        c = float(item.get("carbs", 0) or 0)
        f = float(item.get("fat", 0) or 0)
        item["calories"] = round(p * 4 + c * 4 + f * 9)
    return items


def _extract_balanced_array(text: str, repair: bool = False):
    """Extract JSON array by tracking brace depth. If repair=True, try inserting missing } before ]."""
    start = text.find('[')
    if start == -1:
        return None
    depth = 0
    for i, ch in enumerate(text[start:], start):
        if ch == '[':
            depth += 1
        elif ch == ']':
            depth -= 1
            if depth == 0:
                candidate = text[start:i + 1]
                try:
                    parsed = json.loads(candidate)
                    return parsed if isinstance(parsed, list) else [parsed]
                except Exception:
                    if repair:
                        repaired = candidate[:-1] + "}" + candidate[-1]
                        try:
                            parsed = json.loads(repaired)
                            return parsed if isinstance(parsed, list) else [parsed]
                        except Exception:
                            pass
                    return None
    return None


def _repair_garbled(text: str):
    """Handle malformed output like ["{","name":"Rice",...] — remove the stray "{" entry."""
    # Find array candidate like _extract_balanced_array but with extra repair
    start = text.find('[')
    if start == -1:
        return None
    depth = 0
    for i, ch in enumerate(text[start:], start):
        if ch == '[':
            depth += 1
        elif ch == ']':
            depth -= 1
            if depth == 0:
                candidate = text[start:i + 1]
                try:
                    return json.loads(candidate)
                except Exception:
                    pass
                if candidate.startswith('["{",') or candidate.startswith('["{", '):
                    inner = candidate[4:].strip().lstrip(",").strip()
                    reconstructed = "[{" + inner[:-1] + "}]"
                    try:
                        parsed = json.loads(reconstructed)
                        return parsed if isinstance(parsed, list) else [parsed]
                    except Exception:
                        pass
                return None
    return None


def _parse_markdown_nutrition(text: str):
    """Fallback: extract nutrition from markdown lists when model ignores JSON prompt.
    Handles patterns like:
      * Lay's Classic potato chips:
        + Calories: 60 per serving (1 ounce)
        + Total fat: 3.5g
        * Carbohydrates: 15g
    """
    items = []
    food_pattern = re.compile(r'[\*\-\+]\s*(.+?)\s*:?\s*$')
    macro_pattern = re.compile(r'(?:Calories?|Protein|Carb(?:ohydrate)?s?|Fat|Total fat)[:\s]*([\d.]+)\s*(?:g|grams?)?', re.IGNORECASE)

    lines = text.split('\n')
    current = None
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        food_match = food_pattern.match(stripped)
        if food_match and not any(kw in stripped.lower() for kw in ['calories', 'protein', 'carb', 'fat', 'total']):
            if current and current.get('name'):
                _fill_macros_from_text(current, '\n'.join(current.pop('_raw', [])))
                items.append(current)
            current = {'name': food_match.group(1).strip(), '_raw': []}
            continue
        if current:
            current.setdefault('_raw', []).append(stripped)

    if current and current.get('name'):
        _fill_macros_from_text(current, '\n'.join(current.pop('_raw', [])))
        items.append(current)

    return items if items else None


def _fill_macros_from_text(item, text):
    macro_pattern = re.compile(r'Calories?[:\s]*([\d.]+)', re.IGNORECASE)
    protein_pattern = re.compile(r'Protein[:\s]*([\d.]+)', re.IGNORECASE)
    carbs_pattern = re.compile(r'Carb(?:ohydrate)?s?[:\s]*([\d.]+)', re.IGNORECASE)
    fat_pattern = re.compile(r'(?:Total )?Fat[:\s]*([\d.]+)', re.IGNORECASE)

    for pattern, key in [(protein_pattern, 'protein'), (carbs_pattern, 'carbs'), (fat_pattern, 'fat')]:
        m = pattern.search(text)
        if m:
            try:
                item[key] = round(float(m.group(1)) * 10) / 10
            except ValueError:
                pass

    if not item.get('protein') and not item.get('carbs') and not item.get('fat'):
        return

    item.setdefault('protein', 0)
    item.setdefault('carbs', 0)
    item.setdefault('fat', 0)
    item['amount'] = 1
    item['unit'] = 'whole'


def _try_raw_json(text: str):
    """Try parsing raw text as JSON."""
    try:
        result = json.loads(text)
        return result if isinstance(result, list) else [result]
    except Exception:
        return None


def handler(event):
    job_input = event.get("input", {})
    image_base64 = job_input.get("image_base64", "")
    food_description = job_input.get("food_description", "")

    if not image_base64 and not food_description:
        return {"error": "No image_base64 or food_description provided"}

    try:
        model, processor = get_model()

        if image_base64:
            image_bytes = base64.b64decode(image_base64)
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            messages = [
                {"role": "system", "content": VISION_SYSTEM_PROMPT},
                {"role": "user", "content": [
                    {"type": "image"},
                    {"type": "text", "text": "What are the nutrition facts for each food in this photo?"},
                ]},
            ]
            text = processor.apply_chat_template(messages, add_generation_prompt=True)
            inputs = processor(image, text, return_tensors="pt").to(model.device)
        else:
            messages = [
                {"role": "system", "content": TEXT_SYSTEM_PROMPT},
                {"role": "user", "content": [
                    {"type": "text", "text": food_description},
                ]},
            ]
            text = processor.apply_chat_template(messages, add_generation_prompt=True)
            inputs = processor(text=text, return_tensors="pt").to(model.device)

        output = model.generate(**inputs, max_new_tokens=400, temperature=0.2, do_sample=True)
        response = processor.decode(output[0], skip_special_tokens=True)

        # Llama 3.2 uses: <|start_header_id|>assistant<|end_header_id|>
        # Strip the full prompt, keep only assistant output
        assistant_part = response
        for delimiter in ["<|start_header_id|>assistant<|end_header_id|>", "assistant\n", "assistant"]:
            if delimiter in response:
                parts = response.split(delimiter)
                assistant_part = parts[-1].strip()
                if assistant_part.startswith("\n"):
                    assistant_part = assistant_part[1:]
                break

        print(f"[LLM] Raw: {response[:500]}", flush=True)

        items = parse_response(assistant_part)
        if items:
            return {"items": items}

        print(f"[LLM] Failed to parse. Cleaned text: {strip_markdown(assistant_part)[:500]}", flush=True)
        return {"error": "Model did not return valid JSON", "raw": response[:500]}

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