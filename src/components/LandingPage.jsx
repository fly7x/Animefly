"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function LandingGate() {
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;
    try {
      const entered = sessionStorage.getItem("flyanime_entered");
      if (!entered) {
        router.replace("/landing");
      }
    } catch {}
  }, [pathname, router]);

  return null;
}
