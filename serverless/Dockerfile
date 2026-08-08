# FreeSurf Calorie Tracker — vision model for RunPod Serverless
# CUDA 12.4, Llama 3.2 Vision 11B (~25GB model, downloaded on first cold start)
# Model caches on worker's local disk for the life of that worker.
# Keep >=1 worker always warm in RunPod to avoid repeated downloads.
FROM nvidia/cuda:12.4.0-runtime-ubuntu22.04

ENV HF_HUB_ENABLE_HF_TRANSFER=0

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 python3.11-venv python3.11-dev python3-pip git git-lfs \
    && rm -rf /var/lib/apt/lists/*

RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1 \
    && python3 -m pip install --upgrade pip

RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124

RUN pip install transformers accelerate bitsandbytes pillow runpod huggingface_hub[hf_transfer]

COPY handler.py /handler.py

CMD ["python3", "-u", "/handler.py"]