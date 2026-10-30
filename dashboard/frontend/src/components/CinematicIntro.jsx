import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, SkipForward, Volume2, VolumeX, Sparkles } from 'lucide-react';

/**
 * CinematicIntro Component
 * Reconstructs and plays the 4K cinematic video reconstructed from source frames.
 * - Auto-plays on initial page opening and genuine browser reloads
 * - Smoothly fades out to reveal the existing website upon completion
 * - Handles browser autoplay restrictions gracefully
 * - Completely unmounts/releases video resources after playback
 */
export default function CinematicIntro({ onComplete }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [isFading, setIsFading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(10);
  const [isMuted, setIsMuted] = useState(true);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Terminate intro and hand off control to main application
  const finishIntro = useCallback(() => {
    setIsFading(true);
    setTimeout(() => {
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.removeAttribute('src');
          videoRef.current.load();
        } catch (e) {
          // ignore cleanup errors
        }
      }
      if (onComplete) {
        onComplete();
      }
    }, 650);
  }, [onComplete]);

  // Attempt automatic video playback
  const startPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    const playPromise = video.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setHasStarted(true);
          setPlaybackBlocked(false);
        })
        .catch((err) => {
          console.warn('[CinematicIntro] Browser autoplay prevented:', err);
          setPlaybackBlocked(true);
        });
    }
  }, []);

  useEffect(() => {
    startPlayback();

    // Escape or Space to skip immediately
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        finishIntro();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [startPlayback, finishIntro]);

  // Video event listeners
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const pct = (video.currentTime / video.duration) * 100;
    setProgress(pct);
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video && video.duration) {
      setDuration(video.duration);
    }
  };

  const handleVideoEnded = () => {
    finishIntro();
  };

  const handleVideoError = (e) => {
    console.error('[CinematicIntro] Video playback error, revealing website:', e);
    finishIntro();
  };

  const toggleSound = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center select-none overflow-hidden transition-opacity duration-700 ease-out ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ willChange: 'opacity' }}
    >
      {/* 4K Cinematic Video Element */}
      <video
        ref={videoRef}
        src="/assets/intro/website-intro.mp4"
        poster="/assets/intro/website-intro-poster.jpg"
        autoPlay
        muted={isMuted}
        playsInline
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleVideoEnded}
        onError={handleVideoError}
        className="w-full h-full object-contain"
      />

      {/* Top HUD Branding Overlay */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 flex items-center gap-2.5 pointer-events-none opacity-85">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md shadow-2xl">
          <span className="w-2 h-2 rounded-full bg-medical-teal animate-pulse" />
          <span className="text-[11px] font-mono tracking-widest uppercase font-semibold text-white">
            NeuroVision AI
          </span>
          <span className="text-[10px] font-mono text-medical-muted">
            • 4K Cinematic Intro
          </span>
        </div>
      </div>

      {/* Top Right Controls (Mute & Skip) */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-2">
        <button
          onClick={toggleSound}
          type="button"
          aria-label={isMuted ? 'Unmute video' : 'Mute video'}
          className="p-2 rounded-full bg-black/60 border border-white/15 text-medical-muted hover:text-white hover:bg-black/80 backdrop-blur-md transition-all shadow-lg"
          title={isMuted ? 'Unmute audio' : 'Mute audio'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-medical-teal" />}
        </button>

        <button
          onClick={finishIntro}
          type="button"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-white/10 border border-white/15 text-white hover:border-medical-teal/40 text-xs font-mono font-medium backdrop-blur-md transition-all shadow-lg"
          title="Skip Intro (Esc)"
        >
          <span>Skip</span>
          <SkipForward className="w-3.5 h-3.5 text-medical-teal" />
        </button>
      </div>

      {/* Fallback Autoplay Blocked Overlay */}
      {playbackBlocked && (
        <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
          <div className="w-16 h-16 rounded-2xl bg-medical-card border border-medical-border flex items-center justify-center mb-4 shadow-2xl">
            <Sparkles className="w-8 h-8 text-medical-teal animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">NeuroVision AI 3D</h2>
          <p className="text-sm text-medical-muted font-mono max-w-md mb-6">
            Click to watch the cinematic 4K intro sequence, or proceed directly to the workspace.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.play().then(() => {
                    setPlaybackBlocked(false);
                    setHasStarted(true);
                  });
                }
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-medical-teal hover:bg-medical-tealLight text-medical-darkest font-semibold text-xs tracking-wider uppercase transition-all shadow-lg"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play Intro</span>
            </button>
            <button
              onClick={finishIntro}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-medical-card hover:bg-medical-surface border border-medical-border text-white text-xs font-mono transition-all"
            >
              <span>Enter Workspace</span>
            </button>
          </div>
        </div>
      )}

      {/* Hairline Bottom Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-20">
        <div
          className="h-full bg-gradient-to-r from-medical-teal via-emerald-400 to-cyan-400 transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(20,184,166,0.6)]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
