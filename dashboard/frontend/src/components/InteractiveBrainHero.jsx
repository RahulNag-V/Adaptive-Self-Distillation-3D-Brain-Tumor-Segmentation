import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import HandwritingText from './ui/handwriting-text';

/**
 * InteractiveBrainHero Component
 * 
 * Clean, realistic, and detailed 3D Human Brain hero visualization:
 * - Vivid bright orange anatomical human brain with realistic cortical gyri, sulci, cerebellum, and brainstem.
 * - Zero floating particles, zero outer dots, zero specks: clean standalone model.
 * - Continuous slow, smooth delta-time rotation.
 * - Click or tap to pause/resume rotation without resetting orientation.
 * - Drag to rotate with smooth inertial momentum (mouse & single-finger touch).
 * - Two-finger pinch to zoom (and mouse wheel) within safe bounds.
 */
export default function InteractiveBrainHero({ className = '', isDark = false }) {
  const mountRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInteracting, setIsInteracting] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 500;
    let height = container.clientHeight || 450;
    const isMobile = window.innerWidth < 768;

    // 1. Scene, Camera & WebGL Renderer
    const scene = new THREE.Scene();
    const ELEVATION_RAD = THREE.MathUtils.degToRad(15.0); // Exact 15.0° anatomical elevation
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    const initialDist = 4.28;
    camera.position.set(
      0,
      initialDist * Math.sin(ELEVATION_RAD),
      initialDist * Math.cos(ELEVATION_RAD)
    );
    camera.lookAt(0, 0, 0);

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
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.style.touchAction = 'none';
      container.appendChild(renderer.domElement);
    } catch (e) {
      console.warn('WebGL init fallback for InteractiveBrainHero:', e);
      return;
    }

    container.style.touchAction = 'none';

    // 2. High-Precision Studio Lighting for Realistic Biological Tissue
    const ambientLight = new THREE.AmbientLight(0xfff0f2, 1.15);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5f0, 2.2);
    keyLight.position.set(4, 5, 3.5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffb8b0, 1.3);
    fillLight.position.set(-4, -0.5, 2.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffd0c8, 1.6);
    rimLight.position.set(0, 4.5, -4);
    scene.add(rimLight);

    const inferiorLight = new THREE.DirectionalLight(0x8c1814, 1.2);
    inferiorLight.position.set(0, -4.5, 2.0);
    scene.add(inferiorLight);

    // 3. Brain Hierarchy: Pure Vertical-Axis Rotation Group
    // Rotating around the world vertical Y axis (0, 1, 0) prevents off-axis wobbling and gimbal roll.
    // The intended 15.0° anatomical downward viewing perspective is cleanly established by camera elevation.
    const brainGroup = new THREE.Group();
    const defaultYaw = -1.57; // Lateral profile orientation with frontal pole on left
    brainGroup.rotation.y = defaultYaw;
    scene.add(brainGroup);

    // Anatomical Physical Textures (Realistic Vascular Albedo, Sulcal Depths & Moist Serous Sheen)
    const textureLoader = new THREE.TextureLoader();
    const albedoMap = textureLoader.load('/models/textures/realistic_brain_albedo.png');
    albedoMap.colorSpace = THREE.SRGBColorSpace;
    albedoMap.wrapS = THREE.RepeatWrapping;
    albedoMap.wrapT = THREE.RepeatWrapping;

    const normalMap = textureLoader.load('/models/textures/gltf_embedded_2.png');
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;

    const roughnessMap = textureLoader.load('/models/textures/realistic_brain_roughness.png');
    roughnessMap.wrapS = THREE.RepeatWrapping;
    roughnessMap.wrapT = THREE.RepeatWrapping;

    let brainMesh = null;
    let brainMaterial = null;

    // 4. LOAD AUTHENTIC ANATOMICAL HUMAN BRAIN MODEL (BRIGHT ORANGE)
    const loader = new GLTFLoader();
    loader.load(
      '/models/human_brain.glb',
      (gltf) => {
        const model = gltf.scene;

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetScale = 2.45 / (maxDim || 1);

        model.scale.setScalar(targetScale);
        model.position.set(-center.x * targetScale, -center.y * targetScale, -center.z * targetScale);

        // Realistic Biological Cortical Physical Material with Microvascular & Sulcal Depth:
        brainMaterial = new THREE.MeshPhysicalMaterial({
          map: albedoMap,
          color: new THREE.Color(0xffffff),
          normalMap: normalMap,
          normalScale: new THREE.Vector2(2.4, 2.4),
          roughness: 0.32,
          roughnessMap: roughnessMap,
          metalness: 0.0,
          clearcoat: 0.44,
          clearcoatRoughness: 0.16,
          sheen: 0.65,
          sheenColor: new THREE.Color('#E88880'),
          sheenRoughness: 0.38,
          transmission: 0.14,
          thickness: 0.75,
          attenuationColor: new THREE.Color('#9E1C1A'),
          attenuationDistance: 1.4,
          transparent: false,
          opacity: 1.0,
          side: THREE.FrontSide,
        });

        model.traverse((child) => {
          if (child.isMesh) {
            child.geometry.computeVertexNormals();
            child.castShadow = true;
            child.receiveShadow = true;
            child.material = brainMaterial;
            brainMesh = child;
          }
        });

        // Set model in upright anatomical orientation and center at origin:
        model.rotation.set(0, 0, 0);
        brainGroup.add(model);

        if (typeof window !== 'undefined') {
          window.__threeBrain = { scene, camera, brainGroup, tiltGroup: brainGroup, model, interactionState };
        }

        setIsLoading(false);
      },
      undefined,
      (err) => {
        console.warn('Falling back to /models/brain.glb:', err);
        loader.load('/models/brain.glb', (gltf) => {
          const model = gltf.scene;
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const targetScale = 2.45 / (maxDim || 1);
          model.scale.setScalar(targetScale);
          model.position.set(-center.x * targetScale, -center.y * targetScale, -center.z * targetScale);

          brainMaterial = new THREE.MeshPhysicalMaterial({
            map: albedoMap,
            color: new THREE.Color(0xffffff),
            normalMap: normalMap,
            normalScale: new THREE.Vector2(2.4, 2.4),
            roughness: 0.32,
            roughnessMap: roughnessMap,
            metalness: 0.0,
            clearcoat: 0.44,
            clearcoatRoughness: 0.16,
            sheen: 0.65,
            sheenColor: new THREE.Color('#E88880'),
            sheenRoughness: 0.38,
            transmission: 0.14,
            thickness: 0.75,
            attenuationColor: new THREE.Color('#9E1C1A'),
            attenuationDistance: 1.4,
            transparent: false,
            opacity: 1.0,
          });

          model.traverse((child) => {
            if (child.isMesh) {
              child.material = brainMaterial;
              brainMesh = child;
            }
          });

          brainGroup.add(model);

          setIsLoading(false);
        });
      }
    );

    // 5. INTERACTION STATE & TOUCH / ROTATION CONTROLS
    const activePointers = new Map();
    let initialPinchDist = 0;
    let initialCameraDist = 4.28;

    // Accessibility: respects prefers-reduced-motion
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
      wasMultiTouch: false,
      pointerDownTime: 0,
      pointerDownX: 0,
      pointerDownY: 0,
      lastX: 0,
      lastY: 0,
      lastTime: 0,
      targetRotX: 0, // Resting pitch is 0; base 15.0° viewing elevation is maintained by camera
      targetRotY: defaultYaw,
      currentRotX: 0,
      currentRotY: defaultYaw,
      targetCameraDist: 4.28,
      currentCameraDist: 4.28,
      velocityX: 0,
      velocityY: 0,
      autoRotateSpeed: 0.28, // Smooth continuous rotation (~16.0°/sec, calibrated slightly faster)
      currentAutoSpeed: 0.28,
    };

    // 6. ANIMATION LOOP: DELTA-TIME ROTATION & PINCH-ZOOM
    const clock = new THREE.Clock();
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Frame-rate independent delta time (clamped to prevent jumps on background tab resume)
      const rawDelta = clock.getDelta();
      const delta = Math.min(rawDelta, 0.05);

      // CONTINUOUS ROTATION DYNAMICS:
      // Rotates automatically at a steady, elegant speed around the pure vertical Y axis.
      // Clicking/tapping the brain pauses rotation immediately without resetting orientation.
      const effectiveAutoSpeed = isReducedMotion ? 0.06 : interactionState.autoRotateSpeed;
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

        // Smooth delta-time continuous rotation from current angle:
        interactionState.targetRotY += interactionState.currentAutoSpeed * delta;

        // Natural spring-based return to base pitch (0 deflection, keeping pure vertical rotation):
        if (Math.abs(interactionState.targetRotX) > 0.001) {
          interactionState.targetRotX += (0 - interactionState.targetRotX) * Math.min(1.0, 2.0 * delta);
        }
      }

      const damping = Math.min(1.0, 10.0 * delta);
      interactionState.currentRotX += (interactionState.targetRotX - interactionState.currentRotX) * damping;
      interactionState.currentRotY += (interactionState.targetRotY - interactionState.currentRotY) * damping;

      brainGroup.rotation.x = interactionState.currentRotX;
      brainGroup.rotation.y = interactionState.currentRotY;
      brainGroup.rotation.z = 0;
      brainGroup.updateMatrixWorld();

      // SMOOTH PINCH-ZOOM CAMERA DYNAMICS with exact 15.0° viewing elevation:
      const cameraLerp = Math.min(1.0, 8.0 * delta);
      interactionState.currentCameraDist += (interactionState.targetCameraDist - interactionState.currentCameraDist) * cameraLerp;
      const camDist = interactionState.currentCameraDist;
      camera.position.set(
        0,
        camDist * Math.sin(ELEVATION_RAD),
        camDist * Math.cos(ELEVATION_RAD)
      );
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    // 7. UNIFIED POINTER & TOUCH INTERACTIONS (Desktop, Mobile & Tablet)
    const onPointerDown = (e) => {
      try {
        container.setPointerCapture(e.pointerId);
      } catch (err) { }

      activePointers.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        startX: e.clientX,
        startY: e.clientY,
        time: performance.now(),
      });

      if (activePointers.size === 1) {
        interactionState.isDragging = true;
        interactionState.hasMoved = false;
        interactionState.wasMultiTouch = false;
        interactionState.pointerDownTime = performance.now();
        interactionState.pointerDownX = e.clientX;
        interactionState.pointerDownY = e.clientY;
        interactionState.lastX = e.clientX;
        interactionState.lastY = e.clientY;
        interactionState.lastTime = performance.now();
        interactionState.velocityX = 0;
        interactionState.velocityY = 0;
      } else if (activePointers.size === 2) {
        interactionState.wasMultiTouch = true;
        interactionState.hasMoved = true;
        interactionState.isDragging = false;

        const [p1, p2] = Array.from(activePointers.values());
        initialPinchDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        initialCameraDist = interactionState.targetCameraDist;
      }

      container.style.cursor = 'grabbing';
    };

    const onPointerMove = (e) => {
      const now = performance.now();

      if (activePointers.has(e.pointerId)) {
        const ptr = activePointers.get(e.pointerId);
        ptr.x = e.clientX;
        ptr.y = e.clientY;
      }

      if (activePointers.size === 1 && interactionState.isDragging) {
        const deltaX = e.clientX - interactionState.lastX;
        const deltaY = e.clientY - interactionState.lastY;

        if (Math.hypot(e.clientX - interactionState.pointerDownX, e.clientY - interactionState.pointerDownY) > 8) {
          interactionState.hasMoved = true;
        }

        interactionState.lastX = e.clientX;
        interactionState.lastY = e.clientY;
        interactionState.lastTime = now;

        const sensitivity = isMobile ? 0.0065 : 0.0075;
        const rotDeltaY = deltaX * sensitivity;
        const rotDeltaX = deltaY * sensitivity;

        interactionState.targetRotY += rotDeltaY;
        interactionState.targetRotX = Math.max(-0.85, Math.min(0.85, interactionState.targetRotX + rotDeltaX));

        interactionState.velocityX = rotDeltaY * 0.8;
        interactionState.velocityY = rotDeltaX * 0.8;
      } else if (activePointers.size === 2) {
        interactionState.hasMoved = true;
        interactionState.wasMultiTouch = true;
        interactionState.isDragging = false;

        const [p1, p2] = Array.from(activePointers.values());
        const currentPinchDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);

        if (initialPinchDist > 5 && currentPinchDist > 5) {
          const pinchRatio = currentPinchDist / initialPinchDist;
          interactionState.targetCameraDist = Math.max(3.60, Math.min(5.40, initialCameraDist / pinchRatio));
        }
      }
    };

    const onPointerUp = (e) => {
      try {
        container.releasePointerCapture(e.pointerId);
      } catch (err) { }

      const pData = activePointers.get(e.pointerId);
      activePointers.delete(e.pointerId);

      // Tap-to-pause/resume: quick single tap without multi-touch
      if (pData && !interactionState.hasMoved && !interactionState.wasMultiTouch) {
        const gestureDuration = performance.now() - pData.time;
        const totalDist = Math.hypot(e.clientX - pData.startX, e.clientY - pData.startY);
        if (gestureDuration < 300 && totalDist < 8) {
          interactionState.isPaused = !interactionState.isPaused;
          setIsInteracting(interactionState.isPaused);
        }
      }

      if (activePointers.size === 0) {
        interactionState.isDragging = false;
        interactionState.wasMultiTouch = false;
        initialPinchDist = 0;
      } else if (activePointers.size === 1) {
        const remaining = Array.from(activePointers.values())[0];
        interactionState.lastX = remaining.x;
        interactionState.lastY = remaining.y;
        interactionState.lastTime = performance.now();
        initialPinchDist = 0;
      }

      container.style.cursor = 'grab';
    };

    const onPointerCancel = (e) => {
      try {
        container.releasePointerCapture(e.pointerId);
      } catch (err) { }

      activePointers.delete(e.pointerId);

      if (activePointers.size === 0) {
        interactionState.isDragging = false;
        interactionState.wasMultiTouch = false;
        initialPinchDist = 0;
      }

      container.style.cursor = 'grab';
    };

    // Smooth Desktop Wheel / Trackpad Pinch Zoom
    const onWheel = (e) => {
      e.preventDefault();
      const zoomDelta = e.deltaY * 0.0022;
      interactionState.targetCameraDist = Math.max(3.60, Math.min(5.40, interactionState.targetCameraDist + zoomDelta));
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('wheel', onWheel, { passive: false });
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

    // 9. WebGL Cleanup on Unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (motionQuery) {
        motionQuery.removeEventListener('change', onMotionChange);
      }

      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      if (brainMesh && brainMesh.geometry) {
        brainMesh.geometry.dispose();
      }
      if (brainMaterial) {
        brainMaterial.dispose();
      }
      albedoMap.dispose();
      normalMap.dispose();
      roughnessMap.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      className={`relative select-none flex flex-col items-center justify-center ${className}`}
      aria-label="Interactive 3D Bright Orange Human Brain Model. Drag to rotate. Click to pause."
    >
      {/* 3D Brain Viewport Container */}
      <div
        ref={mountRef}
        className="w-[340px] h-[320px] sm:w-[450px] sm:h-[410px] md:w-[480px] md:h-[440px] lg:w-[520px] lg:h-[460px] xl:w-[560px] xl:h-[500px] relative z-10 touch-none"
      />

      {/* Subtle Minimal Caption */}
      <div className="absolute bottom-1 flex flex-col items-center pointer-events-none select-none z-20">
        <span className="text-[11px] font-mono tracking-wider text-emerald-950/45 dark:text-emerald-100/45">
          <HandwritingText text="Drag to rotate • Click to pause" delay={1.40} stagger={0.018} duration={0.16} />
        </span>
      </div>
    </div>
  );
}
