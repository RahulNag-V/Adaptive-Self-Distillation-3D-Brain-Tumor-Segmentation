import React, { useState, useEffect, useCallback } from 'react';
import { 
  RotateCcw, 
  Layers, 
  Sliders, 
  Eye, 
  EyeOff, 
  Box, 
  CheckSquare, 
  Square, 
  Download,
  Grid,
  Maximize2,
  Loader2,
  Sparkles,
  Play,
  Database,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import MedicalViewer from '../viewer/MedicalViewer';
import OrthogonalSliceViewer from '../viewer/OrthogonalSliceViewer';
import SliceCoordinatesPanel from '../viewer/SliceCoordinatesPanel';
import { getPatients, getPatientMetadata, runPatientPrediction } from '../api/segmentation';
import { REGION_LEGEND, DEMO_CASE_METADATA } from '../utils/mockData';

export default function ViewerPage({ currentResult, onNavigate }) {
  // Patient and Dataset State
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(
    currentResult?.session_id || 'BraTS2021_01017'
  );
  const [patientMeta, setPatientMeta] = useState(null);
  const [metaLoading, setMetaLoading] = useState(false);

  // View Layout Mode: 'quad' (4-view MPR standard) | '3d' | 'axial' | 'coronal' | 'sagittal'
  const [viewLayout, setViewLayout] = useState('quad');

  // Shared 3D Voxel Coordinate State (Single Source of Truth)
  const [axialSlice, setAxialSlice] = useState(78);
  const [coronalSlice, setCoronalSlice] = useState(120);
  const [sagittalSlice, setSagittalSlice] = useState(120);

  // Active Sequence (FLAIR, T1, T1CE, T2)
  const [activeMriModality, setActiveMriModality] = useState('flair');

  // Segmentation Source: 'ground_truth' | 'prediction' | 'none'
  const [segSource, setSegSource] = useState('ground_truth');
  const [predicting, setPredicting] = useState(false);
  const [predictError, setPredictError] = useState(null);

  // Layer Visibility
  const [layers, setLayers] = useState({
    mri: true,
    tumor: true,
    overlay: true,
  });

  // Brain Surface & Segmentation Opacity (0.0 to 1.0)
  const [opacity, setOpacity] = useState(0.75);

  // Sub-region filters
  const [subregions, setSubregions] = useState({
    wt: true,
    tc: true,
    et: true,
  });

  // Fetch available patients on mount
  useEffect(() => {
    async function loadPatients() {
      try {
        const res = await getPatients();
        if (res && res.patients && res.patients.length > 0) {
          setPatients(res.patients);
          if (!currentResult && !res.patients.some(p => p.id === selectedPatientId)) {
            setSelectedPatientId(res.patients[0].id);
          }
        }
      } catch (err) {
        console.warn('Could not fetch patients list, using fallback:', err);
      }
    }
    loadPatients();
  }, [currentResult]);

  // Load patient metadata whenever selected patient changes
  useEffect(() => {
    let isMounted = true;
    async function loadMeta() {
      if (!selectedPatientId) return;
      setMetaLoading(true);
      try {
        const meta = await getPatientMetadata(selectedPatientId);
        if (isMounted && meta) {
          setPatientMeta(meta);
          // Safely center coordinates inside valid bounds
          if (meta.dimensions) {
            setAxialSlice(Math.floor(meta.dimensions.axial / 2));
            setCoronalSlice(Math.floor(meta.dimensions.coronal / 2));
            setSagittalSlice(Math.floor(meta.dimensions.sagittal / 2));
          }
        }
      } catch (err) {
        console.warn('Could not load patient metadata:', err);
      } finally {
        if (isMounted) setMetaLoading(false);
      }
    }
    loadMeta();
    return () => { isMounted = false; };
  }, [selectedPatientId]);

  // Dimensions derived from real metadata or fallback
  const dimensions = patientMeta?.dimensions || { axial: 155, coronal: 240, sagittal: 240 };

  // Volumetrics
  const wtVol = patientMeta?.volumetrics?.WT?.volume_cm3 ?? currentResult?.regions?.WT?.volume_cm3 ?? 42.15;
  const tcVol = patientMeta?.volumetrics?.TC?.volume_cm3 ?? currentResult?.regions?.TC?.volume_cm3 ?? 18.60;
  const etVol = patientMeta?.volumetrics?.ET?.volume_cm3 ?? currentResult?.regions?.ET?.volume_cm3 ?? 11.45;

  const toggleLayer = (layerKey) => {
    setLayers(prev => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  const toggleSubregion = (key) => {
    setSubregions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Reset coordinates to center and restore default camera
  const handleReset = () => {
    setAxialSlice(Math.floor(dimensions.axial / 2));
    setCoronalSlice(Math.floor(dimensions.coronal / 2));
    setSagittalSlice(Math.floor(dimensions.sagittal / 2));
    setOpacity(0.75);
  };

  // Two-way synchronization: handle click in any 2D orthogonal viewer
  const handleCoordinateClick = useCallback((newCoords) => {
    if (newCoords.x !== undefined) setSagittalSlice(newCoords.x);
    if (newCoords.y !== undefined) setCoronalSlice(newCoords.y);
    if (newCoords.z !== undefined) setAxialSlice(newCoords.z);
  }, []);

  // Run on-demand prediction using trained Adaptive UNETR model
  const handleRunPrediction = async () => {
    if (!selectedPatientId) return;
    setPredicting(true);
    setPredictError(null);
    try {
      await runPatientPrediction(selectedPatientId);
      // Refresh patient metadata to reflect new prediction.nii.gz
      const updatedMeta = await getPatientMetadata(selectedPatientId);
      if (updatedMeta) setPatientMeta(updatedMeta);
      setSegSource('prediction');
    } catch (err) {
      setPredictError(err.message || 'Model prediction failed.');
    } finally {
      setPredicting(false);
    }
  };

  const dimensionsStr = `${dimensions.sagittal} × ${dimensions.coronal} × ${dimensions.axial} voxels (1.0mm³)`;

  return (
    <div className="h-full flex flex-col p-3 lg:p-5 space-y-3 overflow-hidden">
      {/* Top Banner / Case Identifier & Sequence Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-medical-base border border-medical-border px-4 py-2.5 rounded-xl shadow-md">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-medical-teal animate-pulse" />
            <span className="text-xs text-medical-muted uppercase font-mono font-semibold">Case:</span>
          </div>

          {/* Patient Selector Dropdown */}
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="bg-medical-card border border-medical-teal/40 hover:border-medical-teal text-white text-xs font-mono font-semibold px-2.5 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-medical-teal cursor-pointer"
          >
            {currentResult && (
              <option value={currentResult.session_id}>
                Live Session: {currentResult.session_id.substring(0, 16)}...
              </option>
            )}
            {patients.length > 0 ? (
              patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} {p.is_validation ? '(Validation Split)' : ''}
                </option>
              ))
            ) : (
              <option value="BraTS2021_01017">BraTS2021_01017 (Training)</option>
            )}
          </select>

          <span className="text-xs text-medical-muted border-l border-medical-border pl-3 hidden md:inline font-mono">
            Dimensions: {dimensionsStr}
          </span>

          {currentResult ? (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-300">
              Live Prediction Loaded
            </span>
          ) : (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-medical-teal/15 border border-medical-teal/30 text-medical-tealLight">
              3D Brain Anatomy Active
            </span>
          )}

          {metaLoading && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-medical-teal">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Loading volume...</span>
            </span>
          )}
        </div>

        {/* MRI Active Sequence Selector: FLAIR, T1, T1CE, T2 */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-medical-muted text-[11px] uppercase tracking-wider hidden sm:inline">Active Sequence:</span>
          {['flair', 't1', 't1ce', 't2'].map((mod) => (
            <button
              key={mod}
              onClick={() => setActiveMriModality(mod)}
              className={`px-3 py-1 rounded uppercase tracking-wider text-[11px] font-bold transition-all shadow-sm ${
                activeMriModality === mod
                  ? 'bg-medical-teal text-medical-darkest shadow-medical-teal/30 scale-105'
                  : 'bg-medical-surface text-medical-muted hover:text-white hover:bg-medical-card border border-medical-border'
              }`}
            >
              {mod}
            </button>
          ))}

          {currentResult?.prediction_file && (
            <a
              href={currentResult.prediction_file}
              download="prediction.nii.gz"
              className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-medical-card border border-medical-border text-white text-xs hover:border-medical-teal"
              title="Download Prediction NIfTI"
            >
              <Download className="w-3 h-3 text-medical-teal" />
              <span>NIfTI</span>
            </a>
          )}
        </div>
      </div>

      {/* 3-COLUMN CLINICAL WORKSPACE: LEFT (CONTROLS) | CENTER (VIEWPORTS) | RIGHT (LAYERS) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
        
        {/* LEFT COLUMN: Projection Mode & Slice Coordinates Panel (3 cols on lg) */}
        <div className="lg:col-span-3 bg-medical-base border border-medical-border rounded-xl p-3.5 flex flex-col justify-between space-y-4 overflow-y-auto">
          <div className="space-y-4">
            
            {/* Projection / Layout Mode Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-medical-muted font-semibold block">
                Projection Mode
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-medical-card border border-medical-border">
                {[
                  { id: 'quad', label: 'Quad MPR (4-up)', icon: Grid },
                  { id: '3d', label: '3D Volume', icon: Box },
                  { id: 'axial', label: 'Axial (Z)', icon: null },
                  { id: 'coronal', label: 'Coronal (Y)', icon: null },
                  { id: 'sagittal', label: 'Sagittal (X)', icon: null },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setViewLayout(id)}
                    className={`py-1.5 px-2 rounded text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                      id === 'quad' ? 'col-span-2' : ''
                    } ${
                      viewLayout === id
                        ? 'bg-medical-teal text-medical-darkest font-semibold shadow-sm'
                        : 'text-medical-muted hover:text-white hover:bg-medical-surface'
                    }`}
                  >
                    {Icon && <Icon className="w-3 h-3" />}
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* FULLY FUNCTIONAL SLICE COORDINATES PANEL (Reference Design) */}
            <SliceCoordinatesPanel
              axialSlice={axialSlice}
              coronalSlice={coronalSlice}
              sagittalSlice={sagittalSlice}
              dimensions={dimensions}
              onAxialChange={setAxialSlice}
              onCoronalChange={setCoronalSlice}
              onSagittalChange={setSagittalSlice}
            />
          </div>

          {/* Tool Action Buttons */}
          <div className="pt-3 border-t border-medical-border/70 space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-medical-muted block">
              Viewport Actions
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-medical-surface hover:bg-medical-card border border-medical-border text-white transition-all shadow-sm"
                title="Reset Slices & Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5 text-medical-muted" />
                <span>Reset View</span>
              </button>
              <button
                onClick={() => setViewLayout('quad')}
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-medical-surface hover:bg-medical-card border border-medical-border text-white transition-all shadow-sm"
                title="Default 4-View MPR"
              >
                <Grid className="w-3.5 h-3.5 text-medical-teal" />
                <span>Quad MPR</span>
              </button>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: Interactive 3D & 2D Multi-Planar Reconstruction (6 cols on lg) */}
        <div className="lg:col-span-6 flex flex-col min-h-0 h-full overflow-hidden">
          {viewLayout === 'quad' ? (
            /* QUAD MPR VIEW: 2x2 Synchronized Grid (3D + Axial + Coronal + Sagittal) */
            <div className="grid grid-cols-1 sm:grid-cols-2 grid-rows-2 gap-2 h-full min-h-0">
              {/* Viewport 1: 3D Anatomical Brain & Segmented Tumor */}
              <div className="h-full min-h-[220px]">
                <MedicalViewer
                  viewMode="3d"
                  layers={layers}
                  opacity={opacity}
                  subregions={subregions}
                  onResetView={handleReset}
                />
              </div>

              {/* Viewport 2: Axial (Z) Plane */}
              <div className="h-full min-h-[220px]">
                <OrthogonalSliceViewer
                  plane="axial"
                  title="Axial (Z)"
                  patientId={selectedPatientId}
                  sliceIndex={axialSlice}
                  totalSlices={dimensions.axial}
                  modality={activeMriModality}
                  segSource={segSource}
                  subregions={subregions}
                  opacity={opacity}
                  showOverlay={layers.tumor || layers.overlay}
                  crosshair={{ x: sagittalSlice, y: coronalSlice, z: axialSlice }}
                  dimensions={dimensions}
                  onSliceChange={setAxialSlice}
                  onCoordinateClick={handleCoordinateClick}
                  accentColor="teal"
                />
              </div>

              {/* Viewport 3: Coronal (Y) Plane */}
              <div className="h-full min-h-[220px]">
                <OrthogonalSliceViewer
                  plane="coronal"
                  title="Coronal (Y)"
                  patientId={selectedPatientId}
                  sliceIndex={coronalSlice}
                  totalSlices={dimensions.coronal}
                  modality={activeMriModality}
                  segSource={segSource}
                  subregions={subregions}
                  opacity={opacity}
                  showOverlay={layers.tumor || layers.overlay}
                  crosshair={{ x: sagittalSlice, y: coronalSlice, z: axialSlice }}
                  dimensions={dimensions}
                  onSliceChange={setCoronalSlice}
                  onCoordinateClick={handleCoordinateClick}
                  accentColor="cyan"
                />
              </div>

              {/* Viewport 4: Sagittal (X) Plane */}
              <div className="h-full min-h-[220px]">
                <OrthogonalSliceViewer
                  plane="sagittal"
                  title="Sagittal (X)"
                  patientId={selectedPatientId}
                  sliceIndex={sagittalSlice}
                  totalSlices={dimensions.sagittal}
                  modality={activeMriModality}
                  segSource={segSource}
                  subregions={subregions}
                  opacity={opacity}
                  showOverlay={layers.tumor || layers.overlay}
                  crosshair={{ x: sagittalSlice, y: coronalSlice, z: axialSlice }}
                  dimensions={dimensions}
                  onSliceChange={setSagittalSlice}
                  onCoordinateClick={handleCoordinateClick}
                  accentColor="blue"
                />
              </div>
            </div>
          ) : viewLayout === '3d' ? (
            /* SINGLE FOCUS: 3D Volume Viewport */
            <div className="w-full h-full">
              <MedicalViewer
                viewMode="3d"
                layers={layers}
                opacity={opacity}
                subregions={subregions}
                onResetView={handleReset}
              />
            </div>
          ) : (
            /* SINGLE FOCUS: Maximized Orthogonal Slice Viewport */
            <div className="w-full h-full">
              <OrthogonalSliceViewer
                plane={viewLayout}
                title={
                  viewLayout === 'axial'
                    ? 'Axial Plane (Z)'
                    : viewLayout === 'coronal'
                    ? 'Coronal Plane (Y)'
                    : 'Sagittal Plane (X)'
                }
                patientId={selectedPatientId}
                sliceIndex={
                  viewLayout === 'axial'
                    ? axialSlice
                    : viewLayout === 'coronal'
                    ? coronalSlice
                    : sagittalSlice
                }
                totalSlices={
                  viewLayout === 'axial'
                    ? dimensions.axial
                    : viewLayout === 'coronal'
                    ? dimensions.coronal
                    : dimensions.sagittal
                }
                modality={activeMriModality}
                segSource={segSource}
                subregions={subregions}
                opacity={opacity}
                showOverlay={layers.tumor || layers.overlay}
                crosshair={{ x: sagittalSlice, y: coronalSlice, z: axialSlice }}
                dimensions={dimensions}
                onSliceChange={(idx) => {
                  if (viewLayout === 'axial') setAxialSlice(idx);
                  else if (viewLayout === 'coronal') setCoronalSlice(idx);
                  else setSagittalSlice(idx);
                }}
                onCoordinateClick={handleCoordinateClick}
                accentColor={
                  viewLayout === 'axial'
                    ? 'teal'
                    : viewLayout === 'coronal'
                    ? 'cyan'
                    : 'blue'
                }
              />
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Layer Visibility, Segmentation Source, Opacity & Tumor Sub-regions (3 cols on lg) */}
        <div className="lg:col-span-3 bg-medical-base border border-medical-border rounded-xl p-3.5 flex flex-col justify-between space-y-4 overflow-y-auto">
          <div className="space-y-4">
            
            {/* Segmentation Data Source Toggle: Ground Truth vs Model Prediction */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-medical-muted font-semibold">
                  Segmentation Source
                </span>
                <Database className="w-3.5 h-3.5 text-medical-teal" />
              </div>

              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-medical-card border border-medical-border">
                <button
                  onClick={() => setSegSource('ground_truth')}
                  className={`py-1.5 px-2 rounded text-xs font-medium transition-all ${
                    segSource === 'ground_truth'
                      ? 'bg-medical-teal text-medical-darkest font-semibold shadow-sm'
                      : 'text-medical-muted hover:text-white hover:bg-medical-surface'
                  }`}
                >
                  Ground Truth
                </button>
                <button
                  onClick={() => setSegSource('prediction')}
                  className={`py-1.5 px-2 rounded text-xs font-medium transition-all ${
                    segSource === 'prediction'
                      ? 'bg-medical-teal text-medical-darkest font-semibold shadow-sm'
                      : 'text-medical-muted hover:text-white hover:bg-medical-surface'
                  }`}
                >
                  Prediction (UNETR)
                </button>
              </div>

              {/* Prediction Availability Banner */}
              {segSource === 'prediction' && !patientMeta?.has_prediction && !currentResult && (
                <div className="p-2.5 rounded-lg bg-medical-surface border border-medical-border/90 space-y-2 text-xs">
                  <div className="flex items-start gap-1.5 text-medical-muted text-[11px] leading-tight">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>Model prediction not yet generated for this subject.</span>
                  </div>
                  <button
                    onClick={handleRunPrediction}
                    disabled={predicting}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded bg-medical-teal hover:bg-medical-tealLight text-medical-darkest text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    {predicting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Running UNETR Inference...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        <span>Run Adaptive Inference</span>
                      </>
                    )}
                  </button>
                  {predictError && (
                    <p className="text-[10px] text-red-400 font-mono">{predictError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Layer Visibility Toggles */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-medical-muted font-semibold">
                  Layer Visibility
                </span>
                <Layers className="w-3.5 h-3.5 text-medical-teal" />
              </div>

              <div className="space-y-1.5">
                {[
                  { key: 'mri', label: 'MRI Anatomical Scan' },
                  { key: 'tumor', label: 'Tumor Segmentation' },
                  { key: 'overlay', label: 'Boundary Overlay Mesh' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => toggleLayer(key)}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-medical-card border border-medical-border/80 hover:border-medical-borderLight text-xs text-left transition-all"
                  >
                    <span className="text-white font-medium">{label}</span>
                    {layers[key] ? (
                      <Eye className="w-4 h-4 text-medical-teal" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-medical-muted" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Brain Surface & Segmentation Opacity Slider */}
            <div className="space-y-1.5 p-3 bg-medical-card rounded-lg border border-medical-border/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white font-medium">Brain Surface Opacity</span>
                <span className="font-mono text-medical-teal font-bold">{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full accent-medical-teal cursor-pointer h-1.5 bg-medical-surface rounded-lg"
              />
              <p className="text-[10px] text-medical-muted leading-tight">
                Adjust opacity to see through the 3D brain surface into the internal tumor segmentation.
              </p>
            </div>

            {/* Sub-region Filter Toggles with BraTS Standard Color Legend */}
            <div className="space-y-2 pt-2 border-t border-medical-border/70">
              <span className="text-xs font-mono uppercase tracking-wider text-medical-muted font-semibold block">
                Tumor Sub-Regions
              </span>

              <div className="space-y-1.5">
                {REGION_LEGEND.map((region) => {
                  const key = region.code.toLowerCase();
                  const isChecked = subregions[key];
                  const vol = key === 'wt' ? wtVol : key === 'tc' ? tcVol : etVol;

                  return (
                    <div
                      key={region.code}
                      onClick={() => toggleSubregion(key)}
                      className="p-2 rounded-lg bg-medical-card border border-medical-border/80 hover:border-medical-borderLight cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded shadow-sm" style={{ backgroundColor: region.color }} />
                        <div>
                          <div className="text-xs font-semibold text-white">
                            {region.name} ({region.code})
                          </div>
                          <div className="text-[10px] text-medical-muted font-mono">
                            Vol: {typeof vol === 'number' ? vol.toFixed(2) : vol} cm³
                          </div>
                        </div>
                      </div>

                      <div className="text-medical-teal">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4 text-medical-muted" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Nav to Results */}
          <div className="pt-3 border-t border-medical-border/70">
            <button
              onClick={() => onNavigate && onNavigate('results')}
              className="w-full py-2 px-3 rounded-lg bg-medical-surface hover:bg-medical-card border border-medical-border text-xs text-medical-tealLight hover:text-white transition-all text-center font-medium shadow-sm"
            >
              View Full Metrics Table →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
