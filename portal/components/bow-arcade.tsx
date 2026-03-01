"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type GameKey = "dotDash" | "brainMath" | "simon" | "reflex" | "wordBlitz";

interface ArcadeScores {
  dotDash: number;
  brainMath: number;
  simon: number;
  reflex: number;
  wordBlitz: number;
}

interface GameProps {
  muted: boolean;
  onGameEnd: (score: number) => void;
}

// ─── localStorage helpers ────────────────────────────────────────────────────

const BLANK_SCORES: ArcadeScores = { dotDash: 0, brainMath: 0, simon: 0, reflex: 0, wordBlitz: 0 };

function loadScores(): ArcadeScores {
  try {
    const raw = localStorage.getItem("bow-arcade-scores");
    return raw ? { ...BLANK_SCORES, ...(JSON.parse(raw) as Partial<ArcadeScores>) } : BLANK_SCORES;
  } catch {
    return BLANK_SCORES;
  }
}

function persistScores(s: ArcadeScores) {
  try { localStorage.setItem("bow-arcade-scores", JSON.stringify(s)); } catch { /* ignore */ }
}

// ─── Sound engine (Web Audio API, zero deps) ─────────────────────────────────

function playTone(freq: number, dur: number, type: OscillatorType, vol: number) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctx = window.AudioContext ?? (window as any).webkitAudioContext as typeof AudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch { /* ignore — AudioContext blocked or unavailable */ }
}

const sfx = {
  pop:  (m: boolean) => { if (!m) playTone(880, 0.08, "square", 0.15); },
  buzz: (m: boolean) => { if (!m) playTone(140, 0.25, "sawtooth", 0.12); },
  tick: (m: boolean) => { if (!m) playTone(440, 0.05, "square", 0.10); },
  win:  (m: boolean) => {
    if (m) return;
    playTone(523, 0.15, "square", 0.12);
    setTimeout(() => playTone(659, 0.15, "square", 0.12), 150);
    setTimeout(() => playTone(784, 0.25, "square", 0.12), 300);
  },
};

// ─── Game 1: Dot Dash ─────────────────────────────────────────────────────────

const DOT_COLORS = ["#1262ff", "#1f8f5f", "#c53338", "#be7a07", "#8b5cf6", "#ec4899"];

function makeDot() {
  return {
    x: 10 + Math.random() * 80,
    y: 10 + Math.random() * 80,
    color: DOT_COLORS[Math.floor(Math.random() * DOT_COLORS.length)],
    id: Date.now() + Math.random(),
  };
}

