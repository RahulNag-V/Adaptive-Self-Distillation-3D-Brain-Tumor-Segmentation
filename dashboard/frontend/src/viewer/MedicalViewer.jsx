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
  Loader2, 
  Play, 
  Pause,
  Palette,
  Check,
  Info,
  Compass,
  Sun
} from 'lucide-react';
import { getPatientTumorMesh } from '../api/segmentation';
import { cn } from '../lib/utils';

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
    // High-visibility bottom / inferior illumination
    bottomFillColor: 0xffede6,
    bottomFillIntensity: 1.30,
    bottomRimColor: 0x93c5fd,
    bottomRimIntensity: 1.05,
    bottomLateralColor: 0xfed7aa,
    bottomLateralIntensity: 0.85,
    bottomAccentColor: 0xfbcfe8,
    bottomAccentIntensity: 0.70,
    bottomBounceGround: 0xfdeee7,
    bottomBounceSky: 0x475569,
    bottomBounceIntensity: 0.65,
  },
  {
    id: 'natural',
    name: 'Natural Anatomy',
    swatchColor: '#D9A69B',
    badge: 'Unified Cortex',
    description: 'Realistic warm pinkish-beige cerebral cortex with natural sulcal depth and rose-brown shading',
    textureKey: 'natural',
    color: 0xffffff,
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
    // High-visibility bottom / inferior illumination
    bottomFillColor: 0xffede6,
    bottomFillIntensity: 1.25,
    bottomRimColor: 0xbfdbfe,
    bottomRimIntensity: 0.95,
    bottomLateralColor: 0xffedd5,
    bottomLateralIntensity: 0.80,
    bottomAccentColor: 0xfecdd3,
    bottomAccentIntensity: 0.65,
    bottomBounceGround: 0xfdeee7,
    bottomBounceSky: 0x475569,
    bottomBounceIntensity: 0.60,
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
    // High-visibility bottom / inferior illumination
    bottomFillColor: 0xfff3ea,
    bottomFillIntensity: 1.45,
    bottomRimColor: 0x60a5fa,
    bottomRimIntensity: 1.20,
    bottomLateralColor: 0xfcbba1,
    bottomLateralIntensity: 0.95,
    bottomAccentColor: 0xf472b6,
    bottomAccentIntensity: 0.75,
    bottomBounceGround: 0xffedd5,
    bottomBounceSky: 0x334155,
    bottomBounceIntensity: 0.70,
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
    // High-visibility bottom / inferior illumination
    bottomFillColor: 0xe0f2fe,
    bottomFillIntensity: 1.35,
    bottomRimColor: 0x38bdf8,
    bottomRimIntensity: 1.15,
    bottomLateralColor: 0xbae6fd,
    bottomLateralIntensity: 0.85,
    bottomAccentColor: 0x7dd3fc,
    bottomAccentIntensity: 0.75,
    bottomBounceGround: 0xe2e8f0,
    bottomBounceSky: 0x1e293b,
    bottomBounceIntensity: 0.65,
  },
];

