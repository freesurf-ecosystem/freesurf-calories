# FreeSurf Calorie Tracker — vision model for RunPod Serverless
# CUDA 12.4
FROM nvidia/cuda:12.4.0-runtime-ubuntu22.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 python3.11-venv python3.11-dev python3-pip git \
    && rm -rf /var/lib/apt/lists/*

RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1 \
    && python3 -m pip install --upgrade pip

RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124

RUN pip install transformers accelerate bitsandbytes pillow runpod

# Model downloads at first cold start (~11GB with 4-bit quant). Not baked into image.
# Use L4 (24GB) or A5000 (24GB) — T4 (16GB) is borderline.

COPY handler.py /handler.py

CMD ["python3", "-u", "/handler.py"]