function DotDash({ muted, onGameEnd }: GameProps) {
  const [phase, setPhase] = useState<"countdown" | "playing" | "over">("countdown");
  const [count, setCount] = useState(3);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [dot, setDot] = useState<ReturnType<typeof makeDot> | null>(null);
  const [shrinkMs, setShrinkMs] = useState(1500);

  const missTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep latest values accessible inside timeout callbacks without stale closures
  const latestRef = useRef({ score: 0, lives: 3, shrinkMs: 1500, phase: "countdown" as typeof phase });
  latestRef.current = { score, lives, shrinkMs, phase };
  const reported = useRef(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  function clearMiss() {
    if (missTimerRef.current) { clearTimeout(missTimerRef.current); missTimerRef.current = null; }
  }

  // Countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    const id = setInterval(() => {
      setCount(c => {
        if (c <= 1) { clearInterval(id); setPhase("playing"); return 0; }
        return c - 1;
      });
    }, 800);
    return () => clearInterval(id);
  }, [phase]);

  // Spawn first dot when playing starts
  useEffect(() => {
    if (phase !== "playing") return;
    setDot(makeDot());
    return clearMiss;
  }, [phase]);

  // Schedule miss timer whenever the dot changes
  useEffect(() => {
    if (phase !== "playing" || !dot) return;
    clearMiss();
    missTimerRef.current = setTimeout(() => {
      const { lives: l, score: s, phase: p } = latestRef.current;
      if (p !== "playing") return;
      sfx.buzz(mutedRef.current);
      const nl = l - 1;
      if (nl <= 0) {
        setLives(0);
        setPhase("over");
        if (!reported.current) { reported.current = true; onGameEnd(s); }
      } else {
        setLives(nl);
        setDot(makeDot());
      }
    }, latestRef.current.shrinkMs);
    return clearMiss;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dot?.id, phase]);

  function onTap() {
    if (phase !== "playing") return;
    clearMiss();
    sfx.pop(mutedRef.current);
    const ns = latestRef.current.score + 1;
    setScore(ns);
    setShrinkMs(Math.max(500, 1500 - Math.floor(ns / 5) * 100));
    setDot(makeDot());
  }

  function restart() {
    reported.current = false;
    setScore(0); setLives(3); setShrinkMs(1500); setCount(3); setDot(null);
    setPhase("countdown");
  }

  if (phase === "countdown") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 96, fontWeight: 900, color: "var(--color-brand)", lineHeight: 1 }}>
          {count > 0 ? count : "GO!"}
        </div>
        <p style={{ color: "var(--color-text-muted)", marginTop: 16 }}>Tap dots before they shrink away!</p>
      </div>
    );
  }

  if (phase === "over") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Game Over!</div>
        <div style={{ fontSize: 64, fontWeight: 900, color: "var(--color-brand)", marginBottom: 24 }}>{score}</div>
        <button onClick={restart} style={{ minWidth: 140 }}>Play Again</button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div className="ba-lives" style={{ marginTop: 12 }}>
        {[0, 1, 2].map(i => <span key={i} style={{ opacity: i < lives ? 1 : 0.2 }}>❤️</span>)}
        <span style={{ marginLeft: 10, fontSize: 13, color: "var(--color-text-muted)", fontWeight: 600 }}>
          Score: {score}
        </span>
      </div>
      {dot && (
        <div
          key={dot.id}
          className="dd-dot dd-shrink"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: 64,
            height: 64,
            background: dot.color,
            "--dd-duration": `${shrinkMs}ms`,
          } as React.CSSProperties}
          onClick={onTap}
          role="button"
          aria-label="Tap the dot!"
        />
      )}
    </div>
  );
}

// ─── Game 2: Brain Math ───────────────────────────────────────────────────────

type MathLevel = 1 | 2 | 3 | 4;
interface MathQ { expr: string; answer: number; choices: number[]; }

function makeQuestion(level: MathLevel): MathQ {
  const r = (n: number) => Math.floor(Math.random() * n) + 1;
  let expr: string, answer: number;
  if (level === 1) {
    const a = r(20), b = r(20); expr = `${a} + ${b}`; answer = a + b;
  } else if (level === 2) {
    const a = r(20) + 10, b = r(a); expr = `${a} \u2212 ${b}`; answer = a - b;
  } else if (level === 3) {
    if (Math.random() < 0.5) { const a = r(20), b = r(20); expr = `${a} + ${b}`; answer = a + b; }
    else { const a = r(20) + 10, b = r(a); expr = `${a} \u2212 ${b}`; answer = a - b; }
  } else {
    const a = r(9) + 1, b = r(9) + 1; expr = `${a} \u00d7 ${b}`; answer = a * b;
  }
  const wrongs = new Set<number>();
  while (wrongs.size < 3) {
    const d = Math.floor(Math.random() * 6) + 1;
    const w = Math.random() < 0.5 ? answer + d : Math.max(0, answer - d);
    if (w !== answer) wrongs.add(w);
  }
  return { expr, answer, choices: [answer, ...wrongs].sort(() => Math.random() - 0.5) };
}

