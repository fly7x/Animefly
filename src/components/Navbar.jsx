"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import styles from "./Navbar.module.css";
import SettingsPanel from "@/components/SettingsPanel";

function FlyAnimeIcon() {
  return (
    <svg width="56" height="32" viewBox="0 0 56 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="26" fontFamily="Inter,Arial Black,sans-serif" fontWeight="900" fontSize="28" fill="#e8417a">F</text>
      <text x="20" y="26" fontFamily="Inter,Arial Black,sans-serif" fontWeight="900" fontSize="28" fill="#7ee8f8">A</text>
    </svg>
  );
}

export default function Navbar() {
  const [query, setQuery]     = useState("");
  const [suggestions, setSug] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const [scrolled, setScroll] = useState(false);
  const [mobileOpen, setMob]  = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const debounce = useRef(null);
  const router   = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const fn = () => setScroll(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => { setMob(false); setSearchOpen(false); }, [pathname]);

  function handleInput(e) {
    const v = e.target.value; setQuery(v);
    clearTimeout(debounce.current);
    if (!v.trim() || v.trim().length < 2) { setSug([]); setShowSug(false); return; }
    debounce.current = setTimeout(async () => {
      try { const d = await api.search(v, 1); setSug((d.animes || []).slice(0, 6)); setShowSug(true); } catch {}
    }, 400);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setShowSug(false); setSearchOpen(false);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  function pick(anime) { setQuery(""); setShowSug(false); setSearchOpen(false); router.push(`/anime/${anime.id}`); }

  const navLinks = [
    { href: "/",                             label: "Home"     },
    { href: "/browse?category=top-airing",   label: "Explore"  },
    { href: "/browse?category=most-popular", label: "Popular"  },
    { href: "/schedule",                     label: "Schedule" },
  ];

  const isActive = (href) => {
    const base = href.split("?")[0];
    if (base === "/") return pathname === "/";
    return pathname.startsWith(base);
  };

  return (
    <motion.nav
      className={`${styles.nav} ${scrolled ? styles.scrolled : ""}`}
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Blood shimmer top edge */}
      <div className={styles.topEdge} />

      <div className={styles.inner}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <motion.div
            className={styles.logoIcon}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
          >
            <FlyAnimeIcon />
          </motion.div>
          <span className={styles.logoText}>
            <span className={styles.logoMain}>Fly</span><span className={styles.logoDex}>Anime</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className={styles.links}>
          {navLinks.map(l => (
            <Link key={l.href} href={l.href}
              className={`${styles.link} ${isActive(l.href) ? styles.active : ""}`}>
              {l.label}
              {isActive(l.href) && (
                <motion.span
                  className={styles.activeLine}
                  layoutId="navline"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className={styles.rightSide}>
          {/* Search */}
          <div className={`${styles.searchWrap} ${searchOpen ? styles.searchOpen : ""}`}>
            <form className={styles.searchForm} onSubmit={handleSubmit}>
              <motion.button
                type="button"
                className={styles.searchIconBtn}
                onClick={() => setSearchOpen(v => !v)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Toggle search"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </motion.button>
              <input
                value={query}
                onChange={handleInput}
                onFocus={() => suggestions.length && setShowSug(true)}
                onBlur={() => setTimeout(() => setShowSug(false), 180)}
                placeholder="Search Animes"
                className={styles.input}
                aria-label="Search"
              />
              <AnimatePresence>
                {showSug && suggestions.length > 0 && (
                  <motion.ul
                    className={styles.dropdown}
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    {suggestions.map(a => (
                      <motion.li
                        key={a.id}
                        className={styles.dropItem}
                        onMouseDown={() => pick(a)}
                        whileHover={{ x: 3 }}
                        transition={{ duration: 0.12 }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={a.poster} alt="" className={styles.dropImg} />
                        <div>
                          <p className={styles.dropTitle}>{a.name}</p>
                          <span className={styles.dropMeta}>{a.type} · {a.episodes?.sub ?? "?"} eps</span>
                        </div>
                      </motion.li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </form>
          </div>

          {/* Auth */}
{user ? (
  <Link href="/profile" className={styles.avatarBtn} title={user.username}>
    {user.image
      ? <img src={user.image} alt={user.username} className={styles.avatarImg} />
      : <span className={styles.avatarInitial}>{user.username?.[0]?.toUpperCase()}</span>
    }
  </Link>
) : (
  <motion.a
    href="/login"
    className={styles.loginBtn}
    whileHover={{ scale: 1.04, y: -1 }}
    whileTap={{ scale: 0.97 }}
  >
    Login
  </motion.a>
)}
<button
  className={styles.mobileLink}
  style={{ background: "none", border: "none", textAlign: "left", width: "100%", cursor: "pointer", color: "inherit", fontFamily: "inherit", fontSize: "inherit" }}
  onClick={() => { setMob(false); setShowSettings(true); }}
>
  ⚙️ Settings
</button>

<SettingsPanel open={showSettings} onClose={() => setShowSettings(false)} />


          {/* Burger */}
          <button className={styles.burger} onClick={() => setMob(!mobileOpen)} aria-label="Menu">
            <span className={`${styles.burgerLine} ${mobileOpen ? styles.bL1 : ""}`} />
            <span className={`${styles.burgerLine} ${mobileOpen ? styles.bL2 : ""}`} />
            <span className={`${styles.burgerLine} ${mobileOpen ? styles.bL3 : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className={styles.mobileMenu}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <form className={styles.mobileSearch} onSubmit={handleSubmit}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Animes" />
              <button type="submit">Go</button>
            </form>
            <div className={styles.mobileLinks}>
              {navLinks.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.22 }}
                >
                  <Link href={l.href}
                    className={`${styles.mobileLink} ${isActive(l.href) ? styles.mobileLinkActive : ""}`}>
                    {l.label}
                  </Link>
                </motion.div>
              ))}
              {user
                ? <Link href="/profile" className={styles.mobileLink}>Profile</Link>
                : <a href="/login" className={`${styles.mobileLink} ${styles.mobileLoginBtn}`}>Login</a>
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
