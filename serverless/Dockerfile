# FreeSurf Calorie Tracker — vision model for RunPod Serverless
# Multi-stage build: download model separately, mount as volume at runtime.
# Final image is ~5GB (runtime deps only), model lives on host volume.

# Stage 1: Model downloader (run once to populate your local volume)
FROM nvidia/cuda:12.4.0-runtime-ubuntu22.04 AS downloader

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 python3.11-venv python3-pip git git-lfs \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m pip install --upgrade pip && \
    pip install huggingface_hub[hf_transfer]

RUN --mount=type=secret,id=hf_token \
    python3 -c "from huggingface_hub import snapshot_download; token = open('/run/secrets/hf_token').read().strip(); snapshot_download('meta-llama/Llama-3.2-11B-Vision-Instruct', token=token, cache_dir='/models/hub')"

# Stage 2: Runtime — ~5GB, no model baked in
FROM nvidia/cuda:12.4.0-runtime-ubuntu22.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 python3.11-venv python3.11-dev python3-pip \
    && rm -rf /var/lib/apt/lists/*

RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1 \
    && python3 -m pip install --upgrade pip

RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124

RUN pip install transformers accelerate bitsandbytes pillow runpod json-repair flash-attn --no-build-isolation

COPY handler.py /handler.py

ENV HF_HOME=/models

CMD ["python3", "-u", "/handler.py"]