function BrainMath({ muted, onGameEnd }: GameProps) {
  const [q, setQ] = useState<MathQ>(() => makeQuestion(1));
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState<MathLevel>(1);
  const [flash, setFlash] = useState<{ idx: number; ok: boolean } | null>(null);

  const scoreRef = useRef(0); scoreRef.current = score;
  const reported = useRef(false);
  const mutedRef = useRef(muted); mutedRef.current = muted;
  const pickRef = useRef<(idx: number) => void>(() => {});

  function levelFor(s: number): MathLevel {
    return s >= 15 ? 4 : s >= 10 ? 3 : s >= 5 ? 2 : 1;
  }

  function pick(idx: number) {
    if (flash) return;
    const ok = q.choices[idx] === q.answer;
    setFlash({ idx, ok });
    if (ok) {
      sfx.pop(mutedRef.current);
      const ns = scoreRef.current + 1;
      setScore(ns);
      setStreak(s => s + 1);
      const nl = levelFor(ns);
      setLevel(nl);
      setTimeout(() => { setFlash(null); setQ(makeQuestion(nl)); }, 300);
    } else {
      sfx.buzz(mutedRef.current);
      setStreak(0);
      setTimeout(() => { setFlash(null); setQ(makeQuestion(level)); }, 650);
    }
  }

  pickRef.current = pick;

  // Keyboard shortcut: 1-4 keys
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 4) pickRef.current(n - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Report score when unmounted (game has no natural end)
  useEffect(() => () => {
    if (!reported.current && scoreRef.current > 0) {
      reported.current = true;
      onGameEnd(scoreRef.current);
    }
  }, [onGameEnd]);

  const LEVEL_NAMES: Record<MathLevel, string> = {
    1: "Addition", 2: "Subtraction", 3: "Mixed", 4: "Multiplication",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 16px" }}>
      <div className="bm-level">Level {level} — {LEVEL_NAMES[level]}</div>
      <div className="bm-streak">{streak >= 3 ? `🔥 ${streak} in a row!` : "\u00a0"}</div>
      <div className="bm-problem">{q.expr} = ?</div>
      <div className="bm-grid">
        {q.choices.map((c, i) => (
          <button
            key={i}
            className={`bm-btn${flash?.idx === i ? (flash.ok ? " flash-correct" : " flash-wrong") : ""}`}
            onClick={() => pick(i)}
          >
            {c}
          </button>
        ))}
      </div>
      <p style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 16 }}>Press keys 1–4 to answer faster</p>
    </div>
  );
}

// ─── Game 3: Simon Flash ─────────────────────────────────────────────────────

const SIMON_COLORS = [
  "#1262ff", "#1f8f5f", "#c53338", "#be7a07",
  "#8b5cf6", "#ec4899", "#0891b2", "#ea580c", "#16a34a",
];

type SimonPhase = "INTRO" | "SHOW" | "INPUT" | "WIN_ROUND" | "LOSE_TRY" | "OVER";

interface SimonState {
  phase: SimonPhase;
  sequence: number[];
  inputIdx: number;
  triesLeft: number;
  score: number;
  litIdx: number | null;
}

type SimonAction =
  | { type: "INIT" }
  | { type: "LIT"; idx: number | null }
  | { type: "INPUT_READY" }
  | { type: "TAP"; tile: number }
  | { type: "NEXT_ROUND" }
  | { type: "RETRY" }
  | { type: "OVER" };

function simonInit(): SimonState {
  return { phase: "INTRO", sequence: [], inputIdx: 0, triesLeft: 3, score: 0, litIdx: null };
}

function simonReducer(s: SimonState, a: SimonAction): SimonState {
  switch (a.type) {
    case "INIT":
      return { ...simonInit(), phase: "SHOW", sequence: [Math.floor(Math.random() * 9)] };
    case "LIT":
      return { ...s, litIdx: a.idx };
    case "INPUT_READY":
      return { ...s, phase: "INPUT", litIdx: null, inputIdx: 0 };
    case "TAP": {
      if (s.phase !== "INPUT") return s;
      if (s.sequence[s.inputIdx] !== a.tile) {
        return { ...s, phase: "LOSE_TRY", triesLeft: s.triesLeft - 1 };
      }
      const next = s.inputIdx + 1;
      if (next >= s.sequence.length) {
        return { ...s, phase: "WIN_ROUND", score: s.sequence.length, inputIdx: next };
      }
      return { ...s, inputIdx: next };
    }
    case "NEXT_ROUND":
      return {
        ...s, phase: "SHOW", inputIdx: 0, litIdx: null,
        sequence: [...s.sequence, Math.floor(Math.random() * 9)],
      };
    case "RETRY":
      return { ...s, phase: "SHOW", inputIdx: 0, litIdx: null };
    case "OVER":
      return { ...s, phase: "OVER" };
    default:
      return s;
  }
}

