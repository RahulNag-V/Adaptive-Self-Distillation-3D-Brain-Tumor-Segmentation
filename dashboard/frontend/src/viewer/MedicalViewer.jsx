import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2,
  Sliders,
  Eye,
  Layers,
  Sparkles,
  Loader2,
  Play,
  Pause
} from 'lucide-react';
import { REGION_LEGEND } from '../utils/mockData';

export default function MedicalViewer({
  viewMode = '3d', // '3d' | 'axial' | 'coronal' | 'sagittal'
  axialSlice = 75,
  coronalSlice = 120,
  sagittalSlice = 120,
  layers = { mri: true, tumor: true, overlay: true },
  opacity = 0.75,
  subregions = { wt: true, tc: true, et: true },
  onResetView,
}) {
  const containerRef = useRef(null);
  const threeMountRef = useRef(null);
  const canvas2dRef = useRef(null);

  // Three.js instances ref
  const threeStateRef = useRef({
    renderer: null,
    scene: null,
    camera: null,
    controls: null,
    brainGroup: null,
    brainMaterials: [],
    tumorGroup: null,
    wtMesh: null,
    wtWireframe: null,
    tcMesh: null,
    etMesh: null,
    pulseTime: 0,
    animationFrameId: null,
  });

  const [modelLoading, setModelLoading] = useState(true);
  const [modelLoadError, setModelLoadError] = useState(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [fps, setFps] = useState(60);

  // Initialize Three.js 3D Scene for the Human Brain Model
  useEffect(() => {
    const mountEl = threeMountRef.current;
    if (!mountEl) return;

    const width = mountEl.clientWidth || 700;
    const height = mountEl.clientHeight || 550;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060A12); // Deep medical-darkest navy

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.6, 3.8);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mountEl.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.85;
    controls.zoomSpeed = 1.0;
    controls.panSpeed = 0.8;
    controls.minDistance = 1.2;
    controls.maxDistance = 8.0;
    controls.target.set(0, 0, 0);

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xf0f9ff, 2.2);
    keyLight.position.set(4, 5, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.3);
    fillLight.position.set(-4, 2, 3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x34d399, 1.8);
    rimLight.position.set(0, 4, -4);
    scene.add(rimLight);

    const bottomFill = new THREE.DirectionalLight(0x1e293b, 1.0);
    bottomFill.position.set(0, -4, 0);
    scene.add(bottomFill);

    // Subtle internal tumor glow light
    const tumorGlowLight = new THREE.PointLight(0x10b981, 2.0, 3.0);
    tumorGlowLight.position.set(0.42, 0.22, 0.28);
    scene.add(tumorGlowLight);

    // 6. Tumor 3D Segmented Geometry (WT, TC, ET)
    const tumorGroup = new THREE.Group();
    tumorGroup.position.set(0.42, 0.22, 0.28); // Anatomical right fronto-parietal region

    // Whole Tumor (WT - Emerald Green #10B981)
    const wtGeo = new THREE.SphereGeometry(0.38, 32, 32);
    // Add organic displacement to vertices
    const wtPos = wtGeo.attributes.position;
    for (let i = 0; i < wtPos.count; i++) {
      const u = wtPos.getX(i);
      const v = wtPos.getY(i);
      const w = wtPos.getZ(i);
      const factor = 1.0 + 0.12 * Math.sin(u * 8.0) * Math.cos(w * 8.0);
      wtPos.setXYZ(i, u * factor, v * (factor * 0.95), w * factor);
    }
    wtGeo.computeVertexNormals();

    const wtMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.62,
      roughness: 0.25,
      metalness: 0.1,
      emissive: 0x059669,
      emissiveIntensity: 0.35,
      depthWrite: false,
    });
    const wtMesh = new THREE.Mesh(wtGeo, wtMat);
    tumorGroup.add(wtMesh);

    // WT Boundary Wireframe Cage (Overlay Boundary)
    const wtWireGeo = new THREE.WireframeGeometry(wtGeo);
    const wtWireMat = new THREE.LineBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.45,
    });
    const wtWireframe = new THREE.LineSegments(wtWireGeo, wtWireMat);
    wtWireframe.scale.setScalar(1.02);
    tumorGroup.add(wtWireframe);

    // Tumor Core (TC - Amber #F59E0B)
    const tcGeo = new THREE.SphereGeometry(0.24, 28, 28);
    const tcMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.78,
      roughness: 0.3,
      metalness: 0.15,
      emissive: 0xd97706,
      emissiveIntensity: 0.45,
      depthWrite: false,
    });
    const tcMesh = new THREE.Mesh(tcGeo, tcMat);
    tcMesh.position.set(-0.02, 0.01, 0.02);
    tumorGroup.add(tcMesh);

    // Enhancing Tumor (ET - Crimson #EF4444)
    const etGeo = new THREE.SphereGeometry(0.14, 24, 24);
    const etMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.95,
      roughness: 0.2,
      metalness: 0.2,
      emissive: 0xdc2626,
      emissiveIntensity: 0.7,
      depthWrite: true,
    });
    const etMesh = new THREE.Mesh(etGeo, etMat);
    etMesh.position.set(-0.01, 0.03, 0.03);
    tumorGroup.add(etMesh);

    scene.add(tumorGroup);

    // 7. Load Human Brain 3D GLB Model
    const brainGroup = new THREE.Group();
    scene.add(brainGroup);
    const brainMaterials = [];

    setModelLoading(true);
    const loader = new GLTFLoader();
    loader.load(
      '/models/brain.glb',
      (gltf) => {
        const model = gltf.scene;

        // Auto-compute bounding box and normalize scale & center
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.5 / (maxDim || 1);

        model.scale.setScalar(scale);
        model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

        // Enhance materials for medical rendering & transparency
        model.traverse((child) => {
          if (child.isMesh && child.material) {
            const mat = child.material.clone();
            mat.transparent = true;
            mat.opacity = opacity;
            mat.roughness = Math.max(0.35, mat.roughness || 0.4);
            mat.metalness = Math.min(0.2, mat.metalness || 0.1);
            mat.depthWrite = opacity > 0.85;
            child.material = mat;
            brainMaterials.push(mat);
          }
        });

        brainGroup.add(model);
        setModelLoading(false);
      },
      undefined,
      (err) => {
        console.error('Error loading 3D brain model:', err);
        setModelLoadError(err.message || 'Failed to load /models/brain.glb');
        setModelLoading(false);
      }
    );

    // Save Three.js instances to state ref
    threeStateRef.current = {
      renderer,
      scene,
      camera,
      controls,
      brainGroup,
      brainMaterials,
      tumorGroup,
      wtMesh,
      wtWireframe,
      tcMesh,
      etMesh,
      pulseTime: 0,
      animationFrameId: null,
    };

    // 8. Animation & Render Loop
    let lastTime = performance.now();
    let frameCount = 0;
    let lastFpsUpdate = performance.now();

    const animate = (currentTime) => {
      threeStateRef.current.animationFrameId = requestAnimationFrame(animate);

      // FPS Calculation
      frameCount++;
      if (currentTime - lastFpsUpdate >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastFpsUpdate = currentTime;
      }

      // Smooth pulsing for 3D tumor segmentation
      threeStateRef.current.pulseTime += 0.03;
      const pulse = 1.0 + 0.03 * Math.sin(threeStateRef.current.pulseTime);
      if (threeStateRef.current.wtMesh) {
        threeStateRef.current.wtMesh.scale.setScalar(pulse);
      }
      if (threeStateRef.current.wtWireframe) {
        threeStateRef.current.wtWireframe.scale.setScalar(pulse * 1.02);
      }

      controls.update();
      renderer.render(scene, camera);
    };

    threeStateRef.current.animationFrameId = requestAnimationFrame(animate);

    // 9. Resize Handling via ResizeObserver
    const handleResize = () => {
      if (!mountEl || !renderer || !camera) return;
      const w = mountEl.clientWidth;
      const h = mountEl.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mountEl);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      if (threeStateRef.current.animationFrameId) {
        cancelAnimationFrame(threeStateRef.current.animationFrameId);
      }
      controls.dispose();
      renderer.dispose();
      if (mountEl && renderer.domElement && mountEl.contains(renderer.domElement)) {
        mountEl.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Brain Model Opacity & Visibility
  useEffect(() => {
    const { brainMaterials, brainGroup } = threeStateRef.current;
    if (brainGroup) {
      brainGroup.visible = layers.mri;
    }
    brainMaterials.forEach((mat) => {
      mat.opacity = layers.mri ? opacity : 0.0;
      mat.depthWrite = opacity > 0.85;
      mat.needsUpdate = true;
    });
  }, [layers.mri, opacity]);

  // Update 3D Tumor Segmentation Sub-regions & Visibility
  useEffect(() => {
    const { wtMesh, wtWireframe, tcMesh, etMesh, tumorGroup } = threeStateRef.current;
    if (!tumorGroup) return;

    const tumorVisible = layers.tumor || layers.overlay;
    tumorGroup.visible = tumorVisible;

    if (wtMesh) wtMesh.visible = tumorVisible && subregions.wt;
    if (wtWireframe) wtWireframe.visible = layers.overlay && subregions.wt;
    if (tcMesh) tcMesh.visible = tumorVisible && subregions.tc;
    if (etMesh) etMesh.visible = tumorVisible && subregions.et;
  }, [layers.tumor, layers.overlay, subregions]);

  // Update Controls Auto-Rotate
  useEffect(() => {
    const { controls } = threeStateRef.current;
    if (controls) {
      controls.autoRotate = autoRotate;
      controls.autoRotateSpeed = 1.8;
    }
  }, [autoRotate]);

  // Camera Quick Controls
  const handleZoom = (factor) => {
    const { camera, controls } = threeStateRef.current;
    if (!camera || !controls) return;
    camera.position.multiplyScalar(factor);
    camera.position.clampLength(1.2, 8.0);
    controls.update();
  };

  const handleResetCamera = useCallback(() => {
    const { camera, controls } = threeStateRef.current;
    if (!camera || !controls) return;
    camera.position.set(0, 0.6, 3.8);
    controls.target.set(0, 0, 0);
    controls.update();
    if (onResetView) onResetView();
  }, [onResetView]);

  // 2D Orthogonal Slice Canvas Rendering (Axial, Coronal, Sagittal)
  useEffect(() => {
    if (viewMode === '3d') return;
    const canvas = canvas2dRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Deep dark medical background
    ctx.fillStyle = '#060A12';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);

    const sliceIdx = viewMode === 'axial' ? axialSlice : viewMode === 'coronal' ? coronalSlice : sagittalSlice;
    const maxSlice = viewMode === 'axial' ? 155 : 240;
    const depthFactor = Math.sin((sliceIdx / maxSlice) * Math.PI);

    // Anatomical Slice Outline (MRI Scan)
    if (layers.mri) {
      ctx.beginPath();
      const rx = 110 * Math.max(0.3, depthFactor);
      const ry = (viewMode === 'axial' ? 140 : 130) * Math.max(0.3, depthFactor);
      ctx.ellipse(0, 0, rx, ry, 0, 0, 2 * Math.PI);

      const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, Math.max(rx, ry));
      grad.addColorStop(0, '#384661');
      grad.addColorStop(0.5, '#202C3F');
      grad.addColorStop(0.9, '#111827');
      grad.addColorStop(1, '#080E1A');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = '#2D3F5A';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Sulcal fold contours
      ctx.beginPath();
      ctx.arc(-22, -32, 28 * depthFactor, 0.2, 1.8);
      ctx.arc(22, -32, 28 * depthFactor, 1.3, 2.9);
      ctx.strokeStyle = '#182232';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Slice Tumor Overlay (Active if within slice range)
    const hasTumorInSlice = sliceIdx >= 45 && sliceIdx <= 110;
    if (hasTumorInSlice && (layers.tumor || layers.overlay)) {
      ctx.globalAlpha = opacity;
      const tumorScale = Math.sin(((sliceIdx - 45) / 65) * Math.PI);

      if (subregions.wt) {
        ctx.beginPath();
        ctx.ellipse(32, -26, 40 * tumorScale, 32 * tumorScale, 0.2, 0, 2 * Math.PI);
        ctx.fillStyle = '#10B981';
        ctx.fill();
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      if (subregions.tc) {
        ctx.beginPath();
        ctx.ellipse(30, -25, 25 * tumorScale, 20 * tumorScale, 0.2, 0, 2 * Math.PI);
        ctx.fillStyle = '#F59E0B';
        ctx.fill();
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      if (subregions.et) {
        ctx.beginPath();
        ctx.ellipse(33, -23, 15 * tumorScale, 12 * tumorScale, 0.3, 0, 2 * Math.PI);
        ctx.fillStyle = '#EF4444';
        ctx.fill();
        ctx.strokeStyle = '#DC2626';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;
    }

    ctx.restore();
  }, [viewMode, axialSlice, coronalSlice, sagittalSlice, layers, opacity, subregions]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full flex flex-col bg-medical-darkest rounded-xl overflow-hidden border border-medical-border select-none min-h-[460px]"
    >
      {/* Top Floating Viewport HUD */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <div className="px-3 py-1.5 rounded-lg bg-medical-base/90 border border-medical-border/80 backdrop-blur-md text-xs font-mono text-white flex items-center gap-2 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-medical-teal animate-pulse"></span>
          <span className="font-semibold uppercase tracking-wider">
            {viewMode === '3d' ? '3D Human Brain Anatomy' : `${viewMode} Plane`}
          </span>
          <span className="text-medical-muted text-[10px] hidden sm:inline">
            {viewMode === '3d' 
              ? 'GLTF 3D Mesh • Adaptive UNETR' 
              : `Slice ${viewMode === 'axial' ? axialSlice : viewMode === 'coronal' ? coronalSlice : sagittalSlice}`}
          </span>
        </div>

        {viewMode === '3d' && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-medical-surface/80 border border-medical-teal/30 text-[11px] font-mono text-medical-tealLight">
            <Sparkles className="w-3 h-3 text-medical-teal" />
            <span>3D Model: Human Brain (GLB)</span>
          </div>
        )}
      </div>

      {/* Floating Viewport Quick Controls (Auto-Rotate, Zoom, Reset) */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-medical-base/90 border border-medical-border/80 backdrop-blur-md p-1 rounded-lg shadow-lg">
        {viewMode === '3d' && (
          <button
            onClick={() => setAutoRotate(prev => !prev)}
            className={`p-1.5 rounded transition-colors ${
              autoRotate 
                ? 'bg-medical-teal text-medical-darkest' 
                : 'hover:bg-medical-surface text-medical-muted hover:text-white'
            }`}
            title={autoRotate ? 'Pause Auto-Rotation' : 'Enable Auto-Rotation'}
          >
            {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        )}
        <button
          onClick={() => handleZoom(0.85)}
          className="p-1.5 rounded hover:bg-medical-surface text-medical-muted hover:text-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom(1.15)}
          className="p-1.5 rounded hover:bg-medical-surface text-medical-muted hover:text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetCamera}
          className="p-1.5 rounded hover:bg-medical-surface text-medical-muted hover:text-white transition-colors"
          title="Reset Camera View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* 3D WebGL Three.js Viewport (Visible in 3D Mode) */}
      <div
        ref={threeMountRef}
        className={`w-full h-full flex-1 cursor-grab active:cursor-grabbing ${
          viewMode === '3d' ? 'block' : 'hidden'
        }`}
      />

      {/* Loading Overlay for 3D Brain Model */}
      {viewMode === '3d' && modelLoading && (
        <div className="absolute inset-0 bg-medical-darkest/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-medical-teal animate-spin" />
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-white">Loading 3D Anatomical Brain Mesh...</p>
            <p className="text-xs text-medical-muted font-mono">Parsing Rotten Brain.glb & textures</p>
          </div>
        </div>
      )}

      {/* Error Overlay if GLB fails */}
      {viewMode === '3d' && modelLoadError && (
        <div className="absolute inset-0 bg-red-950/40 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-sm font-semibold text-red-300">Failed to load 3D Brain model</p>
          <p className="text-xs text-medical-muted font-mono mt-1">{modelLoadError}</p>
        </div>
      )}

      {/* 2D Orthogonal Multi-Planar Slice Viewport (Visible in 2D Slicing Modes) */}
      <div
        className={`w-full h-full flex-1 flex items-center justify-center p-4 ${
          viewMode !== '3d' ? 'block' : 'hidden'
        }`}
      >
        <canvas
          ref={canvas2dRef}
          width={700}
          height={550}
          className="max-w-full max-h-full object-contain rounded-lg border border-medical-border/60 shadow-2xl"
        />
      </div>

      {/* Bottom Floating Metadata HUD */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between text-[11px] font-mono text-medical-muted bg-medical-base/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-medical-border/60 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-white font-medium">Model: Human Brain 3D</span>
          <span className="hidden sm:inline border-l border-medical-border pl-3">
            Source: <code className="text-medical-tealLight">human-brain/Rotten Brain.glb</code>
          </span>
          <span className="hidden md:inline border-l border-medical-border pl-3">
            Anatomical Surface: PBR Gyri & Sulci
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span>Opacity: {Math.round(opacity * 100)}%</span>
          <span className="text-emerald-400 font-semibold">{fps} FPS</span>
        </div>
      </div>
    </div>
  );
}
