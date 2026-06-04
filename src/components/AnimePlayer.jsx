"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";

export default function AnimePlayer({
  src, isHLS, subtitles = [], headers = {},
  animeTitle = "", episodeName = "", episodeNumber = 1,
  onEnded, onNext, autoPlay = false, autoNext = false,
  skipTimes = {},
}) {
  const videoRef    = useRef(null);
  const hlsRef      = useRef(null);
  const hideTimer   = useRef(null);
  const countRef    = useRef(null);

  const [playing,     setPlaying]     = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [volume,      setVolume]      = useState(1);
  const [muted,       setMuted]       = useState(false);
  const [fullscreen,  setFullscreen]  = useState(false);
  const [showCtrl,    setShowCtrl]    = useState(true);
  const [buffered,    setBuffered]    = useState(0);
  const [qualities,   setQualities]   = useState([]);
  const [quality,     setQuality]     = useState(-1);
  const [showSets,    setShowSets]    = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showNext,    setShowNext]    = useState(false);
  const [countdown,   setCountdown]   = useState(5);
  const [idle,        setIdle]        = useState(false);
  const [subTrack,    setSubTrack]    = useState(0);

  // ── Skip zones from AniSkip API ─────────────────────────────────
  const skip = skipTimes || {};

  // ── HLS setup ───────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    if (isHLS && Hls.isSupported()) {
      const hls = new Hls({
        xhrSetup(xhr) {
          Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
        },
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setQualities(data.levels.map((l, i) => ({ id: i, label: l.height ? `${l.height}p` : `Level ${i}` })));
        if (autoPlay) video.play().catch(() => {});
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, { level }) => setQuality(level));
      hlsRef.current = hls;
    } else {
      video.src = src;
      if (autoPlay) video.play().catch(() => {});
    }

    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [src, isHLS]);

  // ── Video event listeners ────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay    = () => setPlaying(true);
    const onPause   = () => setPlaying(false);
    const onTime    = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length > 0)
        setBuffered(video.buffered.end(video.buffered.length - 1));
      // Auto-next countdown trigger
      if (duration > 0 && video.currentTime >= duration - 5 && autoNext && !showNext) {
        setShowNext(true);
        setCountdown(5);
      }
    };
    const onDur     = () => setDuration(video.duration);
    const onEnded_  = () => { setPlaying(false); if (onEnded) onEnded(); };
    const onFs      = () => setFullscreen(!!document.fullscreenElement);

    video.addEventListener("play",             onPlay);
    video.addEventListener("pause",            onPause);
    video.addEventListener("timeupdate",       onTime);
    video.addEventListener("durationchange",   onDur);
    video.addEventListener("ended",            onEnded_);
    document.addEventListener("fullscreenchange", onFs);

    return () => {
      video.removeEventListener("play",             onPlay);
      video.removeEventListener("pause",            onPause);
      video.removeEventListener("timeupdate",       onTime);
      video.removeEventListener("durationchange",   onDur);
      video.removeEventListener("ended",            onEnded_);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [duration, autoNext, onEnded, showNext]);

  // ── Auto-next countdown ──────────────────────────────────────────
  useEffect(() => {
    if (!showNext) { clearInterval(countRef.current); return; }
    countRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(countRef.current); if (onNext) onNext(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(countRef.current);
  }, [showNext, onNext]);

  // ── Idle hide controls ───────────────────────────────────────────
  const resetHide = useCallback(() => {
    setShowCtrl(true); setIdle(false);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (playing) { setShowCtrl(false); setIdle(true); }
    }, 3000);
  }, [playing]);

  // ── Controls ─────────────────────────────────────────────────────
  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    playing ? v.pause() : v.play().catch(() => {});
  }

  function seek(e) {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = pct * duration;
  }

  function skipTo(time) {
    const v = videoRef.current;
    if (v) v.currentTime = time;
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }

  function setVol(val) {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val; setVolume(val);
    if (val > 0) { v.muted = false; setMuted(false); }
  }

  function setRate(rate) {
    const v = videoRef.current;
    if (v) { v.playbackRate = rate; setPlaybackRate(rate); }
    setShowSets(false);
  }

  function setQual(id) {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = id;
    setQuality(id); setShowSets(false);
  }

  function toggleFS() {
    const wrap = document.getElementById("fa-player-wrap");
    if (!wrap) return;
    if (!document.fullscreenElement) wrap.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  }

  function fmt(t) {
    if (!t || isNaN(t)) return "0:00";
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const pct     = duration ? (currentTime / duration) * 100 : 0;
  const bufPct  = duration ? (buffered   / duration) * 100 : 0;

  // ── Skip button logic ─────────────────────────────────────────────
  const inOp  = skip.op  && currentTime >= skip.op.start  && currentTime < skip.op.end;
  const inEd  = skip.ed  && currentTime >= skip.ed.start  && currentTime < skip.ed.end;
  const inPre = skip.pre && currentTime >= skip.pre.start && currentTime < skip.pre.end;

  return (
    <div
      id="fa-player-wrap"
      onMouseMove={resetHide}
      onTouchStart={resetHide}
      onClick={resetHide}
      style={p.wrap}
    >
      {/* ── Video ── */}
      <video ref={videoRef} style={p.video} playsInline />

      {/* ── Top badge ── */}
      {(showCtrl || idle) && (
        <div style={p.topBadge}>
          <span style={p.siteBadge}>🎌 Fly Anime</span>
          {animeTitle && <span style={p.titleBadge}>{animeTitle}</span>}
          {episodeName && <span style={p.epBadge}>EP {episodeNumber} · {episodeName}</span>}
        </div>
      )}

      {/* ── Idle cinematic overlay ── */}
      {idle && !playing && (
        <div style={p.idleOverlay}>
          <p style={p.idleTitle}>{animeTitle}</p>
          <p style={p.idleEp}>Episode {episodeNumber}{episodeName ? ` — ${episodeName}` : ""}</p>
        </div>
      )}

      {/* ── Skip buttons ── */}
      <div style={p.skipBtns}>
        {inOp && (
          <button style={p.skipBtn} onClick={() => skipTo(skip.op.end)}>
            ⏭ Skip Opening
          </button>
        )}
        {inEd && (
          <button style={p.skipBtn} onClick={() => skipTo(skip.ed.end)}>
            ⏭ Skip Ending
          </button>
        )}
        {inPre && (
          <button style={p.skipBtn} onClick={() => skipTo(skip.pre.end)}>
            ⏭ Skip Preview
          </button>
        )}
      </div>

      {/* ── Auto-next countdown ── */}
      {showNext && (
        <div style={p.nextOverlay}>
          <div style={p.nextCard}>
            <svg width="56" height="56" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4"/>
              <circle cx="28" cy="28" r="24" fill="none" stroke="#e8417a" strokeWidth="4"
                strokeDasharray={`${(countdown / 5) * 150.8} 150.8`}
                strokeLinecap="round"
                style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dasharray 1s linear" }}
              />
              <text x="28" y="34" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="bold" fontFamily="Inter,sans-serif">
                {countdown}
              </text>
            </svg>
            <p style={p.nextLabel}>Next episode in {countdown}s</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button style={p.nextPlayBtn} onClick={() => { setShowNext(false); if (onNext) onNext(); }}>
                Play Now
              </button>
              <button style={p.nextCancelBtn} onClick={() => { setShowNext(false); clearInterval(countRef.current); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Controls ── */}
      <div style={{ ...p.controls, opacity: showCtrl ? 1 : 0, pointerEvents: showCtrl ? "all" : "none" }}>

        {/* Progress bar */}
        <div style={p.progressWrap} onClick={seek}>
          <div style={p.progressBg}>
            {/* Buffer */}
            <div style={{ ...p.progressFill, width: `${bufPct}%`, backgroundColor: "rgba(255,255,255,0.2)" }} />
            {/* Progress */}
            <div style={{ ...p.progressFill, width: `${pct}%`, backgroundColor: "#e8417a" }} />
            {/* Chapter markers */}
            {skip.op && (
              <div style={{ ...p.chapter, left: `${(skip.op.start / duration) * 100}%`, width: `${((skip.op.end - skip.op.start) / duration) * 100}%`, backgroundColor: "#facc15" }} />
            )}
            {skip.ed && (
              <div style={{ ...p.chapter, left: `${(skip.ed.start / duration) * 100}%`, width: `${((skip.ed.end - skip.ed.start) / duration) * 100}%`, backgroundColor: "#facc15" }} />
            )}
            {/* Thumb */}
            <div style={{ ...p.thumb, left: `${pct}%` }} />
          </div>
        </div>

        {/* Bottom row */}
        <div style={p.bottomRow}>
          {/* Play/Pause */}
          <button style={p.ctrlBtn} onClick={togglePlay}>
            {playing
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            }
          </button>

          {/* Volume */}
          <button style={p.ctrlBtn} onClick={toggleMute}>
            {muted || volume === 0
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
            }
          </button>
          <input type="range" min="0" max="1" step="0.05"
            value={muted ? 0 : volume}
            onChange={e => setVol(Number(e.target.value))}
            style={{ width: "72px", accentColor: "#e8417a", cursor: "pointer" }}
          />

          {/* Time */}
          <span style={p.timeLabel}>{fmt(currentTime)} / {fmt(duration)}</span>

          <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
            {/* Settings */}
            <div style={{ position: "relative" }}>
              <button style={p.ctrlBtn} onClick={() => setShowSets(v => !v)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58 c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81 c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33 c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12 s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96 c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54 c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
                </svg>
              </button>
              {showSets && (
                <div style={p.settingsMenu}>
                  <p style={p.setHeader}>Speed</p>
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => (
                    <button key={r} style={{ ...p.setItem, color: playbackRate === r ? "#e8417a" : "#a0a0b0" }}
                      onClick={() => setRate(r)}>{r}x</button>
                  ))}
                  {qualities.length > 0 && (
                    <>
                      <p style={p.setHeader}>Quality</p>
                      <button style={{ ...p.setItem, color: quality === -1 ? "#e8417a" : "#a0a0b0" }}
                        onClick={() => setQual(-1)}>Auto</button>
                      {qualities.map(q => (
                        <button key={q.id} style={{ ...p.setItem, color: quality === q.id ? "#e8417a" : "#a0a0b0" }}
                          onClick={() => setQual(q.id)}>{q.label}</button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button style={p.ctrlBtn} onClick={toggleFS}>
              {fullscreen
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
              }
            </button>
          </div>
        </div>
      </div>

      {/* ── Center play button (mobile) ── */}
      {!playing && (
        <button style={p.centerPlay} onClick={togglePlay}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </button>
      )}
    </div>
  );
}

const p = {
  wrap: {
    position: "relative", width: "100%", aspectRatio: "16/9",
    backgroundColor: "#000", borderRadius: "10px", overflow: "hidden",
    userSelect: "none", fontFamily: "Inter,sans-serif",
  },
  video: { width: "100%", height: "100%", display: "block" },

  topBadge: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
    display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px",
    background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)",
    flexWrap: "wrap",
  },
  siteBadge: { backgroundColor: "#e8417a", color: "#fff", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700 },
  titleBadge: { color: "#fff", fontSize: "13px", fontWeight: 600 },
  epBadge: { color: "rgba(255,255,255,0.6)", fontSize: "12px" },

  idleOverlay: {
    position: "absolute", bottom: "80px", left: "20px", zIndex: 8,
    pointerEvents: "none",
  },
  idleTitle: { color: "#fff", fontSize: "22px", fontWeight: 900, margin: "0 0 4px", textShadow: "0 2px 8px rgba(0,0,0,0.8)" },
  idleEp: { color: "rgba(255,255,255,0.6)", fontSize: "14px", margin: 0 },

  skipBtns: {
    position: "absolute", bottom: "80px", right: "16px", zIndex: 10,
    display: "flex", flexDirection: "column", gap: "8px",
  },
  skipBtn: {
    backgroundColor: "rgba(232,65,122,0.9)", color: "#fff", border: "none",
    borderRadius: "8px", padding: "8px 16px", fontSize: "13px", fontWeight: 700,
    cursor: "pointer", fontFamily: "Inter,sans-serif", backdropFilter: "blur(4px)",
  },

  nextOverlay: {
    position: "absolute", inset: 0, zIndex: 20,
    backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center",
  },
  nextCard: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: "14px",
    backgroundColor: "#141418", border: "1px solid rgba(232,65,122,0.3)",
    borderRadius: "16px", padding: "32px 40px",
  },
  nextLabel: { color: "#fff", fontSize: "15px", fontWeight: 600, margin: 0 },
  nextPlayBtn: {
    backgroundColor: "#e8417a", color: "#fff", border: "none",
    borderRadius: "8px", padding: "10px 24px", fontSize: "14px", fontWeight: 700,
    cursor: "pointer", fontFamily: "Inter,sans-serif",
  },
  nextCancelBtn: {
    backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "#a0a0b0",
    borderRadius: "8px", padding: "10px 24px", fontSize: "14px",
    cursor: "pointer", fontFamily: "Inter,sans-serif",
  },

  controls: {
    position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10,
    background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
    padding: "32px 12px 10px", transition: "opacity 0.3s ease",
  },
  progressWrap: { padding: "8px 0", cursor: "pointer" },
  progressBg: { position: "relative", height: "4px", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: "4px" },
  progressFill: { position: "absolute", top: 0, left: 0, height: "100%", borderRadius: "4px", transition: "width 0.1s linear" },
  chapter: { position: "absolute", top: "1px", height: "2px", borderRadius: "2px", opacity: 0.8 },
  thumb: {
    position: "absolute", top: "50%", transform: "translate(-50%, -50%)",
    width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#e8417a",
    boxShadow: "0 0 6px rgba(232,65,122,0.6)", transition: "left 0.1s linear",
  },
  bottomRow: { display: "flex", alignItems: "center", gap: "8px" },
  ctrlBtn: {
    background: "none", border: "none", color: "#fff", cursor: "pointer",
    padding: "6px", borderRadius: "6px", display: "flex", alignItems: "center",
    transition: "color 0.15s", fontFamily: "Inter,sans-serif",
  },
  timeLabel: { color: "rgba(255,255,255,0.7)", fontSize: "12px", whiteSpace: "nowrap" },
  settingsMenu: {
    position: "absolute", bottom: "calc(100% + 8px)", right: 0,
    backgroundColor: "#141418", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px", padding: "8px", minWidth: "130px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.6)", zIndex: 20,
  },
  setHeader: { color: "#606070", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", margin: "8px 0 4px 10px" },
  setItem: {
    display: "block", width: "100%", textAlign: "left", background: "none",
    border: "none", padding: "7px 12px", borderRadius: "6px", fontSize: "13px",
    cursor: "pointer", fontFamily: "Inter,sans-serif",
  },
  centerPlay: {
    position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
    backgroundColor: "rgba(0,0,0,0.6)", border: "2px solid rgba(255,255,255,0.3)",
    borderRadius: "50%", width: "60px", height: "60px",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#fff", cursor: "pointer", backdropFilter: "blur(4px)", zIndex: 5,
  },
};