function SimonFlash({ muted, onGameEnd }: GameProps) {
  const [st, dispatch] = useReducer(simonReducer, undefined, simonInit);
  const [tapped, setTapped] = useState<number | null>(null);
  const reported = useRef(false);
  const scoreRef = useRef(0); scoreRef.current = st.score;
  const mutedRef = useRef(muted); mutedRef.current = muted;

  // Play the sequence with staggered timeouts
  useEffect(() => {
    if (st.phase !== "SHOW") return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    st.sequence.forEach((tile, i) => {
      timers.push(setTimeout(() => {
        if (cancelled) return;
        dispatch({ type: "LIT", idx: tile });
        sfx.tick(mutedRef.current);
        timers.push(setTimeout(() => {
          if (cancelled) return;
          dispatch({ type: "LIT", idx: null });
          if (i === st.sequence.length - 1) {
            timers.push(setTimeout(() => {
              if (!cancelled) dispatch({ type: "INPUT_READY" });
            }, 300));
          }
        }, 600));
      }, 400 + i * 900));
    });
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.phase, st.sequence.length]);

  // WIN_ROUND → pause then continue
  useEffect(() => {
    if (st.phase !== "WIN_ROUND") return;
    sfx.pop(mutedRef.current);
    const t = setTimeout(() => dispatch({ type: "NEXT_ROUND" }), 700);
    return () => clearTimeout(t);
  }, [st.phase]);

  // LOSE_TRY → retry or over
  useEffect(() => {
    if (st.phase !== "LOSE_TRY") return;
    sfx.buzz(mutedRef.current);
    const t = setTimeout(() => {
      if (st.triesLeft <= 0) dispatch({ type: "OVER" });
      else dispatch({ type: "RETRY" });
    }, 900);
    return () => clearTimeout(t);
  }, [st.phase, st.triesLeft]);

  // Game over → report score
  useEffect(() => {
    if (st.phase === "OVER" && !reported.current) {
      reported.current = true;
      onGameEnd(scoreRef.current);
    }
  }, [st.phase, onGameEnd]);

  function tapTile(tile: number) {
    if (st.phase !== "INPUT") return;
    setTapped(tile);
    dispatch({ type: "TAP", tile });
    setTimeout(() => setTapped(null), 140);
  }

  if (st.phase === "INTRO") {
    return (
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Watch the tiles flash,<br />then repeat the pattern!</p>
        <p style={{ color: "var(--color-text-muted)", marginBottom: 24, fontSize: 14 }}>You get 3 tries per round.</p>
        <button onClick={() => dispatch({ type: "INIT" })} style={{ minWidth: 160 }}>Start</button>
      </div>
    );
  }

  if (st.phase === "OVER") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Game Over!</div>
        <div style={{ fontSize: 64, fontWeight: 900, color: "var(--color-brand)", marginBottom: 8 }}>{st.score}</div>
        <p style={{ color: "var(--color-text-muted)", marginBottom: 24 }}>sequence length</p>
        <button onClick={() => { reported.current = false; dispatch({ type: "INIT" }); }} style={{ minWidth: 140 }}>
          Play Again
        </button>
      </div>
    );
  }

  const phaseLabel: Partial<Record<SimonPhase, string>> = {
    SHOW: "Watch carefully...",
    INPUT: "Your turn! Repeat it!",
    WIN_ROUND: "✅ Keep going!",
    LOSE_TRY: "❌ Watch again...",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div className="sf-round">Round {st.sequence.length} &bull; {st.triesLeft} ❤️ left</div>
      <div className="sf-grid">
        {SIMON_COLORS.map((color, i) => (
          <div
            key={i}
            className={[
              "sf-tile",
              st.litIdx === i ? "lit" : "",
              tapped === i ? "player-tap" : "",
              st.phase === "LOSE_TRY" ? "shake" : "",
            ].filter(Boolean).join(" ")}
            style={{ background: color, cursor: st.phase === "INPUT" ? "pointer" : "default" }}
            onClick={() => tapTile(i)}
            role={st.phase === "INPUT" ? "button" : undefined}
            aria-label={st.phase === "INPUT" ? `Tile ${i + 1}` : undefined}
          />
        ))}
      </div>
      <div className="sf-phase">{phaseLabel[st.phase] ?? "\u00a0"}</div>
    </div>
  );
}

