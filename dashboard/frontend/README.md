# NeuroSeg 3D — Frontend Dashboard

A medical AI web dashboard for 3D Brain Tumor Segmentation using the Adaptive Self-Distillation framework.

## Technology Stack

- **Framework**: React 18
- **Bundler & Tooling**: Vite 6
- **Styling**: Tailwind CSS (Medical Dark Theme)
- **Icons**: Lucide React
- **3D / Medical Visualization**: `@kitware/vtk.js` (WebGL-based Volume Rendering & Multi-Planar Slicing)

## Directory Structure

```
dashboard/frontend/
├── public/                 # Static assets & favicon
├── src/
│   ├── api/                # API client & segmentation endpoints
│   ├── assets/             # Graphics and media
│   ├── components/         # Reusable UI components
│   ├── hooks/              # Custom React hooks (e.g., useServerStatus)
│   ├── layouts/            # App shell with responsive sidebar
│   ├── pages/              # Overview, Upload, Viewer, Results, About
│   ├── types/              # Type definitions & constants
│   ├── utils/              # Mock demo data & helpers
│   ├── viewer/             # MedicalViewer VTK.js viewport
│   ├── App.jsx             # Main router
│   ├── index.css           # Global Tailwind directives
│   └── main.jsx            # React root
├── index.html              # HTML shell
├── package.json            # Dependencies & scripts
├── tailwind.config.js      # Medical color theme tokens
└── vite.config.js          # Vite build configuration
```

## Quick Start

### 1. Install Dependencies

```bash
cd dashboard/frontend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

`VITE_API_BASE_URL` points to the backend server (default: `http://localhost:8000`).

### 3. Run Development Server

```bash
npm run dev
```

The frontend will be available at: `http://localhost:3000`

### 4. Build Production Bundle

```bash
npm run build
```

## Future Model Integration Steps

1. In `src/api/segmentation.js`, the `runSegmentation()` method calls `POST /api/segment`.
2. When the backend model inference pipeline is activated, uploaded `.nii` / `.nii.gz` files will be passed directly to the MONAI sliding-window inference pipeline, streaming predicted labels back to the 3D viewer.
