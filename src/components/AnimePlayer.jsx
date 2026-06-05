"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";

export default function AnimePlayer({
  src, isHLS, subtitles = [], headers = {},
  animeTitle = "", episodeName = "", episodeNumber = 1,
  onEnded, onNext, skipTimes = {},
}) {
  const videoRef   = useRef(null);
  const hlsRef     = useRef(null);
  const wrapRef    = useRef(null);
  const hideTimer  = useRef(null);
  const countTimer = useRef(null);

  const [playing,      setPlaying]      = useState(false);
  const [currentTime,  setCurrentTime]  = useState(0);
  const [duration,     setDuration]     = useState(0);
  const [volume,       setVolume]       = useState(1);
  const [muted,        setMuted]        = useState(false);
  const [buffered,     setBuffered]     = useState(0);
  const [fullscreen,   setFullscreen]   = useState(false);
  const [showCtrl,     setShowCtrl]     = useState(true);
  const [qualities,    setQualities]    = useState([]);
  const [quality,      setQuality]      = useState(-1);
  const [showSettings, setShowSettings] = useState(false);
  const [speed,        setSpeed]        = useState(1);
  const [showSubs,     setShowSubs]     = useState(true);
  const [autoSkip,     setAutoSkip]     = useState(false);
  const [autoNext,     setAutoNext]     = useState(false);
  const [autoPlay,     setAutoPlay]     = useState(false);
  const [nextCountdown, setNextCountdown] = useState(null);
  const [skipped,      setSkipped]      = useState({ op: false, ed: false });

  const skip = skipTimes || {};

  // ── HLS init ─────────────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !src) return;
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    const load = () => {
      if (autoPlay) v.play().catch(() => {});
    };

    if (isHLS && Hls.isSupported()) {
      const hls = new Hls({
        xhrSetup(xhr) {
          Object.entries(headers || {}).forEach(([k, val]) => xhr.setRequestHeader(k, val));
        },
      });
      hls.loadSource(src);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setQualities(data.levels.map((l, i) => ({ id: i, label: l.height ? `${l.height}p` : `Level ${i+1}` })));
        load();
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, { level }) => setQuality(level));
      hlsRef.current = hls;
    } else {
      v.src = src;
      v.onloadedmetadata = load;
    }
    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [src, isHLS]);

  // ── Video events ─────────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onPlay  = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime  = () => {
      setCurrentTime(v.currentTime);
      if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
    };
    const onDur   = () => setDuration(v.duration || 0);
    const onEnd   = () => { setPlaying(false); if (onEnded) onEnded(); };
    const onFs    = () => setFullscreen(!!document.fullscreenElement);
    const onRate  = () => setSpeed(v.playbackRate);

    v.addEventListener("play",             onPlay);
    v.addEventListener("pause",            onPause);
    v.addEventListener("timeupdate",       onTime);
    v.addEventListener("durationchange",   onDur);
    v.addEventListener("ended",            onEnd);
    v.addEventListener("ratechange",       onRate);
    document.addEventListener("fullscreenchange", onFs);

    return () => {
      v.removeEventListener("play",             onPlay);
      v.removeEventListener("pause",            onPause);
      v.removeEventListener("timeupdate",       onTime);
      v.removeEventListener("durationchange",   onDur);
      v.removeEventListener("ended",            onEnd);
      v.removeEventListener("ratechange",       onRate);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [onEnded]);

  // ── Auto-skip ────────────────────────────────────────────────────
  useEffect(() => {
    if (!autoSkip || !duration) return;
    const v = videoRef.current;
    if (!v) return;

    if (skip.op && currentTime >= skip.op.start && currentTime < skip.op.end && !skipped.op) {
      v.currentTime = skip.op.end;
      setSkipped(s => ({ ...s, op: true }));
    }
    if (skip.ed && currentTime >= skip.ed.start && currentTime < skip.ed.end && !skipped.ed) {
      v.currentTime = skip.ed.end;
      setSkipped(s => ({ ...s, ed: true }));
    }
  }, [currentTime, autoSkip, skip, duration, skipped]);

  // ── Auto-next countdown ──────────────────────────────────────────
  useEffect(() => {
    if (!duration || !playing) return;
    const timeLeft = duration - currentTime;
    if (timeLeft <= 5 && timeLeft > 0 && autoNext && nextCountdown === null) {
      setNextCountdown(Math.ceil(timeLeft));
    }
  }, [currentTime, duration, autoNext, nextCountdown, playing]);

  useEffect(() => {
    if (nextCountdown === null) return;
    if (nextCountdown <= 0) {
      setNextCountdown(null);
      if (onNext) onNext();
      return;
    }
    countTimer.current = setTimeout(() => setNextCountdown(c => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(countTimer.current);
  }, [nextCountdown, onNext]);

  // ── Idle controls hide ───────────────────────────────────────────
  const resetHide = useCallback(() => {
    setShowCtrl(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowCtrl(false);
    }, 3000);
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────
  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play().catch(() => {}) : v.pause();
  }

  function handleVideoClick() {
    if (!showCtrl) { resetHide(); return; }
    togglePlay();
  }

  function seek(e) {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = pct * duration;
  }

  function handleSeekTouch(e) {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v || !duration) return;
    const touch = e.touches[0] || e.changedTouches[0];
    const rect  = e.currentTarget.getBoundingClientRect();
    const pct   = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    v.currentTime = pct * duration;
  }

  function skipTo(time, e) {
    if (e) e.stopPropagation();
    const v = videoRef.current;
    if (v) v.currentTime = time;
  }

  function toggleMute(e) {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }

  function changeVolume(e) {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    const val = parseFloat(e.target.value);
    v.volume = val; setVolume(val);
    if (val > 0) { v.muted = false; setMuted(false); }
  }

  function changeSpeed(val, e) {
    if (e) e.stopPropagation();
    const v = videoRef.current;
    if (v) v.playbackRate = val;
    setSpeed(val);
  }

  function changeQuality(id, e) {
    if (e) e.stopPropagation();
    if (hlsRef.current) hlsRef.current.currentLevel = id;
    setQuality(id);
  }

  function toggleFS(e) {
    e.stopPropagation();
    const wrap = wrapRef.current;
    if (!wrap) return;
    document.fullscreenElement ? document.exitFullscreen() : wrap.requestFullscreen().catch(() => {});
  }

  function fmt(t) {
    if (!t || isNaN(t)) return "0:00";
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const pct    = duration ? (currentTime / duration) * 100 : 0;
  const bufPct = duration ? (buffered   / duration) * 100 : 0;
  const inOp   = skip.op && currentTime >= skip.op.start && currentTime < skip.op.end;
  const inEd   = skip.ed && currentTime >= skip.ed.start && currentTime < skip.ed.end;

  return (
    <div
      ref={wrapRef}
      style={css.wrap}
      onMouseMove={resetHide}
      onTouchStart={resetHide}
    >
      {/* ── Video ── */}
      <video
        ref={videoRef}
        style={css.video}
        playsInline
        onClick={handleVideoClick}
      />

      {/* ── Top gradient ── */}
      <div style={css.topGrad} />

      {/* ── Top info badge ── */}
      <div style={{ ...css.topBadge, opacity: showCtrl ? 1 : 0, transition: "opacity 0.4s" }}>
        <span style={css.sitePill}>🎌 Fly Anime</span>
        {animeTitle && <span style={css.titleText}>{animeTitle}</span>}
        {episodeName && <span style={css.epText}>EP {episodeNumber} · {episodeName}</span>}
      </div>

      {/* ── Skip buttons ── */}
      {(inOp || inEd) && (
        <div style={css.skipArea}>
          {inOp && (
            <button
              style={css.skipBtn}
              onClick={e => skipTo(skip.op.end, e)}
              onTouchEnd={e => { e.preventDefault(); skipTo(skip.op.end); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
              Skip Opening
            </button>
          )}
          {inEd && (
            <button
              style={css.skipBtn}
              onClick={e => skipTo(skip.ed.end, e)}
              onTouchEnd={e => { e.preventDefault(); skipTo(skip.ed.end); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
              Skip Ending
            </button>
          )}
        </div>
      )}

      {/* ── Auto-next countdown ── */}
      {nextCountdown !== null && (
        <div style={css.nextOverlay} onClick={e => e.stopPropagation()}>
          <div style={css.nextCard}>
            <div style={css.ringWrap}>
              <svg width="64" height="64" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4"/>
                <circle cx="32" cy="32" r="28" fill="none" stroke="#e8417a" strokeWidth="4"
                  strokeDasharray={`${(nextCountdown / 5) * 175.9} 175.9`}
                  strokeLinecap="round"
                  style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dasharray 1s linear" }}
                />
                <text x="32" y="38" textAnchor="middle" fill="#fff" fontSize="20" fontWeight="700" fontFamily="Inter,sans-serif">
                  {nextCountdown}
                </text>
              </svg>
            </div>
            <p style={css.nextLabel}>Next episode in {nextCountdown}s</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button style={css.nextPlayBtn} onClick={e => { e.stopPropagation(); setNextCountdown(null); if (onNext) onNext(); }}>
                Play Now →
              </button>
              <button style={css.nextCancelBtn} onClick={e => { e.stopPropagation(); setNextCountdown(null); clearTimeout(countTimer.current); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Center play/pause indicator ── */}
      {!playing && (
        <div style={css.centerPlay} onClick={handleVideoClick}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </div>
      )}

      {/* ── Bottom controls ── */}
      <div
        style={{ ...css.controls, opacity: showCtrl ? 1 : 0, pointerEvents: showCtrl ? "all" : "none" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div
          style={css.progressWrap}
          onClick={seek}
          onTouchMove={handleSeekTouch}
          onTouchEnd={handleSeekTouch}
        >
          <div style={css.progressTrack}>
            <div style={{ ...css.progressFill, width: `${bufPct}%`, backgroundColor: "rgba(255,255,255,0.2)" }} />
            <div style={{ ...css.progressFill, width: `${pct}%`, backgroundColor: "#e8417a" }} />
            {duration > 0 && skip.op && (
              <div style={{ ...css.chapterMark, left: `${(skip.op.start / duration) * 100}%`, width: `${((skip.op.end - skip.op.start) / duration) * 100}%` }} />
            )}
            {duration > 0 && skip.ed && (
              <div style={{ ...css.chapterMark, left: `${(skip.ed.start / duration) * 100}%`, width: `${((skip.ed.end - skip.ed.start) / duration) * 100}%` }} />
            )}
            <div style={{ ...css.progressThumb, left: `${pct}%` }} />
          </div>
        </div>

        {/* Control row */}
        <div style={css.controlRow}>
          {/* Left */}
          <div style={css.controlGroup}>
            {/* Play */}
            <button style={css.btn} onClick={e => { e.stopPropagation(); togglePlay(); }}>
              {playing
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
            </button>

            {/* Volume */}
            <button style={css.btn} onClick={toggleMute}>
              {muted || volume === 0
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>}
            </button>
            <input
              type="range" min="0" max="1" step="0.05"
              value={muted ? 0 : volume}
              onChange={changeVolume}
              onClick={e => e.stopPropagation()}
              style={{ width: "68px", accentColor: "#e8417a", cursor: "pointer" }}
            />

            {/* Time */}
            <span style={css.timeLabel}>{fmt(currentTime)} / {fmt(duration)}</span>
          </div>

          {/* Right */}
          <div style={css.controlGroup}>
            {/* Settings */}
            <div style={{ position: "relative" }}>
              <button style={css.btn} onClick={e => { e.stopPropagation(); setShowSettings(v => !v); }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
                </svg>
              </button>

              {/* ── Settings panel ── */}
              {showSettings && (
                <div style={css.settingsPanel} onClick={e => e.stopPropagation()}>

                  {/* Toggles */}
                  <p style={css.settingsHead}>Playback</p>
                  {[
                    { label: "Auto Play",  val: autoPlay,  set: setAutoPlay },
                    { label: "Auto Skip",  val: autoSkip,  set: setAutoSkip },
                    { label: "Auto Next",  val: autoNext,  set: setAutoNext },
                    { label: "Subtitles",  val: showSubs,  set: setShowSubs },
                  ].map(({ label, val, set }) => (
                    <div key={label} style={css.toggleRow}>
                      <span style={css.toggleLabel}>{label}</span>
                      <button
                        style={{ ...css.toggleBtn, backgroundColor: val ? "#e8417a" : "rgba(255,255,255,0.1)" }}
                        onClick={() => set(v => !v)}
                      >
                        <div style={{ ...css.toggleThumb, transform: val ? "translateX(18px)" : "translateX(2px)" }} />
                      </button>
                    </div>
                  ))}

                  {/* Speed */}
                  <p style={css.settingsHead}>Speed</p>
                  <div style={css.pillRow}>
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => (
                      <button key={r}
                        style={{ ...css.pill, ...(speed === r ? css.pillActive : {}) }}
                        onClick={() => changeSpeed(r)}
                      >{r}x</button>
                    ))}
                  </div>

                  {/* Quality */}
                  {qualities.length > 0 && (
                    <>
                      <p style={css.settingsHead}>Quality</p>
                      <div style={css.pillRow}>
                        <button
                          style={{ ...css.pill, ...(quality === -1 ? css.pillActive : {}) }}
                          onClick={() => changeQuality(-1)}>Auto</button>
                        {qualities.map(q => (
                          <button key={q.id}
                            style={{ ...css.pill, ...(quality === q.id ? css.pillActive : {}) }}
                            onClick={() => changeQuality(q.id)}>{q.label}</button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button style={css.btn} onClick={toggleFS}>
              {fullscreen
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const css = {
  wrap: {
    position: "relative", width: "100%", aspectRatio: "16/9",
    backgroundColor: "#000", borderRadius: "12px", overflow: "hidden",
    userSelect: "none", fontFamily: "Inter,sans-serif", cursor: "default",
  },
  video: { width: "100%", height: "100%", display: "block", cursor: "pointer" },

  topGrad: {
    position: "absolute", top: 0, left: 0, right: 0, height: "80px", zIndex: 2,
    background: "linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 100%)",
    pointerEvents: "none",
  },
  topBadge: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 3,
    display: "flex", alignItems: "center", gap: "8px",
    padding: "14px 16px", flexWrap: "wrap", pointerEvents: "none",
  },
  sitePill: {
    backgroundColor: "#e8417a", color: "#fff",
    padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700,
  },
  titleText: { color: "#fff", fontSize: "13px", fontWeight: 600, textShadow: "0 1px 4px rgba(0,0,0,0.8)" },
  epText: { color: "rgba(255,255,255,0.55)", fontSize: "12px" },

  skipArea: {
    position: "absolute", bottom: "80px", right: "16px", zIndex: 10,
    display: "flex", flexDirection: "column", gap: "8px",
  },
  skipBtn: {
    display: "flex", alignItems: "center", gap: "6px",
    background: "rgba(10,10,14,0.75)", backdropFilter: "blur(12px)",
    border: "1px solid rgba(232,65,122,0.5)", color: "#fff",
    borderRadius: "8px", padding: "10px 16px", fontSize: "13px", fontWeight: 600,
    cursor: "pointer", fontFamily: "Inter,sans-serif",
    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
    WebkitBackdropFilter: "blur(12px)",
    minWidth: "140px", minHeight: "44px", // Touch-friendly
  },

  nextOverlay: {
    position: "absolute", inset: 0, zIndex: 20,
    backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  nextCard: {
    background: "rgba(14,14,18,0.85)", backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px",
    padding: "32px 40px", display: "flex", flexDirection: "column",
    alignItems: "center", gap: "14px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
  },
  ringWrap: { position: "relative" },
  nextLabel: { color: "#fff", fontSize: "15px", fontWeight: 600, margin: 0 },
  nextPlayBtn: {
    background: "#e8417a", color: "#fff", border: "none",
    borderRadius: "10px", padding: "10px 24px", fontSize: "14px", fontWeight: 700,
    cursor: "pointer", fontFamily: "Inter,sans-serif",
  },
  nextCancelBtn: {
    background: "rgba(255,255,255,0.08)", color: "#a0a0b0",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px",
    padding: "10px 24px", fontSize: "14px",
    cursor: "pointer", fontFamily: "Inter,sans-serif",
  },

  centerPlay: {
    position: "absolute", top: "50%", left: "50%",
    transform: "translate(-50%,-50%)", zIndex: 5,
    background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    border: "2px solid rgba(255,255,255,0.2)", borderRadius: "50%",
    width: "64px", height: "64px",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#fff", cursor: "pointer",
    boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
  },

  controls: {
    position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10,
    background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
    padding: "40px 14px 10px", transition: "opacity 0.35s ease",
  },
  progressWrap: {
    padding: "8px 0 4px", cursor: "pointer",
    touchAction: "none",
  },
  progressTrack: {
    position: "relative", height: "4px",
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: "4px",
  },
  progressFill: {
    position: "absolute", top: 0, left: 0, height: "100%",
    borderRadius: "4px", transition: "width 0.1s linear",
  },
  chapterMark: {
    position: "absolute", top: "-1px", height: "6px",
    backgroundColor: "#facc15", borderRadius: "3px", opacity: 0.8,
  },
  progressThumb: {
    position: "absolute", top: "50%",
    transform: "translate(-50%, -50%)",
    width: "14px", height: "14px", borderRadius: "50%",
    backgroundColor: "#e8417a",
    boxShadow: "0 0 8px rgba(232,65,122,0.7)",
    transition: "left 0.1s linear",
  },
  controlRow: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between", gap: "4px",
  },
  controlGroup: { display: "flex", alignItems: "center", gap: "4px" },
  btn: {
    background: "none", border: "none", color: "#fff", cursor: "pointer",
    padding: "8px", borderRadius: "8px", display: "flex", alignItems: "center",
    justifyContent: "center", minWidth: "36px", minHeight: "36px",
    transition: "background 0.15s",
  },
  timeLabel: {
    color: "rgba(255,255,255,0.65)", fontSize: "12px",
    whiteSpace: "nowrap", paddingLeft: "4px",
  },

  settingsPanel: {
    position: "absolute", bottom: "calc(100% + 10px)", right: 0,
    width: "240px", zIndex: 30,
    background: "rgba(10,10,14,0.88)",
    backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "16px", padding: "16px",
    boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
  },
  settingsHead: {
    color: "rgba(255,255,255,0.35)", fontSize: "10px",
    textTransform: "uppercase", letterSpacing: "1.2px",
    margin: "12px 0 8px", padding: "0 2px",
  },
  toggleRow: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between", padding: "6px 2px",
  },
  toggleLabel: { color: "#e0e0e8", fontSize: "13px", fontWeight: 500 },
  toggleBtn: {
    position: "relative", width: "40px", height: "22px",
    borderRadius: "11px", border: "none", cursor: "pointer",
    transition: "background 0.25s", padding: 0,
  },
  toggleThumb: {
    position: "absolute", top: "3px", width: "16px", height: "16px",
    backgroundColor: "#fff", borderRadius: "50%",
    transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
  },
  pillRow: { display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "4px" },
  pill: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.6)", borderRadius: "8px",
    padding: "5px 12px", fontSize: "12px", fontWeight: 500,
    cursor: "pointer", fontFamily: "Inter,sans-serif",
    transition: "all 0.15s",
  },
  pillActive: {
    background: "rgba(232,65,122,0.2)", border: "1px solid #e8417a",
    color: "#e8417a",
  },
};
