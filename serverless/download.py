import os, sys, glob
from huggingface_hub import snapshot_download

model_id = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("MODEL_ID", "")
cache_dir = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("CACHE_DIR", "/models")
token = os.environ.get("HF_TOKEN")

print(f"Downloading {model_id} to {cache_dir}", flush=True)
print(f"HF_TOKEN {'set' if token else 'NOT SET'}", flush=True)

snapshot_download(
    model_id,
    token=token,
    cache_dir=cache_dir,
    ignore_patterns=["original/*", "*.pth"],
    tqdm_class=None,
)

print(f"Download complete: {model_id}", flush=True)

files = glob.glob(f"{cache_dir}/**", recursive=True)
print(f"Total files downloaded: {len(files)}", flush=True)
