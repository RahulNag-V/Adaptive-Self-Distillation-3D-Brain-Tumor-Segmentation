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
  Minimize2,
  Sliders, 
  Eye, 
  Layers, 
  Sparkles, 
  Loader2, 
  Play, 
  Pause,
  Palette,
  Check,
  Info
} from 'lucide-react';

/**
 * Anatomical Regions Color Legend & Specifications
 * Based on clinical neuroanatomy palette:
 * - Frontal Lobe: warm peach (#E5B19F), highlights #F5D1C2, shadows #B97870
 * - Parietal Lobe: dusty rose (#D9A0A1), highlights #F0C4C3, shadows #A96E78
 * - Temporal Lobe: muted coral (#D58C83), highlights #EAB3A8, shadows #995C5C
 * - Occipital Lobe: muted lavender-pink (#C6A2C9), highlights #E3C9E5, shadows #88668F
 * - Cerebellum: terracotta (#C78378), highlights #E4AA9D, shadows #8C5554
 * - Brainstem: warm beige-pink (#C9958B), highlights #E4B7AC, shadows #93645F
 * - Sulcal boundaries & deep folds: dark mauve-brown (#754D55)
 */
export const ANATOMICAL_REGIONS_LEGEND = [
  { id: 'frontal', name: 'Frontal Lobe', base: '#E5B19F', highlight: '#F5D1C2', shadow: '#B97870' },
  { id: 'parietal', name: 'Parietal Lobe', base: '#D9A0A1', highlight: '#F0C4C3', shadow: '#A96E78' },
  { id: 'temporal', name: 'Temporal Lobe', base: '#D58C83', highlight: '#EAB3A8', shadow: '#995C5C' },
  { id: 'occipital', name: 'Occipital Lobe', base: '#C6A2C9', highlight: '#E3C9E5', shadow: '#88668F' },
  { id: 'cerebellum', name: 'Cerebellum', base: '#C78378', highlight: '#E4AA9D', shadow: '#8C5554' },
  { id: 'brainstem', name: 'Brainstem', base: '#C9958B', highlight: '#E4B7AC', shadow: '#93645F' },
];

/**
 * Appearance options supporting 4 distinct modes:
 * 1. Anatomical Regions (distinct multi-shade colors for each lobe and structure)
 * 2. Natural Anatomy (coordinated pink-beige cortex with gyri/sulci relief)
 * 3. Anatomical Contrast (deepened regional separation and pronounced fold relief)
 * 4. Original Appearance (clinical neutral-pale medical visualization)
 */
export const BRAIN_APPEARANCE_OPTIONS = [
  {
    id: 'regions',
    name: 'Anatomical Regions',
    swatchColor: '#E5B19F',
    badge: 'Multi-Shade Lobes',
    description: 'Distinct realistic shades for Frontal, Parietal, Temporal, Occipital, Cerebellum, and Brainstem',
    textureKey: 'regions',
    color: 0xffffff,
    roughness: 0.52,
    metalness: 0.02,
    clearcoat: 0.16,
    clearcoatRoughness: 0.35,
    normalScale: 1.95,
    sheenColor: '#DFC0B8',
    ambientColor: 0x5a4844,
    ambientIntensity: 0.68,
    keyColor: 0xfff4eb,
    keyIntensity: 1.35,
    fillColor: 0xd8988e,
    fillIntensity: 0.65,
    rimColor: 0xf0e6dc,
    rimIntensity: 0.85,
  },
  {
    id: 'natural',
    name: 'Natural Anatomy',
    swatchColor: '#D9A69B',
    badge: 'Unified Cortex',
    description: 'Realistic warm pinkish-beige cerebral cortex with natural sulcal depth and rose-brown shading',
    textureKey: 'natural',
    color: '#D9A69B',
    roughness: 0.52,
    metalness: 0.02,
    clearcoat: 0.18,
    clearcoatRoughness: 0.35,
    normalScale: 1.85,
    sheenColor: '#D9A69B',
    ambientColor: 0x5a4642,
    ambientIntensity: 0.68,
    keyColor: 0xfff2e6,
    keyIntensity: 1.35,
    fillColor: 0xd8988e,
    fillIntensity: 0.65,
    rimColor: 0xf0e6dc,
    rimIntensity: 0.85,
  },
  {
    id: 'contrast',
    name: 'Anatomical Contrast',
    swatchColor: '#C88A7D',
    badge: 'High Relief',
    description: 'Sharpened regional boundaries, deep sulcal shadows, and amplified gyral crests',
    textureKey: 'contrast',
    color: 0xffffff,
    roughness: 0.48,
    metalness: 0.03,
    clearcoat: 0.22,
    clearcoatRoughness: 0.28,
    normalScale: 2.65,
    sheenColor: '#C88A7D',
    ambientColor: 0x483432,
    ambientIntensity: 0.55,
    keyColor: 0xffece0,
    keyIntensity: 1.55,
    fillColor: 0xc88277,
    fillIntensity: 0.60,
    rimColor: 0xfff8f2,
    rimIntensity: 1.05,
  },
  {
    id: 'original',
    name: 'Original Appearance',
    swatchColor: '#DDE5ED',
    badge: 'Monochrome',
    description: 'Clinical translucent neutral-pale medical visualization',
    textureKey: 'none',
    color: '#DDE5ED',
    roughness: 0.40,
    metalness: 0.10,
    clearcoat: 0.0,
    clearcoatRoughness: 0.0,
    normalScale: 1.0,
    sheenColor: '#DDE5ED',
    ambientColor: 0x404856,
    ambientIntensity: 0.85,
    keyColor: 0xf0f9ff,
    keyIntensity: 1.45,
    fillColor: 0x38bdf8,
    fillIntensity: 0.50,
    rimColor: 0x94a3b8,
    rimIntensity: 0.75,
  },
];

