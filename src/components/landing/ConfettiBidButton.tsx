"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { createPortal } from "react-dom";

type Shape = "rect" | "circle";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  shape: Shape;
  rotation: number;
  vRot: number;
  phase: number;
  flutterDir: number;
  flutterSpeed: number;
  life: number;
  maxLife: number;
  gravity: number;
  drag: number;
}

const COLORS = ["#e89b2d", "#f5b940", "#ffd98a", "#faf6ee", "#e11d48"];
const MAX_PARTICLES = 140;

export function ConfettiBidButton({ label }: { label: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  const ensureCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(window.innerWidth * dpr);
    const h = Math.floor(window.innerHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  const spawn = useCallback((originX: number, originY: number, count: number) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const n = reduce ? Math.min(count, 40) : count;
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * (reduce ? 0.6 : 1.1);
      const speed = 9 + Math.random() * (reduce ? 6 : 11);
      particlesRef.current.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed * 0.9,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        shape: Math.random() < 0.6 ? "rect" : "circle",
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.3,
        phase: Math.random() * Math.PI * 2,
        flutterDir: Math.random() < 0.5 ? -1 : 1,
        flutterSpeed: 0.04 + Math.random() * 0.09,
        life: 0,
        maxLife: 150 + Math.random() * 90,
        gravity: 0.1 + Math.random() * 0.05,
        drag: 0.99,
      });
    }
  }, []);

  const step = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    const alive: Particle[] = [];

    for (const p of particlesRef.current) {
      p.life += 1;
      p.vy += p.gravity;
      p.vx *= p.drag;
      p.vy *= p.drag * 0.999;
      p.phase += p.flutterSpeed * p.flutterDir;
      p.x += p.vx + Math.sin(p.phase) * 0.7;
      p.y += p.vy;
      p.rotation += p.vRot;

      const progress = p.life / p.maxLife;
      const alpha = progress > 0.65 ? 1 - (progress - 0.65) / 0.35 : 1;

      if (alpha <= 0 || p.y > h + 30 || p.x < -30 || p.x > w + 30) continue;

      ctx.save();
      ctx.globalAlpha = Math.max(alpha, 0);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const w2 = p.size;
        const h2 = Math.max(3, p.size * 0.45);
        ctx.fillRect(-w2 / 2, -h2 / 2, w2, h2);
      }
      ctx.restore();
      alive.push(p);
    }

    particlesRef.current = alive;

    if (particlesRef.current.length > 0) {
      rafRef.current = requestAnimationFrame(step);
    } else {
      ctx.clearRect(0, 0, w, h);
      rafRef.current = null;
    }
  }, []);

  const fire = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      ensureCanvas();
      const rect = event.currentTarget.getBoundingClientRect();
      spawn(rect.left + rect.width / 2, rect.top + rect.height / 2, MAX_PARTICLES);
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(step);
      }
    },
    [ensureCanvas, spawn, step],
  );

  const canvasEl = (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9999] h-full w-full"
    />
  );

  return (
    <>
      <button
        type="button"
        onClick={fire}
        aria-label={label}
        className="btn border-0 bg-gold-500 text-ink-950 hover:bg-gold-400 rounded-full px-7 min-h-11 sm:ml-auto cursor-pointer"
      >
        <span className="icon-[tabler--gavel] size-5"></span>
        {label}
      </button>
      {mounted ? createPortal(canvasEl, document.body) : null}
    </>
  );
}