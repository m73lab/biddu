import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

interface Flyer {
  id: number;
  side: "left" | "right";
  delay: number;
  duration: number;
}

interface Sparkle {
  id: number;
  angle: number;
  delay: number;
}

interface Coin {
  id: number;
  x: number;
  y: number;
}

function Counter({
  value,
  duration,
  start,
  onComplete,
}: {
  value: number;
  duration: number;
  start: boolean;
  onComplete?: () => void;
}) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const [displayValue, setDisplayValue] = useState("$0");

  useEffect(() => {
    if (start) {
      const controls = animate(count, value, {
        duration: duration,
        ease: "easeOut",
        onComplete: onComplete,
      });
      return () => controls.stop();
    }
  }, [value, count, start, duration, onComplete]);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (latest) => {
      setDisplayValue(
        `$${latest.toLocaleString("es-CL", {
          maximumFractionDigits: 0,
        })}`,
      );
    });
    return () => unsubscribe();
  }, [rounded]);

  return <span>{displayValue}</span>;
}

const POT_PATH =
  "M 250 270 C 250 340, 318 356, 400 356 C 482 356, 550 340, 550 270 Z";
const MOUTH = { cx: 400, cy: 268, rx: 148, ry: 22 };

const generateFlyers = (): Flyer[] =>
  Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    side: i % 2 === 0 ? "left" : "right",
    delay: (i % 6) * 0.55,
    duration: 1.9 + (i % 3) * 0.35,
  }));

const generateSparkles = (): Sparkle[] =>
  Array.from({ length: 14 }).map((_, i) => ({
    id: i,
    angle: (i * 360) / 14 + (i % 2) * 9,
    delay: (i % 7) * 0.09,
  }));

const generatePile = (): Coin[] => {
  const coins: Coin[] = [];
  let id = 0;
  for (let row = 0; row < 6; row++) {
    const count = 7 - row;
    const width = (count - 1) * 19;
    for (let i = 0; i < count; i++) {
      const offset =
        row % 2 === 0 ? -width / 2 + i * 19 : -width / 2 + i * 19 + 9.5;
      coins.push({
        id: id++,
        x: 400 + offset + 4,
        y: 336 - row * 11 + (row % 2) * 5,
      });
    }
  }
  return coins;
};

const orbitSamples = (rx: number, ry: number, count: number) =>
  Array.from({ length: count }).map((_, i) => {
    const a = (i / count) * Math.PI * 2;
    return { x: 400 + Math.cos(a) * rx, y: 268 + Math.sin(a) * ry };
  });

const FLYERS = generateFlyers();
const SPARKLES = generateSparkles();
const PILE = generatePile();
const ORBIT = orbitSamples(258, 84, 16);