// ─── Game 4: Reflex Ring ──────────────────────────────────────────────────────

const RR_CX = 130, RR_CY = 130, RR_R = 108;
const TARGET_HALF = 0.12; // fraction of a full turn covered by the green zone
const MAX_TAPS = 10;

function ringPoint(turns: number) {
  const a = turns * 2 * Math.PI;
  return { x: RR_CX + RR_R * Math.sin(a), y: RR_CY - RR_R * Math.cos(a) };
}

function ReflexRing({ muted, onGameEnd }: GameProps) {
  const [phase, setPhase] = useState<"intro" | "playing" | "over">("intro");
  const [angle, setAngle] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [taps, setTaps] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; cls: string } | null>(null);

  const rafRef = useRef<number | null>(null);
  const t0Ref = useRef(0);
  const speedRef = useRef(0.00065); // turns per ms
  const latestRef = useRef({ score: 0, lives: 3, taps: 0, angle: 0 });
  latestRef.current = { score, lives, taps, angle };
  const reported = useRef(false);
  const phaseRef = useRef<"intro" | "playing" | "over">("intro");
  phaseRef.current = phase;
  const mutedRef = useRef(muted); mutedRef.current = muted;

  function stopRaf() {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }

  useEffect(() => {
    if (phase !== "playing") return;
    t0Ref.current = 0;
    function loop(now: number) {
      if (!t0Ref.current) t0Ref.current = now;
      const a = ((now - t0Ref.current) * speedRef.current) % 1;
      setAngle(a);
      latestRef.current.angle = a;
      if (phaseRef.current === "playing") rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return stopRaf;
  }, [phase]);

  function inZone(a: number) {
    let n = a % 1; if (n > 0.5) n -= 1;
    return Math.abs(n) <= TARGET_HALF;
  }

  function distFromCenter(a: number) {
    let n = a % 1; if (n > 0.5) n -= 1;
    return Math.abs(n);
  }

  function onTap() {
    if (phase !== "playing") return;
    const { angle: a, score: s, lives: l, taps: t } = latestRef.current;
    if (inZone(a)) {
      const dist = distFromCenter(a);
      const pts = Math.max(10, Math.round(100 * (1 - dist / TARGET_HALF)));
      sfx.pop(mutedRef.current);
      const ns = s + pts;
      const nt = t + 1;
      setScore(ns); setTaps(nt);
      latestRef.current.score = ns; latestRef.current.taps = nt;
      if (nt % 2 === 0) speedRef.current = Math.min(0.0025, speedRef.current + 0.00012);
      setFeedback(pts >= 80 ? { text: `⚡ Perfect! +${pts}`, cls: "perfect" } : { text: `👍 Good! +${pts}`, cls: "ok" });
      if (nt >= MAX_TAPS) {
        stopRaf(); setPhase("over");
        if (!reported.current) { reported.current = true; onGameEnd(ns); }
      }
    } else {
      sfx.buzz(mutedRef.current);
      const nl = l - 1; setLives(nl);
      latestRef.current.lives = nl;
      setFeedback({ text: "❌ Miss!", cls: "miss" });
      if (nl <= 0) {
        stopRaf(); setPhase("over");
        if (!reported.current) { reported.current = true; onGameEnd(s); }
      }
    }
    setTimeout(() => setFeedback(null), 700);
  }

  function restart() {
    reported.current = false; speedRef.current = 0.00065;
    setScore(0); setLives(3); setTaps(0); setFeedback(null);
    setPhase("playing");
  }

  const dot = ringPoint(angle);
  const ts = ringPoint(-TARGET_HALF);
  const te = ringPoint(TARGET_HALF);

  if (phase === "intro") {
    return (
      <div style={{ textAlign: "center", padding: "0 24px" }}>
        <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Tap when the dot hits the green zone!</p>
        <p style={{ color: "var(--color-text-muted)", marginBottom: 24, fontSize: 13 }}>
          Closer to center = more points. {MAX_TAPS} taps, 3 lives.
        </p>
        <button onClick={() => setPhase("playing")} style={{ minWidth: 160 }}>Start</button>
      </div>
    );
  }

  if (phase === "over") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Round Over!</div>
        <div style={{ fontSize: 64, fontWeight: 900, color: "var(--color-brand)", marginBottom: 24 }}>{score}</div>
        <button onClick={restart} style={{ minWidth: 140 }}>Play Again</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div className="ba-lives">
        {[0, 1, 2].map(i => <span key={i} style={{ opacity: i < lives ? 1 : 0.2 }}>❤️</span>)}
        <span style={{ marginLeft: 12, fontSize: 13, color: "var(--color-text-muted)", fontWeight: 600 }}>
          {taps}/{MAX_TAPS} taps
        </span>
      </div>
      <svg
        width={260}
        height={260}
        style={{ cursor: "pointer", marginTop: 8 }}
        onClick={onTap}
        role="button"
        aria-label="Reflex ring — tap it!"
      >
        {/* Track ring */}
        <circle cx={RR_CX} cy={RR_CY} r={RR_R} fill="none" stroke="var(--color-border)" strokeWidth={16} />
        {/* Green target zone */}
        <path
          d={`M ${ts.x.toFixed(2)} ${ts.y.toFixed(2)} A ${RR_R} ${RR_R} 0 0 1 ${te.x.toFixed(2)} ${te.y.toFixed(2)}`}
          fill="none"
          stroke="#1f8f5f"
          strokeWidth={18}
          strokeLinecap="round"
        />
        {/* Moving dot */}
        <circle cx={dot.x} cy={dot.y} r={11} fill="var(--color-brand)" />
        {/* Center label */}
        <text x={RR_CX} y={RR_CY + 6} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--color-text-muted)">
          TAP!
        </text>
      </svg>
      <div className={`rr-feedback${feedback ? ` ${feedback.cls}` : ""}`}>
        {feedback?.text ?? "\u00a0"}
      </div>
    </div>
  );
}

