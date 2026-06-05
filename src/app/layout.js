import { Suspense } from "react";
import "@/styles/globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/components/AuthProvider";
import LandingGate from "@/components/LandingGate";
import ThemeProvider from "@/components/ThemeProvider";

export const viewport = {
  themeColor: "#07060b",
};

export const metadata = {
  title: { default: "Fly Anime — Watch Anime Free", template: "%s | Fly Anime" },
  description: "Stream anime in HD. Sub & Dub available. No account required.",
  keywords: ["anime", "watch anime", "fly-anime", "anime streaming", "free anime"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>

      <ThemeProvider>
        {children}
        </ThemeProvider>
        <AuthProvider>
          {/* Redirects first-time visitors to /landing */}
          <Suspense fallback={null}>
            <LandingGate />
          </Suspense>
          <Suspense fallback={null}>
            <Navbar />
          </Suspense>
          <main style={{ minHeight: "100vh", paddingTop: "var(--nav-h)" }}>
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
