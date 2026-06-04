"use client";
import Image from "next/image";

export default function DiscordBanner() {
  return (
    <a
      href="https://dsc.gg/flyanime"
      target="_blank"
      rel="noopener noreferrer"
      style={s.wrap}
    >
      <div style={s.inner}>
        <Image
          src="/discord-banner.png"
          alt="Join our Discord — Fly Anime Community"
          fill
          style={{ objectFit: "cover", borderRadius: "14px" }}
          priority
        />
        <div style={s.overlay}>
          <span style={s.badge}>Join our Discord →</span>
        </div>
      </div>
    </a>
  );
}

const s = {
  wrap: { display: "block", textDecoration: "none", width: "100%", margin: "24px 0" },
  inner: { position: "relative", width: "100%", height: "160px", borderRadius: "14px", overflow: "hidden", cursor: "pointer" },
  overlay: { position: "absolute", bottom: "12px", right: "16px", zIndex: 2 },
  badge: {
    backgroundColor: "#5865F2", color: "#fff",
    padding: "8px 18px", borderRadius: "8px",
    fontSize: "14px", fontWeight: 700, fontFamily: "Inter,sans-serif",
  },
};