// ─── Game 5: Word Blitz ───────────────────────────────────────────────────────

const WORD_BANK = [
  "SCORE", "QUEST", "TRACK", "BONUS", "BADGE", "LEVEL", "POINT",
  "EARN", "LEARN", "FOCUS", "GRIND", "SKILL", "STREAK", "LESSON",
  "REWARD", "EFFORT", "COACH", "TRAIN", "CHAMP", "GOALS", "GRADE",
  "MATCH", "PITCH", "SQUAD", "STATS", "TIMER", "VAULT", "HUSTLE",
  "MODULE", "RAFFLE",
];

function makeWordPuzzle() {
  const word = WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
  const letters = word.split("").sort(() => Math.random() - 0.5);
  if (letters.join("") === word && word.length > 1) letters.reverse();
  return { word, letters };
}

function WordBlitz({ muted, onGameEnd }: GameProps) {
  const [phase, setPhase] = useState<"playing" | "over">("playing");
  const [puzzle, setPuzzle] = useState(makeWordPuzzle);
  const [chosen, setChosen] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(8);
  const [flashWin, setFlashWin] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef = useRef(0); scoreRef.current = score;
  const livesRef = useRef(3); livesRef.current = lives;
  const reported = useRef(false);
  const mutedRef = useRef(muted); mutedRef.current = muted;

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function nextWord() {
    setPuzzle(makeWordPuzzle());
    setChosen([]);
    setTimeLeft(8);
  }

  // Timer resets when puzzle word changes (new word) or phase becomes playing
  useEffect(() => {
    if (phase !== "playing") return;
    setTimeLeft(8);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => t - 1);
    }, 1000);
    return stopTimer;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle.word, phase]);

  // React when timer hits 0
  useEffect(() => {
    if (timeLeft > 0 || phase !== "playing") return;
    stopTimer();
    sfx.buzz(mutedRef.current);
    const nl = livesRef.current - 1;
    if (nl <= 0) {
      setPhase("over");
      if (!reported.current) { reported.current = true; onGameEnd(scoreRef.current); }
    } else {
      setLives(nl);
      nextWord();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase]);

  function tapLetter(idx: number) {
    if (chosen.includes(idx) || phase !== "playing") return;
    sfx.tick(mutedRef.current);
    const nc = [...chosen, idx];
    setChosen(nc);
    if (nc.length === puzzle.word.length) {
      const attempt = nc.map(i => puzzle.letters[i]).join("");
      if (attempt === puzzle.word) {
        setFlashWin(true);
        sfx.pop(mutedRef.current);
        setScore(s => s + 10);
        stopTimer();
        setTimeout(() => { setFlashWin(false); nextWord(); }, 500);
      } else {
        sfx.buzz(mutedRef.current);
        setTimeout(() => setChosen([]), 400);
      }
    }
  }

  function removeLast() {
    if (chosen.length === 0 || phase !== "playing") return;
    setChosen(c => c.slice(0, -1));
  }

  function restart() {
    reported.current = false;
    setScore(0); setLives(3); setChosen([]);
    setPuzzle(makeWordPuzzle());
    setPhase("playing");
  }

  if (phase === "over") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Game Over!</div>
        <div style={{ fontSize: 64, fontWeight: 900, color: "var(--color-brand)", marginBottom: 8 }}>{score}</div>
        <p style={{ color: "var(--color-text-muted)", marginBottom: 24 }}>points (+10 per word)</p>
        <button onClick={restart} style={{ minWidth: 140 }}>Play Again</button>
      </div>
    );
  }

  const answerChars = chosen.map(i => puzzle.letters[i]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 380, padding: "0 16px" }}>
      <div className="wb-timer-bar">
        <div
          className={`wb-timer-fill${timeLeft <= 3 ? " low" : ""}`}
          style={{ width: `${(timeLeft / 8) * 100}%` }}
        />
      </div>
      <div className="ba-lives" style={{ marginBottom: 12 }}>
        {[0, 1, 2].map(i => <span key={i} style={{ opacity: i < lives ? 1 : 0.2 }}>❤️</span>)}
      </div>
      {/* Answer row */}
      <div className="wb-answer">
        {Array.from({ length: puzzle.word.length }).map((_, i) => (
          <div
            key={i}
            className={`wb-answer-slot${answerChars[i] ? " filled" : ""}`}
            style={flashWin ? { background: "var(--color-success)", color: "#fff", borderColor: "var(--color-success)" } : undefined}
          >
            {answerChars[i] ?? ""}
          </div>
        ))}
      </div>
      {/* Scrambled letter tiles */}
      <div className="wb-letters">
        {puzzle.letters.map((l, i) => (
          <div
            key={i}
            className={`wb-letter${chosen.includes(i) ? " used" : ""}`}
            onClick={() => tapLetter(i)}
            role="button"
            aria-label={`Letter ${l}`}
          >
            {l}
          </div>
        ))}
      </div>
      <button
        onClick={removeLast}
        disabled={chosen.length === 0}
        style={{ fontSize: 13, padding: "8px 20px", marginTop: 4, opacity: chosen.length === 0 ? 0.4 : 1 }}
      >
        ← Undo
      </button>
    </div>
  );
}