export default function MedicalViewer({
  viewMode = '3d', // '3d' | 'axial' | 'coronal' | 'sagittal'
  axialSlice = 75,
  coronalSlice = 120,
  sagittalSlice = 120,
  layers = { mri: true, tumor: true, overlay: true },
  opacity = 0.85,
  subregions = { wt: true, tc: true, et: true },
  brainAppearance = 'regions',
  onBrainAppearanceChange,
  onResetView,
  isMaximized = false,
  onToggleMaximize,
}) {
  const containerRef = useRef(null);
  const threeMountRef = useRef(null);
  const canvas2dRef = useRef(null);

  // Appearance state (syncs with prop or manages locally)
  const [activeAppearance, setActiveAppearance] = useState(brainAppearance);
  const [showPaletteMenu, setShowPaletteMenu] = useState(false);

  useEffect(() => {
    setActiveAppearance(brainAppearance);
  }, [brainAppearance]);

  const handleSelectAppearance = (optId) => {
    setActiveAppearance(optId);
    if (onBrainAppearanceChange) {
      onBrainAppearanceChange(optId);
    }
    setShowPaletteMenu(false);
  };

  // Textures ref to cache all high-resolution texture maps
  const texturesRef = useRef({
    regions: null,
    natural: null,
    contrast: null,
    normal: null,
    roughness: null,
  });

  // Three.js instances ref
  const threeStateRef = useRef({
    renderer: null,
    scene: null,
    camera: null,
    controls: null,
    brainGroup: null,
    brainMaterials: [],
    ambientLight: null,
    keyLight: null,
    fillLight: null,
    rimLight: null,
    bottomFill: null,
    tumorGlowLight: null,
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

    // 5. Scientifically Inspired Anatomical Lighting
    const ambientLight = new THREE.AmbientLight(0x5a4844, 0.68);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff4eb, 1.35);
    keyLight.position.set(3.5, 4.5, 3.0);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xd8988e, 0.65);
    fillLight.position.set(-3.5, 1.5, 2.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xf0e6dc, 0.85);
    rimLight.position.set(0, 3.5, -4.0);
    scene.add(rimLight);

    const bottomFill = new THREE.DirectionalLight(0x2d1f24, 0.35);
    bottomFill.position.set(0, -3.5, 0);
    scene.add(bottomFill);

    const tumorGlowLight = new THREE.PointLight(0x10b981, 1.3, 2.8);
    tumorGlowLight.position.set(0.42, 0.22, 0.28);
    scene.add(tumorGlowLight);

    // 6. Tumor 3D Segmented Geometry (WT, TC, ET)
    const tumorGroup = new THREE.Group();
    tumorGroup.position.set(0.42, 0.22, 0.28); // Anatomical right fronto-parietal region

    // Whole Tumor (WT - Emerald Green #10B981)
    const wtGeo = new THREE.SphereGeometry(0.38, 32, 32);
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

    // 7. Texture Loading: Anatomical Regions, Natural, Contrast, Normal, and Roughness
    const textureLoader = new THREE.TextureLoader();

    const loadTex = (url, isColor = true) => {
      const tex = textureLoader.load(url, () => {
        tex.needsUpdate = true;
      });
      if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
      tex.flipY = false;
      return tex;
    };

    const texRegions = loadTex('/models/textures/anatomical_regions.png', true);
    const texNatural = loadTex('/models/textures/gltf_embedded_0.png', true);
    const texContrast = loadTex('/models/textures/anatomical_contrast.png', true);
    const texNormal = loadTex('/models/textures/gltf_embedded_2.png', false);
    const texRoughness = loadTex('/models/textures/gltf_embedded_1.png', false);

    texturesRef.current = {
      regions: texRegions,
      natural: texNatural,
      contrast: texContrast,
      normal: texNormal,
      roughness: texRoughness,
    };

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

        const currentPreset = BRAIN_APPEARANCE_OPTIONS.find(o => o.id === activeAppearance) || BRAIN_APPEARANCE_OPTIONS[0];
        const activeDiffuse = currentPreset.textureKey === 'regions' 
          ? texRegions 
          : currentPreset.textureKey === 'contrast' 
          ? texContrast 
          : currentPreset.textureKey === 'natural' 
          ? texNatural 
          : null;

        // Apply multi-shade physical material with regional colors and gyri/sulci relief
        model.traverse((child) => {
          if (child.isMesh) {
            if (child.material && child.material.dispose) {
              child.material.dispose();
            }

            const mat = new THREE.MeshPhysicalMaterial({
              color: new THREE.Color(currentPreset.color),
              map: activeDiffuse,
              normalMap: texNormal,
              normalScale: new THREE.Vector2(currentPreset.normalScale, currentPreset.normalScale),
              roughness: currentPreset.roughness,
              roughnessMap: texRoughness,
              metalness: currentPreset.metalness,
              clearcoat: currentPreset.clearcoat,
              clearcoatRoughness: currentPreset.clearcoatRoughness,
              sheen: 0.25,
              sheenColor: new THREE.Color(currentPreset.sheenColor),
              transparent: opacity < 0.99,
              opacity: layers.mri ? opacity : 0.0,
              depthWrite: opacity > 0.82,
              side: THREE.FrontSide,
            });

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
      ambientLight,
      keyLight,
      fillLight,
      rimLight,
      bottomFill,
      tumorGlowLight,
      tumorGroup,
      wtMesh,
      wtWireframe,
      tcMesh,
      etMesh,
      pulseTime: 0,
      animationFrameId: null,
    };

    // 8. Animation & Render Loop
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

    // Cleanup GPU resources
    return () => {
      resizeObserver.disconnect();
      if (threeStateRef.current.animationFrameId) {
        cancelAnimationFrame(threeStateRef.current.animationFrameId);
      }
      controls.dispose();
      renderer.dispose();

      // Dispose textures
      texRegions.dispose();
      texNatural.dispose();
      texContrast.dispose();
      texNormal.dispose();
      texRoughness.dispose();

      // Dispose geometries & materials
      wtGeo.dispose();
      wtMat.dispose();
      wtWireGeo.dispose();
      wtWireMat.dispose();
      tcGeo.dispose();
      tcMat.dispose();
      etGeo.dispose();
      etMat.dispose();

      brainMaterials.forEach((m) => m.dispose());

      if (mountEl && renderer.domElement && mountEl.contains(renderer.domElement)) {
        mountEl.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Brain Appearance Preset in Real-Time Without Reloading Model
  useEffect(() => {
    const { 
      brainMaterials, 
      ambientLight, 
      keyLight, 
      fillLight, 
      rimLight 
    } = threeStateRef.current;
    const { regions, natural, contrast, normal, roughness } = texturesRef.current;

    const preset = BRAIN_APPEARANCE_OPTIONS.find(o => o.id === activeAppearance) || BRAIN_APPEARANCE_OPTIONS[0];

    // Select matching multi-shade texture
    const activeDiffuse = preset.textureKey === 'regions' 
      ? regions 
      : preset.textureKey === 'contrast' 
      ? contrast 
      : preset.textureKey === 'natural' 
      ? natural 
      : null;

    // Update lighting for current appearance
    if (ambientLight) {
      ambientLight.color.set(preset.ambientColor);
      ambientLight.intensity = preset.ambientIntensity;
    }
    if (keyLight) {
      keyLight.color.set(preset.keyColor);
      keyLight.intensity = preset.keyIntensity;
    }
    if (fillLight) {
      fillLight.color.set(preset.fillColor);
      fillLight.intensity = preset.fillIntensity;
    }
    if (rimLight) {
      rimLight.color.set(preset.rimColor);
      rimLight.intensity = preset.rimIntensity;
    }

    // Update physical material properties in place
    brainMaterials.forEach((mat) => {
      mat.color.set(preset.color);
      mat.map = activeDiffuse;
      mat.normalMap = normal;
      if (mat.normalScale) {
        mat.normalScale.set(preset.normalScale, preset.normalScale);
      }
      mat.roughness = preset.roughness;
      mat.roughnessMap = roughness;
      mat.metalness = preset.metalness;
      mat.clearcoat = preset.clearcoat;
      mat.clearcoatRoughness = preset.clearcoatRoughness;
      if (mat.sheenColor) {
        mat.sheenColor.set(preset.sheenColor);
      }
      mat.needsUpdate = true;
    });
  }, [activeAppearance]);

  // Update Brain Model Opacity & Visibility
  useEffect(() => {
    const { brainMaterials, brainGroup } = threeStateRef.current;
    if (brainGroup) {
      brainGroup.visible = layers.mri;
    }
    brainMaterials.forEach((mat) => {
      mat.opacity = layers.mri ? opacity : 0.0;
      mat.transparent = opacity < 0.99;
      mat.depthWrite = opacity > 0.82;
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

  const currentOption = BRAIN_APPEARANCE_OPTIONS.find(o => o.id === activeAppearance) || BRAIN_APPEARANCE_OPTIONS[0];

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full min-h-0 flex flex-col bg-medical-darkest rounded-xl overflow-hidden border border-medical-border select-none group shadow-lg"
    >
      {/* Top Floating Viewport HUD */}
      <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-2 pointer-events-none">
        <div className="px-2.5 py-1 rounded-md bg-medical-base/90 border border-medical-border/80 backdrop-blur-md text-[11px] font-mono text-white flex items-center gap-1.5 shadow-md">
          <span className="w-2 h-2 rounded-full bg-medical-teal animate-pulse shrink-0"></span>
          <span className="font-semibold uppercase tracking-wider">
            {viewMode === '3d' ? '3D Anatomy' : `${viewMode} Plane`}
          </span>
          <span className="text-medical-muted text-[10px] hidden sm:inline">
            {viewMode === '3d' 
              ? '• Atlas' 
              : `• Slice ${viewMode === 'axial' ? axialSlice : viewMode === 'coronal' ? coronalSlice : sagittalSlice}`}
          </span>
        </div>
      </div>

      {/* Top Right Maximize / Restore Action Button */}
      {onToggleMaximize && (
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1">
          <button
            onClick={onToggleMaximize}
            className="p-1 rounded-md bg-medical-base/90 border border-medical-border/80 text-medical-muted hover:text-white hover:bg-medical-surface transition-colors shadow-md"
            title={isMaximized ? 'Restore View (Esc)' : 'Maximize Whole Screen'}
            aria-label={isMaximized ? 'Restore View' : 'Maximize Whole Screen'}
          >
            {isMaximized ? (
              <Minimize2 className="w-3.5 h-3.5 text-medical-teal" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      )}

      {/* Main 3D / 2D Viewport Area */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* 3D WebGL Three.js Viewport (Visible in 3D Mode) */}
        <div
          ref={threeMountRef}
          className={`w-full h-full cursor-grab active:cursor-grabbing ${
            viewMode === '3d' ? 'block' : 'hidden'
          }`}
        />

        {/* Loading Overlay for 3D Brain Model */}
        {viewMode === '3d' && modelLoading && (
          <div className="absolute inset-0 bg-medical-darkest/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-medical-teal animate-spin" />
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-white">Loading 3D Anatomical Brain Mesh...</p>
              <p className="text-xs text-medical-muted font-mono">Applying multi-shade anatomical textures & gyri</p>
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
          className={`w-full h-full flex items-center justify-center p-4 ${
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

        {/* Floating Viewport Quick Controls Pill at Bottom Right (Palette + swatch, Play, Zoom In, Zoom Out, Reset) */}
        <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1.5 bg-medical-base/90 border border-medical-border/80 backdrop-blur-md p-1 rounded-lg shadow-lg opacity-90 hover:opacity-100 transition-opacity">
          {viewMode === '3d' && (
            <div className="relative">
              <button
                onClick={() => setShowPaletteMenu(prev => !prev)}
                className={`p-1.5 rounded transition-colors flex items-center gap-1.5 text-xs font-mono ${
                  showPaletteMenu
                    ? 'bg-medical-teal text-medical-darkest'
                    : 'hover:bg-medical-surface text-medical-muted hover:text-white'
                }`}
                title="Brain Appearance Presets"
                aria-label="Brain Appearance Presets"
              >
                <Palette className="w-4 h-4" />
                <span 
                  className="w-2.5 h-2.5 rounded-full border border-black/40 shadow-sm inline-block shrink-0"
                  style={{ backgroundColor: currentOption.swatchColor }}
                />
              </button>

              {/* Appearance dropdown popover - opens upward */}
              {showPaletteMenu && (
                <div className="absolute right-0 bottom-full mb-2 w-56 bg-medical-card/95 border border-medical-border rounded-lg shadow-2xl p-1.5 z-40 backdrop-blur-md">
                  <div className="text-[10px] font-mono uppercase text-medical-muted px-2 py-1 border-b border-medical-border/60 mb-1">
                    Brain Appearance
                  </div>
                  {BRAIN_APPEARANCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleSelectAppearance(opt.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-medium text-left transition-colors ${
                        activeAppearance === opt.id
                          ? 'bg-medical-teal/20 text-medical-tealLight'
                          : 'text-white hover:bg-medical-surface'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full border border-black/30 flex-shrink-0"
                          style={{ backgroundColor: opt.swatchColor }}
                        />
                        <span>{opt.name}</span>
                      </div>
                      {activeAppearance === opt.id && <Check className="w-3.5 h-3.5 text-medical-teal" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {viewMode === '3d' && (
            <button
              onClick={() => setAutoRotate(prev => !prev)}
              className={`p-1.5 rounded transition-colors ${
                autoRotate 
                  ? 'bg-medical-teal text-medical-darkest' 
                  : 'hover:bg-medical-surface text-medical-muted hover:text-white'
              }`}
              title={autoRotate ? 'Pause Auto-Rotation' : 'Enable Auto-Rotation'}
              aria-label="Toggle Auto-Rotation"
            >
              {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={() => handleZoom(0.85)}
            className="p-1.5 rounded hover:bg-medical-surface text-medical-muted hover:text-white transition-colors"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(1.15)}
            className="p-1.5 rounded hover:bg-medical-surface text-medical-muted hover:text-white transition-colors"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetCamera}
            className="p-1.5 rounded hover:bg-medical-surface text-medical-muted hover:text-white transition-colors"
            title="Reset Camera View"
            aria-label="Reset Camera"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Viewer Footer Bar (Matches OrthogonalSliceViewer 24px footer) */}
      <div className="h-6 px-2.5 bg-medical-base/95 border-t border-medical-border/60 flex items-center justify-between text-[10px] font-mono text-medical-muted z-10 shrink-0 select-none">
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <span>MODEL: <strong className="text-white uppercase">HUMAN BRAIN</strong></span>
          <span className="text-medical-border/80 shrink-0">•</span>
          <span className="text-medical-tealLight truncate">{currentOption.name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span>{Math.round(opacity * 100)}%</span>
          <span className="text-medical-border/80">•</span>
          <span className="text-emerald-400 font-semibold">{fps} FPS</span>
        </div>
      </div>
    </div>
  );
}
