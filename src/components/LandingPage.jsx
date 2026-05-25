"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  function enter() {
    try { sessionStorage.setItem("flyanime_entered", "1"); } catch {}
    router.push("/");
  }

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#0e0e12",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "48px",
      fontFamily: "Inter, sans-serif",
    }}>

      {/* Logo */}
      <div style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.8s ease, transform 0.8s ease",
        display: "flex",
        alignItems: "center",
        gap: "16px",
      }}>
        <span style={{
          fontSize: "clamp(52px, 12vw, 96px)",
          fontWeight: 900,
          color: "#e8417a",
          letterSpacing: "-2px",
          lineHeight: 1,
        }}>F!Y</span>
        <span style={{
          fontSize: "clamp(52px, 12vw, 96px)",
          fontWeight: 900,
          color: "#7ee8f8",
          letterSpacing: "-2px",
          lineHeight: 1,
        }}>ANIME</span>
      </div>

      {/* Tagline */}
      <p style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 1.2s ease 0.4s",
        color: "#a0a0b0",
        fontSize: "16px",
        letterSpacing: "2px",
        textTransform: "uppercase",
        margin: 0,
      }}>
        Stream anime free · Sub & Dub
      </p>

      {/* Enter button */}
      <button
        onClick={enter}
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 1.2s ease 0.8s",
          backgroundColor: "#e8417a",
          color: "#fff",
          border: "none",
          borderRadius: "10px",
          padding: "14px 40px",
          fontSize: "16px",
          fontWeight: 700,
          fontFamily: "Inter, sans-serif",
          cursor: "pointer",
          letterSpacing: "0.5px",
        }}
        onMouseEnter={e => e.target.style.backgroundColor = "#f0527f"}
        onMouseLeave={e => e.target.style.backgroundColor = "#e8417a"}
      >
        Start Watching →
      </button>

    </div>
  );
}