// ─── BOW Arcade Shell ─────────────────────────────────────────────────────────

const GAME_META: { key: GameKey; icon: string; name: string }[] = [
  { key: "dotDash",   icon: "🎯", name: "Dot Dash"   },
  { key: "brainMath", icon: "🧮", name: "Brain Math" },
  { key: "simon",     icon: "🧠", name: "Simon"      },
  { key: "reflex",    icon: "⚡", name: "Reflex"     },
  { key: "wordBlitz", icon: "🔤", name: "Word Blitz" },
];

export function BowArcade({ statusMessage = "Signing you in\u2026" }: { statusMessage?: string }) {
  const [game, setGame] = useState<GameKey>("dotDash");
  const [showRecords, setShowRecords] = useState(false);
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem("bow-arcade-muted") === "1"; } catch { return false; }
  });
  const [scores, setScores] = useState<ArcadeScores>(loadScores);
  const [liveScore, setLiveScore] = useState(0);
  const [newRecord, setNewRecord] = useState(false);

  const mutedRef = useRef(muted); mutedRef.current = muted;

  // Create stable per-game handlers so each game reports to the correct key
  // even if the user switches tabs mid-cleanup.
  const handlers = useMemo<Record<GameKey, (score: number) => void>>(() => {
    function make(key: GameKey) {
      return (score: number) => {
        setLiveScore(score);
        setScores(prev => {
          if (score > prev[key]) {
            const next = { ...prev, [key]: score };
            persistScores(next);
            setNewRecord(true);
            sfx.win(mutedRef.current);
            setTimeout(() => setNewRecord(false), 3000);
            return next;
          }
          return prev;
        });
      };
    }
    return {
      dotDash: make("dotDash"),
      brainMath: make("brainMath"),
      simon: make("simon"),
      reflex: make("reflex"),
      wordBlitz: make("wordBlitz"),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchGame(key: GameKey) {
    if (key === game) return;
    setGame(key);
    setLiveScore(0);
    setNewRecord(false);
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    try { localStorage.setItem("bow-arcade-muted", next ? "1" : "0"); } catch { /* ignore */ }
  }

  return (
    <div className="bow-arcade" role="dialog" aria-label="BOW Arcade — play while you wait!">

      {/* ── Top bar ── */}
      <div className="ba-topbar">
        <span className="ba-title">🎮 BOW Arcade</span>
        <div className="ba-status">
          <span className="ba-pulse" aria-hidden="true" />
          {statusMessage}
        </div>
        <button className="ba-icon-btn" onClick={toggleMute} aria-label={muted ? "Unmute sounds" : "Mute sounds"}>
          {muted ? "🔇" : "🔊"}
        </button>
        <button className="ba-icon-btn" onClick={() => setShowRecords(v => !v)} aria-label="My Records">
          🏆
        </button>
      </div>

      {/* ── Game tabs ── */}
      <div className="ba-tabs" role="tablist" aria-label="Choose a game">
        {GAME_META.map(g => (
          <button
            key={g.key}
            role="tab"
            aria-selected={game === g.key}
            className={`ba-tab${game === g.key ? " active" : ""}`}
            onClick={() => switchGame(g.key)}
          >
            <span className="ba-tab-icon" aria-hidden="true">{g.icon}</span>
            {g.name}
          </button>
        ))}
      </div>

      {/* ── Play area ── */}
      <div className="ba-play" role="tabpanel">
        {game === "dotDash"   && <DotDash    key="dotDash"   muted={muted} onGameEnd={handlers.dotDash}   />}
        {game === "brainMath" && <BrainMath  key="brainMath" muted={muted} onGameEnd={handlers.brainMath} />}
        {game === "simon"     && <SimonFlash key="simon"     muted={muted} onGameEnd={handlers.simon}     />}
        {game === "reflex"    && <ReflexRing key="reflex"    muted={muted} onGameEnd={handlers.reflex}    />}
        {game === "wordBlitz" && <WordBlitz  key="wordBlitz" muted={muted} onGameEnd={handlers.wordBlitz} />}

        {/* Records overlay */}
        {showRecords && (
          <div className="ba-records">
            <div style={{ display: "flex", alignItems: "center" }}>
              <span className="ba-records-title">🏆 My Records</span>
              <button
                className="ba-icon-btn"
                style={{ marginLeft: "auto" }}
                onClick={() => setShowRecords(false)}
                aria-label="Close records"
              >
                ✕
              </button>
            </div>
            {GAME_META.map(g => (
              <div key={g.key} className="ba-records-row">
                <span>{g.icon} {g.name}</span>
                <span className="ba-records-score">{scores[g.key] || "—"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Score strip ── */}
      <div className="ba-score-strip" aria-live="polite" aria-atomic="true">
        <span>Score: <span className="ba-score-val">{liveScore}</span></span>
        <span className="ba-best">Best: {scores[game] || "—"}</span>
        {newRecord && <span className="ba-record-banner">🏆 NEW RECORD!</span>}
      </div>
    </div>
  );
}
