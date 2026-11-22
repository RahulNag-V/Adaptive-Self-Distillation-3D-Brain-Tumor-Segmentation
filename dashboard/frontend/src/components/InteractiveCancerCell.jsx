import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import HandwritingText from './ui/handwriting-text';

/**
 * InteractiveCancerCell Component
 * 
 * Secondary 3D visualization on the homepage hero:
 * - Loads the authentic attached cancer_cell.glb model.
 * - Displays an intricate, high-detail biological malignant cell with microvilli and membrane ruffles.
 * - Perfectly scaled to ~35-40% of the main brain's visible diameter.
 * - Smooth, calm, continuous auto-rotation (~0.04 rad/sec).
 * - Independent mouse drag & touch rotation with momentum damping.
 * - Completely isolated from the central brain and page scrolling.
 * - Zero decorative particles, zero cards, zero clutter.
 */
export default function InteractiveCancerCell({ className = '', isDark = false }) {
  const mountRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 200;
    let height = container.clientHeight || 200;
    const isMobile = window.innerWidth < 768;

    // 1. Scene, Camera & WebGL Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0, 2.5);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.domElement.style.touchAction = 'none';
      container.appendChild(renderer.domElement);
    } catch (e) {
      console.warn('WebGL init fallback for InteractiveCancerCell:', e);
      return;
    }

    container.style.touchAction = 'none';

    // 2. Specialized Cellular Studio Lighting (Calibrated for Fleshy Maroon Tumor Realism)
    const ambientLight = new THREE.AmbientLight(0xfff0f2, 1.25);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(3.5, 4.5, 3.5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xfecdd3, 1.2);
    fillLight.position.set(-3.5, -1, 2.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xf43f5e, 1.5);
    rimLight.position.set(0, 4.0, -3.5);
    scene.add(rimLight);

    const inferiorLight = new THREE.DirectionalLight(0x881337, 1.1);
    inferiorLight.position.set(0, -4.0, 2.0);
    scene.add(inferiorLight);

    // 3. Hierarchy: Cancer cell rotating group
    const cellGroup = new THREE.Group();
    scene.add(cellGroup);

    // Realistic Biological Textures (Dark Reddish / Maroon Tissue & Wet Biological Shine)
    const textureLoader = new THREE.TextureLoader();
    const cellAlbedoMap = textureLoader.load('/models/textures/realistic_cell_albedo.png');
    cellAlbedoMap.colorSpace = THREE.SRGBColorSpace;
    cellAlbedoMap.wrapS = THREE.RepeatWrapping;
    cellAlbedoMap.wrapT = THREE.RepeatWrapping;

    const cellNormalMap = textureLoader.load('/models/cancer_cell_img_2.png');
    cellNormalMap.wrapS = THREE.RepeatWrapping;
    cellNormalMap.wrapT = THREE.RepeatWrapping;

    const cellRoughnessMap = textureLoader.load('/models/textures/realistic_cell_roughness.png');
    cellRoughnessMap.wrapS = THREE.RepeatWrapping;
    cellRoughnessMap.wrapT = THREE.RepeatWrapping;

    let cellMesh = null;
    let cellMaterial = null;

    // 4. Load Authentic Attached cancer_cell.glb
    const loader = new GLTFLoader();
    loader.load(
      '/models/cancer_cell.glb',
      (gltf) => {
        const model = gltf.scene;

        model.traverse((child) => {
          if (child.isMesh) {
            cellMesh = child;
            child.geometry.computeVertexNormals();
            child.castShadow = true;
            child.receiveShadow = true;

            // Fleshy Maroon Biological Material with Wet Shine matching reference:
            cellMaterial = new THREE.MeshPhysicalMaterial({
              map: cellAlbedoMap,
              color: new THREE.Color(0xffffff),
              normalMap: cellNormalMap,
              normalScale: new THREE.Vector2(2.4, 2.4),
              roughnessMap: cellRoughnessMap,
              roughness: 0.28,
              metalness: 0.0,
              clearcoat: 0.65,
              clearcoatRoughness: 0.14,
              sheen: 0.55,
              sheenColor: new THREE.Color('#9E1C2E'),
              sheenRoughness: 0.35,
              transmission: 0.16,
              thickness: 0.85,
              attenuationColor: new THREE.Color('#5E0E18'),
              attenuationDistance: 1.2,
              side: THREE.FrontSide,
            });
            child.material = cellMaterial;
          }
        });

        // Center and scale model uniformly to target ~35-40% of brain diameter
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetScale = 1.48 / (maxDim || 1);

        model.scale.setScalar(targetScale);
        model.position.set(-center.x * targetScale, -center.y * targetScale, -center.z * targetScale);
        model.rotation.set(0, 0, 0);

        cellGroup.add(model);
        setIsLoading(false);

        if (typeof window !== 'undefined') {
          window.__threeCancerCell = { scene, camera, cellGroup, model, interactionState };
        }
      },
      undefined,
      (err) => {
        console.warn('Error loading /models/cancer_cell.glb:', err);
        setIsLoading(false);
      }
    );

    // 5. Interaction State & Motion Controls
    const motionQuery = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    let isReducedMotion = motionQuery ? motionQuery.matches : false;
    const onMotionChange = (e) => { isReducedMotion = e.matches; };
    if (motionQuery) {
      motionQuery.addEventListener('change', onMotionChange);
    }

    const interactionState = {
      isDragging: false,
      isPaused: false,
      hasMoved: false,
      pointerDownTime: 0,
      pointerDownX: 0,
      pointerDownY: 0,
      lastX: 0,
      lastY: 0,
      targetRotX: 0,
      targetRotY: 0,
      currentRotX: 0,
      currentRotY: 0,
      velocityX: 0,
      velocityY: 0,
      autoRotateSpeed: 0.14,
      currentAutoSpeed: 0.14,
    };

    // 6. Animation Loop: Delta-time rotation
    const clock = new THREE.Clock();
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const rawDelta = clock.getDelta();
      const delta = Math.min(rawDelta, 0.05);

      const effectiveAutoSpeed = interactionState.autoRotateSpeed;
      if (interactionState.isPaused || interactionState.isDragging) {
        interactionState.currentAutoSpeed = 0.0;
      } else {
        const resumeLerp = Math.min(1.0, 5.0 * delta);
        interactionState.currentAutoSpeed += (effectiveAutoSpeed - interactionState.currentAutoSpeed) * resumeLerp;
      }

      if (!interactionState.isDragging) {
        interactionState.velocityX *= Math.exp(-6.0 * delta);
        interactionState.velocityY *= Math.exp(-6.0 * delta);

        interactionState.targetRotY += interactionState.velocityX;
        interactionState.targetRotX += interactionState.velocityY;

        // Extremely slow, smooth automatic rotation around vertical Y axis
        interactionState.targetRotY += interactionState.currentAutoSpeed * delta;

        // Spring return for pitch (rotX)
        if (Math.abs(interactionState.targetRotX) > 0.001) {
          interactionState.targetRotX += (0 - interactionState.targetRotX) * Math.min(1.0, 2.5 * delta);
        }
      }

      const damping = Math.min(1.0, 10.0 * delta);
      interactionState.currentRotX += (interactionState.targetRotX - interactionState.currentRotX) * damping;
      interactionState.currentRotY += (interactionState.targetRotY - interactionState.currentRotY) * damping;

      cellGroup.rotation.x = interactionState.currentRotX;
      cellGroup.rotation.y = interactionState.currentRotY;
      cellGroup.updateMatrixWorld();

      renderer.render(scene, camera);
    };

    animate();

    // 7. Independent Pointer Interaction (Drag to Rotate + Click to Pause)
    const onPointerDown = (e) => {
      try {
        container.setPointerCapture(e.pointerId);
      } catch (err) {}

      interactionState.isDragging = true;
      interactionState.pointerDownTime = performance.now();
      interactionState.pointerDownX = e.clientX;
      interactionState.pointerDownY = e.clientY;
      interactionState.hasMoved = false;
      interactionState.lastX = e.clientX;
      interactionState.lastY = e.clientY;
      interactionState.velocityX = 0;
      interactionState.velocityY = 0;
      container.style.cursor = 'grabbing';
    };

    const onPointerMove = (e) => {
      if (!interactionState.isDragging) return;

      const deltaX = e.clientX - interactionState.lastX;
      const deltaY = e.clientY - interactionState.lastY;

      if (Math.hypot(e.clientX - interactionState.pointerDownX, e.clientY - interactionState.pointerDownY) > 8) {
        interactionState.hasMoved = true;
      }

      interactionState.lastX = e.clientX;
      interactionState.lastY = e.clientY;

      const sensitivity = isMobile ? 0.007 : 0.008;
      const rotDeltaY = deltaX * sensitivity;
      const rotDeltaX = deltaY * sensitivity;

      interactionState.targetRotY += rotDeltaY;
      interactionState.targetRotX = Math.max(-0.75, Math.min(0.75, interactionState.targetRotX + rotDeltaX));

      interactionState.velocityX = rotDeltaY * 0.8;
      interactionState.velocityY = rotDeltaX * 0.8;
    };

    const onPointerUp = (e) => {
      try {
        container.releasePointerCapture(e.pointerId);
      } catch (err) {}

      const duration = performance.now() - (interactionState.pointerDownTime || 0);
      if (!interactionState.hasMoved && duration < 350) {
        interactionState.isPaused = !interactionState.isPaused;
      }

      interactionState.isDragging = false;
      container.style.cursor = 'grab';
    };

    const onPointerCancel = (e) => {
      try {
        container.releasePointerCapture(e.pointerId);
      } catch (err) {}

      interactionState.isDragging = false;
      container.style.cursor = 'grab';
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);

    container.style.cursor = 'grab';

    // 8. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    // 9. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (motionQuery) {
        motionQuery.removeEventListener('change', onMotionChange);
      }

      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      if (cellMesh && cellMesh.geometry) {
        cellMesh.geometry.dispose();
      }
      if (cellMaterial) {
        cellMaterial.dispose();
      }
      cellAlbedoMap.dispose();
      cellNormalMap.dispose();
      cellRoughnessMap.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      className={`relative select-none flex flex-col items-center justify-center ${className}`}
      aria-label="Interactive 3D Cancer Cell Model. Drag to rotate. Click to pause."
    >
      {/* 3D Cancer Cell Viewport Container */}
      <div
        ref={mountRef}
        className="w-[150px] h-[150px] sm:w-[170px] sm:h-[170px] md:w-[185px] md:h-[185px] lg:w-[210px] lg:h-[210px] relative z-10 touch-none"
      />

      {/* Subtle Minimal Caption matching attached reference image */}
      <div className="absolute -bottom-4 flex flex-col items-center pointer-events-none select-none z-20">
        <span className="text-[11px] font-mono tracking-wider text-emerald-950/45 dark:text-emerald-100/45 whitespace-nowrap underline underline-offset-2 decoration-1 decoration-emerald-950/45 dark:decoration-emerald-100/45">
          <HandwritingText text="Cancer Cell" delay={1.55} stagger={0.025} duration={0.18} />
        </span>
      </div>
    </div>
  );
}