export default function MedicalViewer({
  viewMode = '3d', // '3d' | 'axial' | 'coronal' | 'sagittal'
  patientId = 'BraTS2021_01017',
  segSource = 'ground_truth',
  confidenceThreshold = 0.90,
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
  viewerCommand = null,
  isCompactPreview = false,
}) {
  const containerRef = useRef(null);
  const threeMountRef = useRef(null);
  const canvas2dRef = useRef(null);

  // Real Marching Cubes Tumor Mesh state
  const [meshData, setMeshData] = useState(null);
  const [meshLoading, setMeshLoading] = useState(false);
  const [meshError, setMeshError] = useState(null);
  const meshCacheRef = useRef({});

  // Appearance state (syncs with prop or manages locally)
  const [activeAppearance, setActiveAppearance] = useState(brainAppearance);
  const [showPaletteMenu, setShowPaletteMenu] = useState(false);
  const [showAngleMenu, setShowAngleMenu] = useState(false);
  const controlsRef = useRef(null);

  const isCompactPreviewRef = useRef(isCompactPreview);
  isCompactPreviewRef.current = isCompactPreview;
  const isMaximizedRef = useRef(isMaximized);
  isMaximizedRef.current = isMaximized;

  // Re-frame camera automatically when switching between compact preview, main viewer, and fullscreen
  useEffect(() => {
    isCompactPreviewRef.current = isCompactPreview;
    isMaximizedRef.current = isMaximized;
    const timer = setTimeout(() => {
      if (typeof threeStateRef.current?.fitCamera === 'function') {
        threeStateRef.current.fitCamera();
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [isCompactPreview, isMaximized]);

  useEffect(() => {
    setActiveAppearance(brainAppearance);
  }, [brainAppearance]);

  // Click-outside listener to dismiss floating menus
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (controlsRef.current && !controlsRef.current.contains(e.target)) {
        setShowPaletteMenu(false);
        setShowAngleMenu(false);
      }
    };
    if (showPaletteMenu || showAngleMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPaletteMenu, showAngleMenu]);

  const handleSelectAppearance = (optId) => {
    setActiveAppearance(optId);
    if (onBrainAppearanceChange) {
      onBrainAppearanceChange(optId);
    }
    setShowPaletteMenu(false);
  };

  // Fetch authentic patient tumor mesh extracted via Marching Cubes from NIfTI mask
  useEffect(() => {
    if (!patientId) return;
    const thresholdParam = segSource === 'prediction' ? confidenceThreshold : null;
    const cacheKey = `${patientId}_${segSource}_${thresholdParam ?? 'raw'}`;
    if (meshCacheRef.current[cacheKey]) {
      setMeshData(meshCacheRef.current[cacheKey]);
      setMeshLoading(false);
      return;
    }

    let isCancelled = false;
    setMeshLoading(true);
    setMeshError(null);

    getPatientTumorMesh(patientId, segSource, thresholdParam)
      .then((data) => {
        if (!isCancelled) {
          meshCacheRef.current[cacheKey] = data;
          setMeshData(data);
          setMeshLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.warn('Could not load patient tumor mesh:', err);
          setMeshError(err.message || 'Mesh not available');
          setMeshLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [patientId, segSource, confidenceThreshold]);

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
    bottomRimLight: null,
    bottomLateralFill: null,
    bottomAccentLight: null,
    bottomBounceLight: null,
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

    // 1. Scene (Transparent background so the underlying scientific medical grid is visible)
    const scene = new THREE.Scene();
    scene.background = null;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.6, 3.8);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0); // Transparent clear color for grid background
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // Ensure the WebGL canvas fills the entire viewport container
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'inherit';
    mountEl.appendChild(renderer.domElement);

    // 4. OrbitControls bound directly to mountEl for full-viewport cursor interaction
    const controls = new OrbitControls(camera, mountEl);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.95;
    controls.panSpeed = 0.85;
    controls.enableZoom = false; // Handled smoothly and exclusively by our dedicated wheel handler below
    controls.minDistance = 1.2;
    controls.maxDistance = 8.0;
    controls.target.set(0, 0, 0);
    controls.update();
    controls.saveState(); // Cache canonical default transformation state for reliable reset

    // Dedicated high-precision wheel navigation:
    // • Wheel Up / Down: Smooth Zoom / Dolly In / Out
    // • Shift + Wheel: Smooth vertical pitch/tilt rotation
    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Pause continuous auto-rotation on manual interaction
      setAutoRotate(false);

      if (e.shiftKey) {
        // Shift + Wheel: Tilt/pitch vertical rotation
        const sign = e.deltaY < 0 ? -1 : 1;
        const rad = THREE.MathUtils.degToRad(8);
        const offset = camera.position.clone().sub(controls.target);
        const right = new THREE.Vector3().crossVectors(camera.up, offset).normalize();
        offset.applyAxisAngle(right, sign * rad);
        camera.position.copy(controls.target).add(offset);
        controls.update();
      } else {
        // Standard Wheel: Smooth Zoom In / Zoom Out (Dolly)
        const zoomDelta = e.deltaY < 0 ? 0.90 : 1.11;
        const offset = camera.position.clone().sub(controls.target);
        const currentDistance = offset.length();
        const newDistance = THREE.MathUtils.clamp(currentDistance * zoomDelta, 1.2, 8.0);
        offset.setLength(newDistance);
        camera.position.copy(controls.target).add(offset);
        controls.update();
      }
    };

    // Pause auto-rotation when user clicks or touches to rotate
    const handlePointerDown = () => {
      setAutoRotate(false);
    };

    mountEl.addEventListener('wheel', handleWheel, { passive: false });
    mountEl.addEventListener('pointerdown', handlePointerDown);

    // 5. Scientifically Inspired Anatomical Lighting (Superior & Inferior 360° Illumination)
    const initPreset = BRAIN_APPEARANCE_OPTIONS.find(o => o.id === activeAppearance) || BRAIN_APPEARANCE_OPTIONS[0];

    const ambientLight = new THREE.AmbientLight(initPreset.ambientColor, initPreset.ambientIntensity);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(initPreset.keyColor, initPreset.keyIntensity);
    keyLight.position.set(3.5, 4.5, 3.0);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(initPreset.fillColor, initPreset.fillIntensity);
    fillLight.position.set(-3.5, 1.5, 2.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(initPreset.rimColor, initPreset.rimIntensity);
    rimLight.position.set(0, 3.5, -4.0);
    scene.add(rimLight);

    // High-Visibility Bottom / Inferior Illumination Rig
    // Direct upward illumination on the ventral surface (temporal poles, optic chiasm, pons)
    const bottomFill = new THREE.DirectionalLight(initPreset.bottomFillColor, initPreset.bottomFillIntensity);
    bottomFill.position.set(0, -4.2, 1.5);
    scene.add(bottomFill);

    // Inferior posterior rim light highlighting cerebellum folia & tonsils against dark background
    const bottomRimLight = new THREE.DirectionalLight(initPreset.bottomRimColor, initPreset.bottomRimIntensity);
    bottomRimLight.position.set(0, -4.0, -3.2);
    scene.add(bottomRimLight);

    // Left inferior lateral fill revealing deep ventral sulcal clefts
    const bottomLateralFill = new THREE.DirectionalLight(initPreset.bottomLateralColor, initPreset.bottomLateralIntensity);
    bottomLateralFill.position.set(-3.2, -3.6, 0.5);
    scene.add(bottomLateralFill);

    // Right inferior accent light providing symmetric bilateral volumetric radiance
    const bottomAccentLight = new THREE.DirectionalLight(initPreset.bottomAccentColor, initPreset.bottomAccentIntensity);
    bottomAccentLight.position.set(3.2, -3.6, 0.5);
    scene.add(bottomAccentLight);

    // Upward-directed ground bounce ambient eliminating black crevice shadows
    const bottomBounceLight = new THREE.HemisphereLight(
      initPreset.bottomBounceSky,
      initPreset.bottomBounceGround,
      initPreset.bottomBounceIntensity
    );
    scene.add(bottomBounceLight);

    const tumorGlowLight = new THREE.PointLight(0xf59e0b, 1.4, 3.5);
    tumorGlowLight.position.set(0, 0, 0);
    scene.add(tumorGlowLight);

    // 6. Tumor 3D Segmented Geometry Group (Centered to MRI Volume Coordinates)
    const tumorGroup = new THREE.Group();
    tumorGroup.position.set(0, 0, 0);
    tumorGroup.renderOrder = 1; // Render tumor prior to outer brain shell
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
    brainGroup.renderOrder = 10; // Renders after tumor so translucent shell overlays cleanly from all 360 deg
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
        model.renderOrder = 10;

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
              transparent: true,
              opacity: layers.mri ? opacity : 0.0,
              depthWrite: false, // Ensures internal tumor mass is never clipped or occluded
              depthTest: true,
              side: THREE.FrontSide, // Culls back faces to eliminate concave mesh geometry inversion
            });

            child.material = mat;
            child.renderOrder = 10;
            brainMaterials.push(mat);
          }
        });

        brainGroup.add(model);
        setModelLoading(false);
        fitCameraToModel();
      },
      undefined,
      (err) => {
        console.error('Error loading 3D brain model:', err);
        setModelLoadError(err.message || 'Failed to load /models/brain.glb');
        setModelLoading(false);
      }
    );

    // Precise, responsive camera framing based on actual model bounding box
    const fitCameraToModel = (customDist = null) => {
      if (!camera || !controls || !brainGroup) return;
      if (!mountEl) return;
      const w = mountEl.clientWidth;
      const h = mountEl.clientHeight;
      if (w === 0 || h === 0) return;

      const aspect = w / h;
      camera.aspect = aspect;

      // Compute combined bounding box containing brainGroup and tumorGroup
      const box = new THREE.Box3().setFromObject(brainGroup);
      if (tumorGroup && tumorGroup.children.length > 0) {
        box.union(new THREE.Box3().setFromObject(tumorGroup));
      }
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      // Target occupancy of usable canvas height: 72% in preview, 70% in main/fullscreen (between 65-75%)
      const targetOccupancy = isCompactPreviewRef.current ? 0.72 : 0.70;
      const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

      // Calculate vertical and horizontal framing distances
      const modelHeight = size.y > 0 ? size.y : 2.16;
      const vDist = modelHeight / (2 * tanHalfFov * targetOccupancy);

      const maxHoriz = Math.max(size.x || 1.92, size.z || 2.50);
      const hDist = (maxHoriz * 0.95) / (2 * tanHalfFov * aspect * targetOccupancy);

      const framingDist = customDist !== null ? customDist : Math.max(vDist, hDist);
      threeStateRef.current.framingDistance = framingDist;

      // Subtle vertical angle (0.10 * dist) to reveal gyri/sulci anatomical relief while keeping model centered
      const camY = center.y + framingDist * 0.10;
      const camZ = center.z + framingDist;

      camera.position.set(center.x, camY, camZ);
      camera.up.set(0, 1, 0);
      camera.zoom = 1.0;
      controls.target.copy(center);
      camera.lookAt(center);
      camera.updateProjectionMatrix();
      controls.update();
      controls.saveState();
    };

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
      bottomRimLight,
      bottomLateralFill,
      bottomAccentLight,
      bottomBounceLight,
      tumorGlowLight,
      tumorGroup,
      wtMesh: null,
      wtWireframe: null,
      tcMesh: null,
      etMesh: null,
      pulseTime: 0,
      animationFrameId: null,
      fitCamera: fitCameraToModel,
      framingDistance: 3.6,
    };
    window.__threeViewer = threeStateRef.current;

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

      // Subtle biological metabolic resonance animation for 3D tumor (~4.2s breathing cycle)
      threeStateRef.current.pulseTime += 0.015;
      const pTime = threeStateRef.current.pulseTime;
      const pulseScale = 1.0 + 0.012 * Math.sin(pTime);
      const pulseGlow = 0.5 + 0.5 * Math.sin(pTime * 1.2);

      const { wtMesh, wtWireframe, tcMesh, etMesh, tumorGlowLight } = threeStateRef.current;
      if (wtMesh) wtMesh.scale.setScalar(pulseScale);
      if (wtWireframe) wtWireframe.scale.setScalar(pulseScale * 1.025);
      if (tcMesh) tcMesh.scale.setScalar(1.0 + 0.008 * Math.sin(pTime + 0.4));
      if (etMesh) etMesh.scale.setScalar(1.0 + 0.015 * Math.sin(pTime + 0.8));

      // Soft internal luminosity modulation
      if (tumorGlowLight) {
        tumorGlowLight.intensity = 1.3 + 0.35 * pulseGlow;
      }
      // Micro-surface metabolic shimmer
      if (etMesh?.material) {
        etMesh.material.emissiveIntensity = 0.55 + 0.18 * pulseGlow;
      }
      if (wtMesh?.material) {
        wtMesh.material.emissiveIntensity = 0.32 + 0.08 * Math.cos(pTime);
      }

      controls.update();
      renderer.render(scene, camera);
    };

    threeStateRef.current.animationFrameId = requestAnimationFrame(animate);

    // 9. Resize Handling via ResizeObserver (pass false to preserve 100% CSS styling)
    const handleResize = () => {
      if (!mountEl || !renderer || !camera || !controls) return;
      const w = mountEl.clientWidth;
      const h = mountEl.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);

      // In compact preview, continuously maintain the exact 65-75% framing when card size changes
      if (isCompactPreviewRef.current) {
        fitCameraToModel();
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mountEl);

    // Cleanup GPU resources
    return () => {
      resizeObserver.disconnect();
      mountEl.removeEventListener('wheel', handleWheel);
      mountEl.removeEventListener('pointerdown', handlePointerDown);
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

      // Dispose tumor meshes in group
      if (tumorGroup) {
        while (tumorGroup.children.length > 0) {
          const child = tumorGroup.children[0];
          tumorGroup.remove(child);
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
            else child.material.dispose();
          }
        }
      }

      brainMaterials.forEach((m) => m.dispose());

      if (mountEl && renderer.domElement && mountEl.contains(renderer.domElement)) {
        mountEl.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Build and mount authentic 3D tumor surface meshes when meshData updates
  useEffect(() => {
    const { tumorGroup, scene } = threeStateRef.current;
    if (!tumorGroup || !scene) return;

    // Remove existing meshes from tumorGroup
    while (tumorGroup.children.length > 0) {
      const child = tumorGroup.children[0];
      tumorGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    }
    threeStateRef.current.wtMesh = null;
    threeStateRef.current.wtWireframe = null;
    threeStateRef.current.tcMesh = null;
    threeStateRef.current.etMesh = null;

    if (!meshData || !meshData.has_mesh || !meshData.surfaces) {
      return;
    }

    const { surfaces } = meshData;

    const buildGeometry = (surf) => {
      if (!surf || !surf.positions || surf.positions.length === 0) return null;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(surf.positions, 3));
      if (surf.normals && surf.normals.length > 0) {
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(surf.normals, 3));
      } else {
        geo.computeVertexNormals();
      }
      if (surf.indices && surf.indices.length > 0) {
        geo.setIndex(surf.indices);
      }
      return geo;
    };

    // Generate organic micro-cellular texture for realistic biological lesion detail
    const createOrganicTexture = () => {
      const size = 128;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const imgData = ctx.createImageData(size, size);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const nx = (x / size) * 8;
          const ny = (y / size) * 8;
          const v1 = Math.sin(nx * 2.1 + Math.cos(ny * 2.3));
          const v2 = Math.cos(nx * 4.1 - ny * 3.4);
          const v3 = Math.sin(nx * 7.8 + ny * 6.9) * 0.45;
          const val = Math.floor(Math.min(255, Math.max(0, ((v1 + v2 + v3 + 2.45) / 4.9) * 255)));
          const idx = (y * size + x) * 4;
          imgData.data[idx] = val;
          imgData.data[idx + 1] = val;
          imgData.data[idx + 2] = val;
          imgData.data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2.5, 2.5);
      return tex;
    };

    const organicBump = createOrganicTexture();

    // Calculate Tumor Centroid to position internal glow light precisely inside lesion mass
    const { tumorGlowLight } = threeStateRef.current;
    if (surfaces.wt && surfaces.wt.positions && surfaces.wt.positions.length > 0) {
      const pos = surfaces.wt.positions;
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;
      for (let i = 0; i < pos.length; i += 3) {
        minX = Math.min(minX, pos[i]); maxX = Math.max(maxX, pos[i]);
        minY = Math.min(minY, pos[i+1]); maxY = Math.max(maxY, pos[i+1]);
        minZ = Math.min(minZ, pos[i+2]); maxZ = Math.max(maxZ, pos[i+2]);
      }
      const centroid = new THREE.Vector3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
      if (tumorGlowLight) {
        tumorGlowLight.position.copy(centroid);
        tumorGlowLight.distance = 3.2;
        tumorGlowLight.intensity = 1.4;
        tumorGlowLight.color.set(0xF59E0B);
      }
    }

    // 1. Tumor Core (TC: Deep Organic Flesh & Necrotic Center)
    if (surfaces.tc) {
      const tcGeo = buildGeometry(surfaces.tc);
      if (tcGeo) {
        const tcMat = new THREE.MeshPhysicalMaterial({
          color: 0xDC2626,
          roughness: 0.38,
          metalness: 0.08,
          bumpMap: organicBump,
          bumpScale: 0.035,
          emissive: 0x991B1B,
          emissiveIntensity: 0.42,
          transparent: true,
          opacity: 0.92,
          depthWrite: true,
          depthTest: true,
          side: THREE.DoubleSide,
        });
        const tcMesh = new THREE.Mesh(tcGeo, tcMat);
        tcMesh.renderOrder = 1; // Renders dense core
        tumorGroup.add(tcMesh);
        threeStateRef.current.tcMesh = tcMesh;
      }
    }

    // 2. Enhancing Tumor (ET: Active Angiogenic Cellular Rim)
    if (surfaces.et) {
      const etGeo = buildGeometry(surfaces.et);
      if (etGeo) {
        const etMat = new THREE.MeshPhysicalMaterial({
          color: 0x06B6D4,
          roughness: 0.26,
          metalness: 0.12,
          clearcoat: 0.25,
          clearcoatRoughness: 0.3,
          bumpMap: organicBump,
          bumpScale: 0.02,
          emissive: 0x0891B2,
          emissiveIntensity: 0.65,
          transparent: true,
          opacity: 0.95,
          depthWrite: true,
          depthTest: true,
          side: THREE.DoubleSide,
        });
        const etMesh = new THREE.Mesh(etGeo, etMat);
        etMesh.renderOrder = 2; // Renders active vascular rim
        tumorGroup.add(etMesh);
        threeStateRef.current.etMesh = etMesh;
      }
    }

    // 3. Whole Tumor (WT: Infiltrating Edema & Cellular Margin)
    if (surfaces.wt) {
      const wtGeo = buildGeometry(surfaces.wt);
      if (wtGeo) {
        const wtMat = new THREE.MeshPhysicalMaterial({
          color: 0xD99B00,
          roughness: 0.44,
          metalness: 0.05,
          transmission: 0.20,
          thickness: 0.85,
          bumpMap: organicBump,
          bumpScale: 0.025,
          emissive: 0x854D0E,
          emissiveIntensity: 0.35,
          transparent: true,
          opacity: 0.78,
          depthWrite: false, // Allows TC & ET inside to show through with volumetric realism
          depthTest: true,
          side: THREE.DoubleSide,
        });
        const wtMesh = new THREE.Mesh(wtGeo, wtMat);
        wtMesh.renderOrder = 3;
        tumorGroup.add(wtMesh);
        threeStateRef.current.wtMesh = wtMesh;

        // Elegant highlighted boundary rim (Inverted hull silhouette contour)
        const wtRimMat = new THREE.MeshBasicMaterial({
          color: 0xFBBF24,
          transparent: true,
          opacity: 0.35,
          side: THREE.BackSide,
          depthWrite: false,
          depthTest: true,
        });
        const wtRimMesh = new THREE.Mesh(wtGeo, wtRimMat);
        wtRimMesh.scale.setScalar(1.028);
        wtRimMesh.renderOrder = 4;
        tumorGroup.add(wtRimMesh);
        threeStateRef.current.wtWireframe = wtRimMesh;
      }
    }

    // Apply current visibility
    const tumorVisible = layers.tumor || layers.overlay;
    tumorGroup.visible = tumorVisible;
    if (threeStateRef.current.wtMesh) {
      threeStateRef.current.wtMesh.visible = tumorVisible && subregions.wt;
    }
    if (threeStateRef.current.wtWireframe) {
      threeStateRef.current.wtWireframe.visible = layers.overlay && subregions.wt;
    }
    if (threeStateRef.current.tcMesh) {
      threeStateRef.current.tcMesh.visible = tumorVisible && subregions.tc;
    }
    if (threeStateRef.current.etMesh) {
      threeStateRef.current.etMesh.visible = tumorVisible && subregions.et;
    }
    threeStateRef.current.fitCamera?.();
  }, [meshData]);

  // Update Brain Appearance Preset in Real-Time Without Reloading Model
  useEffect(() => {
    const { 
      brainMaterials, 
      ambientLight, 
      keyLight, 
      fillLight, 
      rimLight,
      bottomFill,
      bottomRimLight,
      bottomLateralFill,
      bottomAccentLight,
      bottomBounceLight
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

    // Update superior lighting for current appearance
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

    // Update inferior / bottom lighting rig
    if (bottomFill) {
      bottomFill.color.set(preset.bottomFillColor);
      bottomFill.intensity = preset.bottomFillIntensity;
    }
    if (bottomRimLight) {
      bottomRimLight.color.set(preset.bottomRimColor);
      bottomRimLight.intensity = preset.bottomRimIntensity;
    }
    if (bottomLateralFill) {
      bottomLateralFill.color.set(preset.bottomLateralColor);
      bottomLateralFill.intensity = preset.bottomLateralIntensity;
    }
    if (bottomAccentLight) {
      bottomAccentLight.color.set(preset.bottomAccentColor);
      bottomAccentLight.intensity = preset.bottomAccentIntensity;
    }
    if (bottomBounceLight) {
      bottomBounceLight.groundColor.set(preset.bottomBounceGround);
      bottomBounceLight.color.set(preset.bottomBounceSky);
      bottomBounceLight.intensity = preset.bottomBounceIntensity;
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
      mat.transparent = true;
      mat.depthWrite = false; // Ensures internal tumor mass is never blocked
      mat.depthTest = true;
      mat.side = THREE.FrontSide;
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
    const { camera, controls, brainGroup, tumorGroup, renderer, scene, brainMaterials, fitCamera } = threeStateRef.current;
    if (!camera || !controls) return;

    // 1. Immediately cancel auto-rotation
    setAutoRotate(false);
    controls.autoRotate = false;

    // 2. Restore camera position, up vector, lookAt target, and zoom via bounding-box framing
    if (typeof fitCamera === 'function') {
      fitCamera();
    } else {
      camera.position.set(0, 0.4, 3.6);
      camera.up.set(0, 1, 0);
      camera.zoom = 1.0;
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      controls.target.set(0, 0, 0);
      controls.update();
    }

    // 3. Reset OrbitControls target and internal damping/rotation state
    controls.target.set(0, 0, 0);
    if (typeof controls.reset === 'function') {
      controls.reset();
    }
    controls.target.set(0, 0, 0);
    controls.update();

    // 4. Ensure brainGroup and tumorGroup orientation, scale, and positions remain strictly aligned
    if (brainGroup) {
      brainGroup.position.set(0, 0, 0);
      brainGroup.rotation.set(0, 0, 0);
      brainGroup.scale.set(1, 1, 1);
    }
    if (tumorGroup) {
      tumorGroup.position.set(0, 0, 0);
      tumorGroup.rotation.set(0, 0, 0);
      tumorGroup.scale.set(1, 1, 1);
    }

    // 5. Ensure depthWrite remains false on brain materials so tumor is visible from all angles
    if (brainMaterials && brainMaterials.length > 0) {
      brainMaterials.forEach((mat) => {
        mat.depthWrite = false;
        mat.depthTest = true;
        mat.side = THREE.FrontSide;
        mat.needsUpdate = true;
      });
    }

    // 6. Force immediate render frame to eliminate any single-frame visual delay
    if (renderer && scene) {
      renderer.render(scene, camera);
    }

    if (onResetView) onResetView();
  }, [onResetView]);

  const handleRotateCamera = useCallback((direction, degrees = 15) => {
    const { camera, controls } = threeStateRef.current;
    if (!camera || !controls) return;
    const offset = camera.position.clone().sub(controls.target);
    const rad = THREE.MathUtils.degToRad(degrees);

    if (direction === 'left' || direction === 'right') {
      const sign = direction === 'left' ? 1 : -1;
      const axis = new THREE.Vector3(0, 1, 0);
      offset.applyAxisAngle(axis, sign * rad);
    } else if (direction === 'up' || direction === 'down') {
      const sign = direction === 'up' ? -1 : 1;
      const right = new THREE.Vector3().crossVectors(camera.up, offset).normalize();
      offset.applyAxisAngle(right, sign * rad);
    } else if (direction === '180') {
      const axis = new THREE.Vector3(0, 1, 0);
      offset.applyAxisAngle(axis, Math.PI);
    }
    camera.position.copy(controls.target).add(offset);
    controls.update();
  }, []);

  const handleViewAngle = useCallback((angle) => {
    const { camera, controls, framingDistance } = threeStateRef.current;
    if (!camera || !controls) return;
    const dist = framingDistance || 3.6;

    if (angle === 'inferior') {
      // Bottom / Underside aspect looking up at the illuminated cerebellum, brainstem & inferior temporal lobes
      camera.position.set(0, -dist * 0.85, dist * 0.35);
    } else if (angle === 'superior') {
      // Top / Superior aspect looking down
      camera.position.set(0, dist * 0.95, dist * 0.12);
    } else if (angle === 'lateral') {
      // Lateral right aspect
      camera.position.set(dist, dist * 0.08, 0);
    } else if (angle === 'anterior') {
      // Anterior front aspect
      camera.position.set(0, dist * 0.10, dist);
    } else if (angle === 'posterior') {
      // Posterior back aspect
      camera.position.set(0, dist * 0.10, -dist);
    } else {
      // Default isometric view
      camera.position.set(0, dist * 0.10, dist);
    }
    controls.target.set(0, 0, 0);
    camera.lookAt(0, 0, 0);
    controls.update();
    setShowAngleMenu(false);
  }, []);

  // React to voice commands targeting 3D Viewer
  useEffect(() => {
    if (!viewerCommand) return;
    const { type } = viewerCommand;
    if (type === 'ROTATE' || type === 'ROTATE_ONCE' || type === 'ROTATE_VERTICAL') {
      // One-shot discrete rotation: rotate once and ensure continuous autoRotate is stopped!
      setAutoRotate(false);
      handleRotateCamera(viewerCommand.direction, viewerCommand.degrees);
    } else if (type === 'START_CONTINUOUS_ROTATION') {
      // Continuous rotation
      const { controls } = threeStateRef.current;
      if (controls) {
        controls.autoRotateSpeed = viewerCommand.direction === 'left' ? -2.2 : 2.2;
      }
      setAutoRotate(true);
    } else if (type === 'STOP_ROTATION') {
      // Immediately cancel continuous rotation and freeze view
      setAutoRotate(false);
    } else if (type === 'RESET_ROTATION') {
      setAutoRotate(false);
      handleResetCamera();
    } else if (type === 'SET_CAMERA_ANGLE') {
      handleViewAngle(viewerCommand.angle);
    } else if (type === 'ZOOM') {
      handleZoom(1 / (viewerCommand.factor || 1.2));
    } else if (type === 'CENTER_VIEW' || type === 'RESET_VIEW') {
      setAutoRotate(false);
      handleResetCamera();
    } else if (type === 'SET_BRAIN_APPEARANCE') {
      handleSelectAppearance(viewerCommand.mode);
    } else if (type === 'STEP_BRIGHTNESS') {
      const { renderer } = threeStateRef.current;
      if (renderer) {
        const delta = (viewerCommand.delta || 15) / 100;
        renderer.toneMappingExposure = Math.max(0.6, Math.min(2.5, renderer.toneMappingExposure + delta));
      }
    }
  }, [viewerCommand, handleRotateCamera, handleResetCamera, handleViewAngle]);

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
        ctx.fillStyle = '#EAB308';
        ctx.fill();
        ctx.strokeStyle = '#CA8A04';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      if (subregions.tc) {
        ctx.beginPath();
        ctx.ellipse(30, -25, 25 * tumorScale, 20 * tumorScale, 0.2, 0, 2 * Math.PI);
        ctx.fillStyle = '#F43F5E';
        ctx.fill();
        ctx.strokeStyle = '#E11D48';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      if (subregions.et) {
        ctx.beginPath();
        ctx.ellipse(33, -23, 15 * tumorScale, 12 * tumorScale, 0.3, 0, 2 * Math.PI);
        ctx.fillStyle = '#06B6D4';
        ctx.fill();
        ctx.strokeStyle = '#0891B2';
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
      className="relative w-full h-full min-h-0 flex flex-col bg-[#060A12] medical-viewer-grid overflow-hidden select-none group"
    >
      {/* Top Anatomical Information Sub-Strip — Clean horizontal layout, strictly below heading and above 3D canvas */}
      <div className={cn(
        "w-full shrink-0 flex items-center justify-between border-b select-none z-20 backdrop-blur-xs",
        isCompactPreview 
          ? "h-6 px-2 bg-[#090E17]/95 border-[#172233] text-[9.5px]" 
          : "h-7 px-2.5 bg-[#090E17]/90 border-[#172233] text-[10.5px]"
      )}>
        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden whitespace-nowrap">
          {/* Badge 1: 3D Anatomy */}
          <div 
            className={cn(
              "rounded bg-[#151E2B]/90 border border-[#243348] text-[#F4F7FC] flex items-center gap-1.5 font-mono shrink-0 shadow-xs",
              isCompactPreview ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"
            )}
            title={viewMode === '3d' ? '3D Anatomy • Atlas Reference' : `${viewMode} Plane`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#4C8DFF] animate-pulse shrink-0" />
            <span className="font-semibold uppercase tracking-wider">
              {viewMode === '3d' ? '3D Anatomy' : `${viewMode} Plane`}
            </span>
            {!isCompactPreview && (
              <span className="text-[#8496AC] text-[9.5px]">
                {viewMode === '3d' 
                  ? '• Atlas Reference' 
                  : `• Slice ${viewMode === 'axial' ? axialSlice : viewMode === 'coronal' ? coronalSlice : sagittalSlice}`}
              </span>
            )}
          </div>

          {viewMode === '3d' && (
            <>
              {/* Badge 2: Normal Brain Atlas */}
              <div 
                className={cn(
                  "rounded bg-[#151E2B]/90 border border-[#243348] text-[#8496AC] flex items-center gap-1 font-mono shrink-0 shadow-xs",
                  isCompactPreview ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"
                )}
                title="Normal Brain Atlas Reference"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                <span>{isCompactPreview ? 'Atlas' : 'Normal Brain Atlas'}</span>
              </div>

              {/* Badge 3: Patient MRI Tumor */}
              {meshLoading ? (
                <div 
                  className={cn(
                    "rounded bg-[#151E2B]/90 border border-[#4C8DFF]/40 text-[#4C8DFF] flex items-center gap-1 font-mono shrink-0 shadow-xs animate-pulse",
                    isCompactPreview ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"
                  )}
                  title="Extracting Patient MRI Tumor Mesh from Volumetric NIfTI..."
                >
                  <Loader2 className="w-2.5 h-2.5 animate-spin shrink-0" />
                  <span>{isCompactPreview ? 'Extracting...' : 'Extracting Tumor Mesh...'}</span>
                </div>
              ) : meshData?.has_mesh ? (
                <div 
                  className={cn(
                    "rounded bg-[#35B982]/15 border border-[#35B982]/30 text-[#35B982] flex items-center gap-1 font-mono truncate shadow-xs",
                    isCompactPreview ? "px-1.5 py-0.5 text-[9px] max-w-[190px]" : "px-2 py-0.5 text-[10px]"
                  )}
                  title={`Patient MRI Tumor (${meshData.surfaces?.wt?.vertex_count?.toLocaleString() || 0} verts)`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#35B982] shrink-0" />
                  <span className="truncate">
                    {isCompactPreview 
                      ? (segSource === 'prediction' && confidenceThreshold
                          ? `Tumor (${meshData.surfaces?.wt?.vertex_count?.toLocaleString() || 0} v · Major)`
                          : `Tumor (${meshData.surfaces?.wt?.vertex_count?.toLocaleString() || 0} verts)`)
                      : (segSource === 'prediction' && confidenceThreshold
                          ? `Patient MRI Tumor (${meshData.surfaces?.wt?.vertex_count?.toLocaleString() || 0} verts · Major Region)`
                          : `Patient MRI Tumor (${meshData.surfaces?.wt?.vertex_count?.toLocaleString() || 0} verts)`)}
                  </span>
                </div>
              ) : (
                <div 
                  className={cn(
                    "rounded bg-[#151E2B]/90 border border-[#243348] text-[#8496AC] flex items-center gap-1 font-mono shrink-0 shadow-xs",
                    isCompactPreview ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"
                  )}
                  title={meshData?.message || "No Tumor in Mask"}
                >
                  <span>{meshData?.message ? "No High-Conf Regions (≥90%)" : "No Tumor in Mask"}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main 3D / 2D Viewport Area */}
      <div className="relative flex-1 w-full min-h-0 overflow-hidden medical-viewer-grid">
        {/* 3D WebGL Three.js Viewport (Visible in 3D Mode) */}
        <div
          ref={threeMountRef}
          className={`w-full h-full relative cursor-grab active:cursor-grabbing touch-none select-none medical-viewer-grid ${
            viewMode === '3d' ? 'block' : 'hidden'
          }`}
          style={{ touchAction: 'none' }}
        />

        {/* Loading Overlay for 3D Brain Model */}
        {viewMode === '3d' && modelLoading && (
          <div className="absolute inset-0 bg-[#05070B]/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[#4C8DFF] animate-spin" />
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-[#F4F7FC]">Loading 3D Anatomical Brain Mesh...</p>
              <p className="text-xs text-[#8496AC] font-mono">Applying multi-shade anatomical textures & gyri</p>
            </div>
          </div>
        )}

        {/* Error Overlay if GLB fails */}
        {viewMode === '3d' && modelLoadError && (
          <div className="absolute inset-0 bg-red-950/40 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center">
            <p className="text-sm font-semibold text-red-300">Failed to load 3D Brain model</p>
            <p className="text-xs text-[#8496AC] font-mono mt-1">{modelLoadError}</p>
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
            className="max-w-full max-h-full object-contain rounded-lg border border-[#1C2636] shadow-2xl"
          />
        </div>

        {/* Floating Viewport Quick Controls Pill at Bottom Right */}
        {!isCompactPreview && (
          <div
            ref={controlsRef}
            className="absolute bottom-2 right-2 z-20 flex items-center gap-1 bg-[#151E2B]/90 border border-[#243348] backdrop-blur-md p-1 rounded-lg shadow-clinical-md opacity-90 hover:opacity-100 transition-opacity"
          >
          {/* Appearance dropdown popover */}
          {viewMode === '3d' && showPaletteMenu && (
            <div className="absolute right-0 bottom-full mb-2 w-64 max-w-[calc(100vw-3rem)] bg-[#151E2B] border border-[#243348] rounded-xl shadow-clinical-lg p-2 z-40 backdrop-blur-md">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#1C2636] mb-1.5">
                <span className="text-[10px] font-mono uppercase text-[#8496AC] font-bold tracking-wider">
                  3D Brain Appearance
                </span>
                <span className="text-[9px] font-mono text-[#4C8DFF]">
                  {BRAIN_APPEARANCE_OPTIONS.length} Presets
                </span>
              </div>
              <div className="space-y-1">
                {BRAIN_APPEARANCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectAppearance(opt.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                      activeAppearance === opt.id
                        ? 'bg-[#4C8DFF]/20 text-[#4C8DFF] border border-[#4C8DFF]/40'
                        : 'text-[#F4F7FC] hover:bg-[#101722] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-sm shrink-0"
                        style={{ backgroundColor: opt.swatchColor }}
                      />
                      <div className="min-w-0">
                        <span className="block truncate font-semibold text-xs text-[#F4F7FC]">{opt.name}</span>
                        <span className="block truncate text-[10px] text-[#8496AC] font-mono">{opt.badge}</span>
                      </div>
                    </div>
                    {activeAppearance === opt.id && <Check className="w-4 h-4 text-[#4C8DFF] shrink-0 ml-1.5" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Orientation dropdown popover */}
          {viewMode === '3d' && showAngleMenu && (
            <div className="absolute right-0 bottom-full mb-2 w-52 max-w-[calc(100vw-3rem)] bg-[#151E2B] border border-[#243348] rounded-xl shadow-clinical-lg p-1.5 z-40 backdrop-blur-md">
              <div className="text-[10px] font-mono uppercase text-[#8496AC] px-2 py-1 border-b border-[#1C2636] mb-1 font-bold">
                Anatomical View
              </div>
              <button
                onClick={() => handleViewAngle('default')}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-left text-[#F4F7FC] hover:bg-[#101722] transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>Default Anterior</span>
                <span className="text-[10px] text-[#8496AC] font-mono">Front</span>
              </button>
              <button
                onClick={() => handleViewAngle('inferior')}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left text-[#35B982] hover:bg-[#35B982]/10 border border-[#35B982]/20 transition-colors flex items-center justify-between my-0.5 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Sun className="w-3 h-3 text-amber-400" />
                  Underside (Inferior)
                </span>
                <span className="text-[10px] text-[#35B982] font-mono">Bottom</span>
              </button>
              <button
                onClick={() => handleViewAngle('superior')}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-left text-[#F4F7FC] hover:bg-[#101722] transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>Superior View</span>
                <span className="text-[10px] text-[#8496AC] font-mono">Top</span>
              </button>
              <button
                onClick={() => handleViewAngle('lateral')}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-left text-[#F4F7FC] hover:bg-[#101722] transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>Lateral View</span>
                <span className="text-[10px] text-[#8496AC] font-mono">Right</span>
              </button>
            </div>
          )}

          {viewMode === '3d' && (
            <button
              onClick={() => {
                setShowPaletteMenu(prev => !prev);
                setShowAngleMenu(false);
              }}
              className={`p-1.5 rounded transition-colors flex items-center gap-1.5 text-xs font-mono cursor-pointer ${
                showPaletteMenu
                  ? 'bg-[#4C8DFF] text-white'
                  : 'hover:bg-[#101722] text-[#8496AC] hover:text-white'
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
          )}

          {viewMode === '3d' && (
            <button
              onClick={() => {
                setShowAngleMenu(prev => !prev);
                setShowPaletteMenu(false);
              }}
              className={`p-1.5 rounded transition-colors flex items-center gap-1 text-xs font-mono cursor-pointer ${
                showAngleMenu
                  ? 'bg-[#4C8DFF] text-white'
                  : 'hover:bg-[#101722] text-[#8496AC] hover:text-white'
              }`}
              title="Camera Orientations (Default, Underside/Inferior, Superior, Lateral)"
              aria-label="Camera Orientations"
            >
              <Compass className="w-4 h-4" />
            </button>
          )}

          {viewMode === '3d' && (
            <button
              onClick={() => setAutoRotate(prev => !prev)}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                autoRotate 
                  ? 'bg-[#4C8DFF] text-white' 
                  : 'hover:bg-[#101722] text-[#8496AC] hover:text-white'
              }`}
              title={autoRotate ? 'Pause Auto-Rotation' : 'Enable Auto-Rotation'}
              aria-label="Toggle Auto-Rotation"
            >
              {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={() => handleZoom(0.85)}
            className="p-1.5 rounded hover:bg-[#101722] text-[#8496AC] hover:text-white transition-colors cursor-pointer"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(1.15)}
            className="p-1.5 rounded hover:bg-[#101722] text-[#8496AC] hover:text-white transition-colors cursor-pointer"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetCamera}
            className="p-1.5 rounded hover:bg-[#101722] text-[#8496AC] hover:text-white transition-colors cursor-pointer"
            title="Reset Camera View"
            aria-label="Reset Camera"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
        )}
      </div>

      {/* Bottom Viewer Footer Bar */}
      <div className="h-6 px-2.5 bg-[#101722] border-t border-[#1C2636] flex items-center justify-between text-[10px] font-mono text-[#8496AC] z-10 shrink-0 select-none">
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <span>MODEL: <strong className="text-[#F4F7FC] uppercase">HUMAN BRAIN</strong></span>
          <span className="text-[#1C2636] shrink-0">•</span>
          <span className="text-[#4C8DFF] truncate">{currentOption.name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="font-tabular">{Math.round(opacity * 100)}%</span>
          <span className="text-[#1C2636]">•</span>
          <span className="text-[#35B982] font-semibold font-tabular">{fps} FPS</span>
        </div>
      </div>
    </div>
  );
}
