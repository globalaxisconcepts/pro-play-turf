"use client";

import { useEffect } from "react";

/**
 * Ports the reference landing page's vanilla scroll behaviours into React:
 *  - `.rv` elements fade/slide in on first intersection
 *  - `[data-count]` numbers count up when their strip enters view
 *  - `.pass` cards do a subtle 3D tilt toward the cursor
 * All effects respect `prefers-reduced-motion`. Mounted once per page.
 */
export function ScrollFX() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // reveal
    const revealEls = Array.from(document.querySelectorAll<HTMLElement>(".rv"));
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12 },
    );
    revealEls.forEach((el) => io.observe(el));

    // count-up
    const co = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          co.unobserve(e.target);
          e.target
            .querySelectorAll<HTMLElement>("[data-count]")
            .forEach((n) => {
              const end = Number(n.dataset.count);
              const suf = n.dataset.suffix ?? "";
              const pre = n.textContent?.trim().startsWith("$") ? "$" : "";
              if (reduce || Number.isNaN(end)) {
                n.textContent = `${pre}${end}${suf}`;
                return;
              }
              const dur = 1100;
              const start = performance.now();
              const tick = (now: number) => {
                const p = Math.min((now - start) / dur, 1);
                n.textContent = `${pre}${Math.round(end * (0.2 + 0.8 * p * (2 - p)))}${suf}`;
                if (p < 1) requestAnimationFrame(tick);
                else n.textContent = `${pre}${end}${suf}`;
              };
              requestAnimationFrame(tick);
            });
        }),
      { threshold: 0.4 },
    );
    document
      .querySelectorAll(".stats, .fp-stat")
      .forEach((el) => co.observe(el));

    // pass card tilt
    const cleanups: (() => void)[] = [];
    if (!reduce) {
      document.querySelectorAll<HTMLElement>(".pass").forEach((c) => {
        const move = (e: MouseEvent) => {
          const r = c.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5;
          const y = (e.clientY - r.top) / r.height - 0.5;
          c.style.transform = `perspective(800px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-4px)`;
        };
        const leave = () => (c.style.transform = "");
        c.addEventListener("mousemove", move);
        c.addEventListener("mouseleave", leave);
        cleanups.push(() => {
          c.removeEventListener("mousemove", move);
          c.removeEventListener("mouseleave", leave);
        });
      });
    }

    return () => {
      io.disconnect();
      co.disconnect();
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return null;
}