export function ImpactVisualization() {
  const t = useTranslations("landing.impact");
  const [animationPhase, setAnimationPhase] = useState<
    "idle" | "building" | "active"
  >("idle");
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.2 });

  const reduceMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const BUILD_DURATION = 8;

  useEffect(() => {
    if (isInView && animationPhase === "idle") {
      const timer = setTimeout(() => {
        setAnimationPhase("building");
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isInView, animationPhase]);

  const showFly = animationPhase === "building";
  const showPulse = animationPhase === "active";
  const flyRepeat = reduceMotion ? 0 : Infinity;

  return (
    <section
      className="py-24 bg-base-200 relative overflow-hidden scroll-mt-24"
      ref={containerRef}
    >
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')]"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {t("sectionTitle")}{" "}
            <span className="text-secondary">{t("sectionTitleHighlight")}</span>
          </h2>
          <p className="text-xl opacity-70 max-w-2xl mx-auto">
            {t("sectionDescription")}
          </p>
        </div>

        <div className="relative w-full max-w-4xl mx-auto aspect-video md:aspect-21/9 bg-base-100 rounded-3xl border border-base-content/5 shadow-2xl overflow-hidden flex items-center justify-center">
          <svg
            viewBox="0 0 800 400"
            className="w-full h-full"
            preserveAspectRatio="xMidYMid slice"
            style={{ willChange: "transform" }}
          >
            <defs>
              <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffd98a" />
                <stop offset="55%" stopColor="#f5b940" />
                <stop offset="100%" stopColor="#e89b2d" />
              </linearGradient>
              <linearGradient
                id="potGrad"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop
                  offset="0%"
                  className="text-secondary"
                  stopColor="currentColor"
                  stopOpacity="0.28"
                />
                <stop
                  offset="100%"
                  className="text-primary"
                  stopColor="currentColor"
                  stopOpacity="0.1"
                />
              </linearGradient>
              <radialGradient id="potGlow" cx="50%" cy="40%" r="60%">
                <stop
                  offset="0%"
                  className="text-primary"
                  stopColor="currentColor"
                  stopOpacity="0.35"
                />
                <stop
                  offset="100%"
                  className="text-primary"
                  stopColor="currentColor"
                  stopOpacity="0"
                />
              </radialGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <clipPath id="potBody">
                <path d={POT_PATH} />
              </clipPath>
            </defs>

            <motion.ellipse
              cx={MOUTH.cx}
              cy={MOUTH.cy}
              rx="300"
              ry="60"
              fill="url(#potGlow)"
              initial={{ opacity: 0 }}
              animate={
                animationPhase !== "idle" ? { opacity: 1 } : { opacity: 0 }
              }
              transition={{ duration: 1.5 }}
            />

            {/* comunidad tarjeta izquierda */}
            <motion.g
              initial={{ opacity: 0, x: -24 }}
              animate={
                animationPhase !== "idle"
                  ? { opacity: 1, x: 0 }
                  : { opacity: 0, x: -24 }
              }
              transition={{ duration: 0.8 }}
            >
              <rect
                x="46"
                y="106"
                width="104"
                height="52"
                rx="14"
                className="fill-base-100 stroke-base-content"
                strokeOpacity="0.1"
                strokeWidth="1"
              />
              <circle
                cx="70"
                cy="124"
                r="9"
                className="fill-primary/20 stroke-base-content"
                strokeOpacity="0.2"
                strokeWidth="1"
              />
              <circle
                cx="84"
                cy="124"
                r="9"
                className="fill-secondary/20 stroke-base-content"
                strokeOpacity="0.2"
                strokeWidth="1"
              />
              <circle
                cx="98"
                cy="124"
                r="9"
                className="fill-accent/25 stroke-base-content"
                strokeOpacity="0.2"
                strokeWidth="1"
              />
              <rect
                x="58"
                y="140"
                width="40"
                height="9"
                rx="5"
                className="fill-base-content"
                fillOpacity="0.18"
              />
              <rect
                x="106"
                y="140"
                width="28"
                height="9"
                rx="5"
                className="fill-base-content"
                fillOpacity="0.12"
              />
            </motion.g>

            {/* comunidad tarjeta derecha */}
            <motion.g
              initial={{ opacity: 0, x: 24 }}
              animate={
                animationPhase !== "idle"
                  ? { opacity: 1, x: 0 }
                  : { opacity: 0, x: 24 }
              }
              transition={{ duration: 0.8 }}
            >
              <rect
                x="650"
                y="106"
                width="104"
                height="52"
                rx="14"
                className="fill-base-100 stroke-base-content"
                strokeOpacity="0.1"
                strokeWidth="1"
              />
              <circle
                cx="702"
                cy="124"
                r="9"
                className="fill-secondary/20 stroke-base-content"
                strokeOpacity="0.2"
                strokeWidth="1"
              />
              <circle
                cx="716"
                cy="124"
                r="9"
                className="fill-primary/20 stroke-base-content"
                strokeOpacity="0.2"
                strokeWidth="1"
              />
              <circle
                cx="730"
                cy="124"
                r="9"
                className="fill-accent/25 stroke-base-content"
                strokeOpacity="0.2"
                strokeWidth="1"
              />
              <rect
                x="692"
                y="140"
                width="36"
                height="9"
                rx="5"
                className="fill-base-content"
                fillOpacity="0.18"
              />
              <rect
                x="736"
                y="140"
                width="28"
                height="9"
                rx="5"
                className="fill-base-content"
                fillOpacity="0.12"
              />
            </motion.g>

            {/* órbita: anillo punteado */}
            <ellipse
              cx={MOUTH.cx}
              cy={MOUTH.cy}
              rx="258"
              ry="84"
              className="stroke-base-content"
              strokeOpacity="0.12"
              strokeWidth="1.5"
              strokeDasharray="3 7"
              fill="none"
            />

            {/* puntos orbitales */}
            {[0, 1, 2].map((i) => {
              const start = (i * 5) % ORBIT.length;
              const cx = ORBIT.map((p) => p.x);
              const cy = ORBIT.map((p) => p.y);
              return (
                <motion.circle
                  key={`orbit-${i}`}
                  r="3"
                  className="fill-secondary"
                  style={{ willChange: "transform, opacity" }}
                  initial={{ cx: cx[start], cy: cy[start], opacity: 0 }}
                  animate={
                    animationPhase !== "idle"
                      ? {
                          cx: [...cx.slice(start), ...cx.slice(0, start)],
                          cy: [...cy.slice(start), ...cy.slice(0, start)],
                          opacity: reduceMotion
                            ? 0.6
                            : [0, 0.9, 0.9, 0, 0.9, 0.9, 0, 0.9],
                        }
                      : { opacity: 0 }
                  }
                  transition={{
                    cx: {
                      duration: 16,
                      repeat: Infinity,
                      ease: "linear",
                    },
                    cy: {
                      duration: 16,
                      repeat: Infinity,
                      ease: "linear",
                    },
                    opacity: {
                      duration: 16,
                      repeat: Infinity,
                      ease: "linear",
                      times: [0, 0.1, 0.4, 0.5, 0.6, 0.9, 0.92, 1],
                    },
                  }}
                />
              );
            })}

            {/* monedas volando hacia la olla */}
            {FLYERS.map((f) => {
              const fromX = f.side === "left" ? 150 : 650;
              const fromY = 128;
              const toX = 400 + (f.id % 2 === 0 ? -28 : 28);
              const toY = 262;
              return (
                <motion.g key={`fly-${f.id}`}>
                  <motion.circle
                    r="7"
                    fill="url(#coinGrad)"
                    className="stroke-base-content"
                    strokeOpacity="0.35"
                    strokeWidth="0.8"
                    style={{ willChange: "transform, opacity" }}
                    initial={{ cx: fromX, cy: fromY, opacity: 0 }}
                    animate={
                      showFly
                        ? {
                            cx: [fromX, (fromX + toX) / 2 + 70, toX],
                            cy: [fromY, fromY + 78, toY + 26],
                            opacity: [0, 1, 1, 0],
                            scale: [0.7, 1, 1, 0.9],
                          }
                        : { opacity: 0 }
                    }
                    transition={{
                      duration: f.duration,
                      repeat: flyRepeat,
                      delay: f.delay,
                      ease: ["easeOut", "easeIn"],
                      times: [0, 0.45, 0.78, 1],
                    }}
                  />
                  <motion.circle
                    r="2.4"
                    fill="#ffd98a"
                    style={{ willChange: "opacity" }}
                    initial={{ cx: fromX - 2, cy: fromY - 2, opacity: 0 }}
                    animate={{
                      cx: [fromX - 2, (fromX + toX) / 2 + 66, toX - 2],
                      cy: [fromY - 2, fromY + 74, toY + 24],
                      opacity: [0, 0.9, 0.9, 0],
                    }}
                    transition={{
                      duration: f.duration,
                      repeat: flyRepeat,
                      delay: f.delay,
                      ease: ["easeOut", "easeIn"],
                      times: [0, 0.45, 0.78, 1],
                    }}
                  />
                </motion.g>
              );
            })}

            {/* olla */}
            <motion.g
              initial={{ scale: 1 }}
              animate={
                showPulse ? { scale: [1, 1.025, 1] } : { scale: 1 }
              }
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformOrigin: "400px 300px" }}
            >
              <path
                d={POT_PATH}
                className="fill-base-content"
                fillOpacity="0.07"
              />
              <path d={POT_PATH} fill="url(#potGrad)" fillOpacity="0.5" />

              {/* pila de monedas que sube */}
              <g clipPath="url(#potBody)">
                <motion.g
                  initial={{ y: 190 }}
                  animate={animationPhase !== "idle" ? { y: 0 } : { y: 190 }}
                  transition={{
                    duration: BUILD_DURATION,
                    ease: "easeOut",
                  }}
                  style={{ willChange: "transform" }}
                >
                  {PILE.map((c) => (
                    <g key={c.id} transform={`translate(${c.x} ${c.y})`}>
                      <circle r="11" fill="url(#coinGrad)" />
                      <circle
                        r="8.5"
                        fill="none"
                        stroke="#e89b2d"
                        strokeWidth="1.4"
                        strokeOpacity="0.55"
                      />
                      <circle
                        cx="-3.5"
                        cy="-3.5"
                        r="2.6"
                        fill="#ffd98a"
                        fillOpacity="0.75"
                      />
                    </g>
                  ))}
                </motion.g>
              </g>

              {/* borde de la boca */}
              <ellipse
                cx={MOUTH.cx}
                cy={MOUTH.cy}
                rx={MOUTH.rx}
                ry={MOUTH.ry}
                className="fill-base-content"
                fillOpacity="0.16"
              />
              <ellipse
                cx={MOUTH.cx}
                cy={MOUTH.cy}
                rx={MOUTH.rx - 11}
                ry={MOUTH.ry - 4}
                className="fill-base-content"
                fillOpacity="0.1"
              />

              {/* asas */}
              <circle
                cx="256"
                cy="288"
                r="13"
                className="fill-base-content"
                fillOpacity="0.1"
              />
              <circle
                cx="544"
                cy="288"
                r="13"
                className="fill-base-content"
                fillOpacity="0.1"
              />
            </motion.g>

            {/* chispas al cerrar el remate */}
            {SPARKLES.slice(0, 10).map((s) => {
              const rad = (s.angle * Math.PI) / 180;
              const xEnd = MOUTH.cx + Math.cos(rad) * (150 + (s.id % 3) * 26);
              const yEnd =
                MOUTH.cy - 18 + Math.sin(rad) * (110 + (s.id % 3) * 22);
              return (
                <motion.path
                  key={`spark-${s.id}`}
                  d={`M ${MOUTH.cx} ${MOUTH.cy - 10} L ${xEnd} ${yEnd}`}
                  stroke="currentColor"
                  className="text-accent"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                  initial={{ opacity: 0 }}
                  animate={showPulse ? { opacity: [0, 0.9, 0] } : { opacity: 0 }}
                  transition={{
                    duration: 2.4,
                    repeat: Infinity,
                    delay: s.delay,
                    repeatDelay: 2.2,
                    ease: "easeOut",
                  }}
                />
              );
            })}

            {/* ping del cierre */}
            <motion.ellipse
              cx={MOUTH.cx}
              cy={MOUTH.cy}
              rx={MOUTH.rx}
              ry={MOUTH.ry}
              className="stroke-secondary"
              strokeOpacity="0.7"
              strokeWidth="3"
              fill="none"
              initial={{ rx: MOUTH.rx, ry: MOUTH.ry, opacity: 0 }}
              animate={
                showPulse
                  ? {
                      rx: [MOUTH.rx, MOUTH.rx + 70],
                      ry: [MOUTH.ry, MOUTH.ry + 58],
                      opacity: [0.7, 0],
                    }
                  : { opacity: 0 }
              }
              transition={{
                duration: 2.6,
                repeat: Infinity,
                repeatDelay: 1.4,
                ease: "easeOut",
              }}
            />

            {/* etiqueta del remate */}
            <g>
              <rect
                x="330"
                y="378"
                width="140"
                height="18"
                rx="9"
                className="fill-base-content"
                fillOpacity="0.9"
              />
              <text
                x="400"
                y="390"
                textAnchor="middle"
                className="fill-base-100"
                style={{ fontSize: "11px", fontWeight: 700 }}
                letterSpacing="1.5"
              >
                {t("exampleAuctionName")}
              </text>
            </g>
          </svg>

          <div className="absolute top-8 left-8 bg-base-100/80 backdrop-blur px-4 py-2 rounded-lg border border-base-content/5 shadow-lg">
            <div className="text-xs text-base-content/60">{t("totalValue")}</div>
            <div className="text-lg font-bold font-mono text-primary">
              <Counter
                value={12450000}
                duration={BUILD_DURATION}
                start={animationPhase === "building"}
                onComplete={() => setAnimationPhase("active")}
              />
            </div>
          </div>

          <div className="absolute bottom-8 right-8 bg-base-100/80 backdrop-blur px-4 py-2 rounded-lg border border-base-content/5 shadow-lg">
            <div className="text-xs text-base-content/60">
              {t("itemsCollected")}
            </div>
            <div className="flex -space-x-2 mt-1">
              <div className="w-6 h-6 rounded-full bg-primary/20 border border-base-100"></div>
              <div className="w-6 h-6 rounded-full bg-secondary/20 border border-base-100"></div>
              <div className="w-6 h-6 rounded-full bg-accent/20 border border-base-100"></div>
              <div className="w-6 h-6 rounded-full bg-base-200 border border-base-100 flex items-center justify-center text-[10px] font-bold">
                {t("moreItems", { count: 42 })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}