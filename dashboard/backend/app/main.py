"""
NeuroSeg 3D - FastAPI Backend Application
Loads Adaptive Self-Distillation checkpoint once at startup and serves inference API.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.services.inference_service import InferenceService


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load the model checkpoint once into memory
    InferenceService.initialize()
    yield
    # Shutdown logic if needed


app = FastAPI(
    title="NeuroSeg 3D API",
    description="Backend API for NeuroSeg 3D - Adaptive Self-Distillation 3D Brain Tumor Segmentation",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS to allow frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(router)


@app.get("/")
def root():
    return {
        "name": "NeuroSeg 3D API",
        "status": "online",
        "model_ready": InferenceService.is_ready(),
        "health_check": "/api/health",
        "docs": "/docs"
    }
