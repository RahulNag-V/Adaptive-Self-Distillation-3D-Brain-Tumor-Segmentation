# Multi-stage lightweight Python 3.10 production image for NeuroSeg 3D Backend
FROM python:3.10-slim

# Prevent python from writing pyc files to disc and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Install system dependencies for medical image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirement specifications
COPY dashboard/backend/requirements.txt /app/backend-requirements.txt
COPY requirements.txt /app/root-requirements.txt

# Install PyTorch and scientific medical dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r /app/backend-requirements.txt && \
    pip install --no-cache-dir monai nibabel numpy scipy scikit-image einops pandas Pillow PyYAML matplotlib

# Copy backend code, models, configs, and assets
COPY dashboard/backend /app/dashboard/backend
COPY configs /app/configs
COPY checkpoints /app/checkpoints
COPY data /app/data
COPY src /app/src

WORKDIR /app/dashboard/backend

# Expose container port
EXPOSE 8000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Start Uvicorn using Cloud Run's dynamic $PORT environment variable
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}

