"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import styles from "./Footer.module.css";

const BROWSE_LINKS = [
  { href: "/browse?category=top-airing",        label: "Top Airing"       },
  { href: "/browse?category=most-popular",      label: "Most Popular"     },
  { href: "/browse?category=most-favorite",     label: "Most Favorite"    },
  { href: "/browse?category=upcoming",          label: "Upcoming"         },
  { href: "/browse?category=recently-updated",  label: "Recently Updated" },
];

/**
 * Crysoline health check via Cloudflare Worker.
 *
 * Route: GET <CF_WORKER>/crysoline-health
 * The CF Worker proxies api.crysoline.moe/health and caches it for 60s at the
 * Cloudflare edge — so 100 footer renders = 1 upstream ping, not 100.
 *
 * Falls back to /api/ping/crysoline (Vercel server-side) if CF_PROXY is not set.
 * Falls back to "unknown" on any error — never crashes the footer.
 *
 * Why not call api.crysoline.moe/health directly?
 * Browser CORS policy: some hosting environments return no CORS headers on the
 * /health endpoint, causing the browser to block the response silently.
 * Routing through CF Worker (same-origin from the worker's perspective) avoids
 * this entirely.
 */
function useCrysolineStatus() {
  const [status, setStatus] = useState(null); // null=checking | true=up | false=down

  useEffect(() => {
    let cancelled = false;

    // Determine URL: CF Worker preferred, Vercel API fallback
    const cfProxy = process.env.NEXT_PUBLIC_PROXY_URL || "";
    const healthUrl = cfProxy
      ? `${cfProxy}/crysoline-health`
      : "/api/ping/crysoline";

    fetch(healthUrl, { signal: AbortSignal.timeout(9000) })
      .then(r => { if (!cancelled) setStatus(r.ok); })
      .catch(() => { if (!cancelled) setStatus(false); });

    return () => { cancelled = true; };
  }, []);

  return status;
}

function StatusDot({ up }) {
  if (up === null) return <span className={styles.dotChecking} />;
  return <span className={up ? styles.dotUp : styles.dotDown} />;
}

function FlyAnimeLogo() {
  return (
    <svg width="56" height="32" viewBox="0 0 56 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="26" fontFamily="Inter,Arial Black,sans-serif" fontWeight="900" fontSize="28" fill="#e8417a">F</text>
      <text x="20" y="26" fontFamily="Inter,Arial Black,sans-serif" fontWeight="900" fontSize="28" fill="#7ee8f8">A</text>
    </svg>
  );
}

export default function Footer() {
  const cryUp = useCrysolineStatus();

  return (
    <footer className={styles.footer}>
      {/* Blood glow line */}
      <div className={styles.glowLine} />

      <div className={`container ${styles.inner}`}>

        {/* Brand */}
        <div className={styles.brand}>
          <Link href="/" className={styles.logoWrap}>
            <div className={styles.logoIcon}>
              <FlyAnimeLogo />
            </div>
            <div className={styles.logoText}>
              <span className={styles.logoMain}>Anime</span>
              <span className={styles.logoDex}>Dex</span>
            </div>
          </Link>

          <p className={styles.brandDesc}>
            Stream anime in HD — sub &amp; dub.<br />
            No soul required. Always free.
          </p>

          {/* API Status */}
          <div className={styles.apiStatus}>
            <span className={styles.apiStatusLabel}>API Status</span>
            <div className={styles.statusRow}>
              <StatusDot up={cryUp} />
              <span className={styles.statusName}>Crysoline</span>
              <span className={`${styles.statusBadge} ${
                cryUp === null
                  ? styles.badgeChecking
                  : cryUp
                  ? styles.badgeUp
                  : styles.badgeDown
              }`}>
                {cryUp === null ? "Consulting the oracle…" : cryUp ? "The pact holds" : "Pact weakening"}
              </span>
            </div>
            <p className={styles.statusNote}>Via Cloudflare edge · 60s cache</p>
          </div>
        </div>

        {/* Browse */}
        <div className={styles.col}>
          <h4 className={styles.colHeading}>Browse</h4>
          {BROWSE_LINKS.map(l => (
            <Link key={l.href} href={l.href} className={styles.colLink}>
              <span className={styles.linkChevron}>›</span>{l.label}
            </Link>
          ))}
        </div>

        {/* Navigate */}
        <div className={styles.col}>
          <h4 className={styles.colHeading}>Navigate</h4>
          <Link href="/"         className={styles.colLink}><span className={styles.linkChevron}>›</span>Home</Link>
          <Link href="/browse"   className={styles.colLink}><span className={styles.linkChevron}>›</span>Catalog</Link>
          <Link href="/search"   className={styles.colLink}><span className={styles.linkChevron}>›</span>Search</Link>
          <Link href="/schedule" className={styles.colLink}><span className={styles.linkChevron}>›</span>Schedule</Link>
          <a href="https://anilist.co" target="_blank" rel="noreferrer" className={styles.colLink}>
            <span className={styles.linkChevron}>›</span>AniList
          </a>
        </div>
      </div>

      {/* Bottom */}
      <div className={styles.bottom}>
        <p className={styles.disclaimer}>
          Fly Anime does not host any video files. All content is sourced from publicly available third-party providers.
        </p>
        <p className={styles.copy}>© {new Date().getFullYear()} Fly Anime</p>
      </div>
    </footer>
  );
}
