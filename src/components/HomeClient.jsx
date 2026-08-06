"use client";
import DiscordBanner from "@/components/DiscordBanner";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { getRecentlyWatched } from "@/lib/watchProgress";
import SpotlightBanner from "./SpotlightBanner";
import Section from "./Section";
import AnimeCard from "./AnimeCard";
import styles from "./HomeClient.module.css";

export default function HomeClient({ initialData }) {
  const [data,    setData]    = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error,   setError]   = useState(null);
  const [recent,  setRecent]  = useState([]);

  useEffect(() => {
    const localHistory = getRecentlyWatched(10);
    setRecent(localHistory);

    if (initialData) return;
    api.home()
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [initialData]);

  if (error) return (
    <div className={styles.errWrap}>
      <motion.div
        className={styles.errCard}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className={styles.errSigil}>⚔</div>
        <h2 className={styles.errTitle}>Something went wrong</h2>
        <p className={styles.errMsg}>{error}</p>
        <button className={styles.retryBtn} onClick={() => window.location.reload()}>
          Try Again
        </button>
      </motion.div>
    </div>
  );

  const spotlight  = data?.spotlightAnimes     || [];
  const trending   = data?.trendingAnimes       || [];
  const latest     = data?.latestEpisodeAnimes  || [];
  const topAiring  = data?.topAiringAnimes      || [];
  const favorites  = data?.mostFavoriteAnimes   || [];
  const top10Today = data?.top10Animes?.today   || [];

  return (
    <div className={styles.page}>
      {/* Hero banner */}
      <SpotlightBanner spotlights={spotlight} loading={loading} />
      <DiscordBanner />

      {/* Continue Watching */}
      {recent.length > 0 && (
        <motion.section
          className={`container ${styles.continueSection}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className={styles.sectionHeader}>
            <div className={styles.titleWrap}>
              <span className={styles.titleAccent} />
              <h2 className="section-title">Continue Watching</h2>
            </div>
            <Link href="/profile" className={styles.viewAll}>
              View All
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
          <div className={styles.continueRow}>
            {recent.slice(0, 8).map((item, i) => (
              <motion.div
                key={item.animeId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -4 }}
              >
                <Link href={`/watch/${item.animeId}/${item.epSlug}`} className={styles.continueCard}>
                  <div className={styles.continuePoster}>
                    {item.poster && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.poster} alt={item.animeName} />
                    )}
                    <div className={styles.continuePlay}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                        <polygon points="5,3 19,12 5,21"/>
                      </svg>
                    </div>
                    <div className={styles.continueEpBadge}>Ep {item.epNumber}</div>
                  </div>
                  <p className={styles.continueName}>{item.animeName}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Main content grid */}
      <div className={`container ${styles.mainContent}`}>

        {/* Left column */}
        <div className={styles.primaryCol}>
          <Section title="Currently Trending"  animes={trending}  viewAllHref="/browse?category=top-airing"        loading={loading} />
          <Section title="Recently Updated"    animes={latest}    viewAllHref="/browse?category=recently-updated"  loading={loading} />
          <Section title="Most Favorited"      animes={favorites} viewAllHref="/browse?category=most-favorite"     loading={loading} />
        </div>

        {/* Right column */}
        <div className={styles.sideCol}>
          {(loading || top10Today.length > 0) && (
            <div className={styles.top10Card}>
              <div className={styles.top10Header}>
                <span className={styles.titleAccent} />
                <h3 className="section-title">Top 10 Today</h3>
              </div>
              <div className={styles.top10List}>
                {loading
                  ? Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className={styles.top10SkeletonRow}>
                        <div className={`skeleton ${styles.top10SkeletonNum}`} />
                        <div className={`skeleton ${styles.top10SkeletonImg}`} />
                        <div className={styles.top10SkeletonText}>
                          <div className={`skeleton ${styles.top10SkeletonTitle}`} />
                          <div className={`skeleton ${styles.top10SkeletonMeta}`} />
                        </div>
                      </div>
                    ))
                  : top10Today.slice(0, 10).map((anime, i) => (
                      <motion.div
                        key={anime.id}
                        initial={{ opacity: 0, x: 10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.04 }}
                        whileHover={{ x: 3 }}
                      >
                        <Link href={`/anime/${anime.id}`} className={styles.top10Row}>
                          <span className={`${styles.top10Rank} ${i < 3 ? styles.top10RankGold : ""}`}>
                            {i + 1}
                          </span>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={anime.poster} alt={anime.name} className={styles.top10Img} />
                          <div className={styles.top10Info}>
                            <p className={styles.top10Name}>{anime.name}</p>
                            <span className={styles.top10Meta}>
                              {anime.type}
                              {anime.episodes?.sub > 0 && ` · ${anime.episodes.sub} eps`}
                            </span>
                          </div>
                        </Link>
                      </motion.div>
                    ))
                }
              </div>
            </div>
          )}

          {!loading && topAiring.length > 0 && (
            <div className={styles.airingCard}>
              <div className={styles.airingHeader}>
                <span className={styles.titleAccent} />
                <h3 className="section-title">Top Airing</h3>
                <Link href="/browse?category=top-airing" className={styles.airingViewAll}>All →</Link>
              </div>
              <div className={styles.airingGrid}>
                {topAiring.slice(0, 6).map((anime) => (
                  <AnimeCard key={anime.id} anime={anime} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer CTA */}
      <div className={styles.abyssCta}>
        <motion.div
          className={styles.abyssCtaInner}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className={styles.abyssEyebrow}>Always Growing</p>
          <h2 className={styles.abyssTitle}>Thousands Of Anime Await</h2>
          <div className={styles.abyssBtns}>
            <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}>
              <Link href="/browse?category=top-airing" className={styles.abyssBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                Top Airing
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Link href="/search" className={styles.abyssSecondaryBtn}>
                Search Thousands Of Anime →
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
