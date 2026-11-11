"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SiteBrand } from "@/components/SiteBrand";
import { DrawToolbar } from "@/components/DrawToolbar";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawImperativeAPI = any;

// Dynamically import the wrapper (not Excalidraw directly) so the CSS
// import inside ExcalidrawWrapper only runs client-side.
const ExcalidrawWrapper = dynamic(
  () => import("@/components/ExcalidrawWrapper").then((mod) => mod.ExcalidrawWrapper),
  { ssr: false, loading: () => <CanvasLoader /> }
);

type SubmitState =
  | { type: "idle" }
  | { type: "submitting" }
  | { type: "success" }
  | { type: "error"; message: string };

export default function DrawClient({ isAdmin }: { isAdmin: boolean }) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const onExcalidrawAPI = useCallback((api: ExcalidrawImperativeAPI) => setExcalidrawAPI(api), []);
  const [githubHandle, setGithubHandle] = useState("");
  const [state, setState] = useState<SubmitState>({ type: "idle" });
  const [tool, setTool] = useState<"freedraw" | "eraser">("freedraw");
  const [color, setColor] = useState("#1e1e1e");
  const pastRef = useRef<string[]>(["[]"]);
  const futureRef = useRef<string[]>([]);
  const restoringRef = useRef(false);

  const onStableScene = useCallback((json: string) => {
    if (restoringRef.current) return;
    if (pastRef.current.at(-1) === json) return;
    pastRef.current.push(json);
    if (pastRef.current.length > 50) pastRef.current.shift();
    futureRef.current = [];
  }, []);

  const applyScene = useCallback((json: string) => {
    if (!excalidrawAPI) return;
    restoringRef.current = true;
    excalidrawAPI.updateScene({
      elements: JSON.parse(json),
      captureUpdate: "NEVER",
    });
    queueMicrotask(() => {
      restoringRef.current = false;
    });
  }, [excalidrawAPI]);

  const handleTool = useCallback((next: "freedraw" | "eraser") => {
    setTool(next);
    excalidrawAPI?.setActiveTool({ type: next });
  }, [excalidrawAPI]);

  const handleColor = useCallback((next: string) => {
    setColor(next);
    setTool("freedraw");
    excalidrawAPI?.updateScene({
      appState: { currentItemStrokeColor: next },
    });
    excalidrawAPI?.setActiveTool({ type: "freedraw" });
  }, [excalidrawAPI]);

  const handleUndo = useCallback(() => {
    if (pastRef.current.length < 2) return;
    const current = pastRef.current.pop();
    if (!current) return;
    futureRef.current.push(current);
    applyScene(pastRef.current.at(-1) ?? "[]");
  }, [applyScene]);

  const handleRedo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(next);
    applyScene(next);
  }, [applyScene]);

  const handleClear = useCallback(() => {
    if (!excalidrawAPI) return;
    const json = JSON.stringify(excalidrawAPI.getSceneElements());
    onStableScene(json);
    excalidrawAPI.resetScene();
    excalidrawAPI.setActiveTool({ type: "freedraw" });
    excalidrawAPI.updateScene({
      appState: { currentItemStrokeColor: color },
    });
    setTool("freedraw");
    onStableScene("[]");
  }, [excalidrawAPI, color, onStableScene]);

  async function handleSubmit() {
    if (!githubHandle.trim()) {
      setState({ type: "error", message: "Please enter your GitHub username." });
      return;
    }

    if (!excalidrawAPI) {
      setState({ type: "error", message: "Canvas not ready — please wait a moment." });
      return;
    }

    const elements = excalidrawAPI.getSceneElements();
    const hasContent = elements.some((el: { isDeleted: boolean }) => !el.isDeleted);
    if (!hasContent) {
      setState({ type: "error", message: "Draw something first!" });
      return;
    }

    setState({ type: "submitting" });

    try {
      // Export canvas to blob
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const blob = await exportToBlob({
        elements,
        appState: excalidrawAPI.getAppState(),
        files: excalidrawAPI.getFiles(),
        mimeType: "image/png",
        quality: 0.92,
      });

      const formData = new FormData();
      formData.append("image", blob, "animal.png");
      formData.append("githubHandle", githubHandle.trim());

      const res = await fetch("/api/animals", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Submission failed. Please try again.");
      }

      setState({ type: "success" });
    } catch (err) {
      setState({
        type: "error",
        message: err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  }

  if (state.type === "success") {
    return <SuccessScreen githubHandle={githubHandle} />;
  }

  return (
    <div className="draw-app">
      <nav className="draw-nav">
        <SiteBrand />
        <div className="draw-nav-links">
          <Link href="/wall" className="draw-nav-link">
            The Wall
          </Link>
          {isAdmin && (
            <>
              <Link href="/settings" className="draw-nav-link">
                Settings
              </Link>
              <Link href="/auth/logout" className="draw-nav-link">
                Logout
              </Link>
            </>
          )}
        </div>
      </nav>

      <main className="draw-main">
        <section className="draw-stage">
          <DrawToolbar
            api={excalidrawAPI}
            tool={tool}
            color={color}
            onTool={handleTool}
            onColor={handleColor}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onClear={handleClear}
          />
          <div className="draw-canvas">
            <ExcalidrawWrapper
              excalidrawAPI={onExcalidrawAPI}
              onStableScene={onStableScene}
            />
          </div>
        </section>

        <aside className="draw-sheet">
          <div className="draw-sheet-copy">
            <h1 className="draw-heading">Draw your animal</h1>
            <p className="draw-heading-sub">
              Sketch anything wild. AI animates it onto the wall.
            </p>
          </div>

          <div className="draw-sheet-form">
            <Label htmlFor="github-handle" className="draw-label">
              GitHub username
            </Label>
            <div className="draw-handle">
              <span className="draw-handle-at" aria-hidden>
                @
              </span>
              <Input
                id="github-handle"
                value={githubHandle}
                onChange={(e) => {
                  setGithubHandle(e.target.value.replace(/^@/, ""));
                  if (state.type === "error") setState({ type: "idle" });
                }}
                placeholder="yourusername"
                autoComplete="username"
                enterKeyHint="done"
                className="draw-handle-input"
                disabled={state.type === "submitting"}
              />
            </div>
          </div>

          <details className="draw-tips">
            <summary>Tips</summary>
            <ul>
              <li>Big shapes = better animation</li>
              <li>Bold lines over fine details</li>
              <li>Keep it fun — stick figures are welcome</li>
            </ul>
          </details>

          {state.type === "error" && (
            <div className="draw-error" role="alert">
              {state.message}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={state.type === "submitting"}
            className="draw-submit btn-primary border-0"
          >
            {state.type === "submitting" ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                Unleashing…
              </>
            ) : (
              "Unleash your animal"
            )}
          </Button>
        </aside>
      </main>
    </div>
  );
}

function CanvasLoader() {
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: "#1e1e2e" }}
    >
      <p style={{ color: "var(--text-muted)" }}>Loading canvas…</p>
    </div>
  );
}

const PIPELINE_STEPS = [
  {
    icon: "🗄️",
    label: "Saving your drawing",
    detail: "Storing the original on the wall",
    color: "var(--electric-purple)",
    durationMs: 1200,
  },
  {
    icon: "🎬",
    label: "Animating with Grok AI",
    detail: "Turning your sketch into a video in the background",
    color: "var(--hot-pink)",
    durationMs: 2200,
  },
  {
    icon: "🐾",
    label: "Hitting The Wall",
    detail: "Your animal is live — no sign-in required",
    color: "var(--neon-cyan)",
    durationMs: 1400,
  },
];

function SuccessScreen({ githubHandle }: { githubHandle: string }) {
  const [activeStep, setActiveStep] = useState(0);
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());
  const [allDone, setAllDone] = useState(false);

  useEffect(() => {
    let current = 0;
    let cancelled = false;

    function advance() {
      if (cancelled) return;
      if (current >= PIPELINE_STEPS.length) {
        setAllDone(true);
        return;
      }
      setActiveStep(current);
      const step = current;
      const duration = PIPELINE_STEPS[step].durationMs;
      setTimeout(() => {
        if (cancelled) return;
        setDoneSteps((prev) => new Set([...prev, step]));
        current += 1;
        setTimeout(advance, 300);
      }, duration);
    }

    advance();

    return () => { cancelled = true; };
  }, []);

  const progressPct = allDone
    ? 100
    : Math.round((doneSteps.size / PIPELINE_STEPS.length) * 100);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-12"
      style={{ background: "var(--bg-dark)" }}
    >
      <div className="max-w-xl w-full flex flex-col items-center gap-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-3">
          <div className="text-7xl">{allDone ? "🎉" : "⚙️"}</div>
          <h1
            className="text-5xl tracking-wide leading-none"
            style={{ fontFamily: "var(--font-bangers)" }}
          >
            <span className="gradient-text glow-pink">ANIMAL</span>
            <br />
            <span style={{ color: "var(--neon-cyan)" }}>
              {allDone ? "UNLEASHED!" : "IN THE WORKS…"}
            </span>
          </h1>
          <p className="text-base" style={{ color: "var(--text-muted)" }}>
            {allDone ? (
              <>
                <span style={{ color: "var(--neon-cyan)" }}>@{githubHandle}</span>&apos;s animal is on the wall. Animation keeps cooking in the background.
              </>
            ) : (
              "Your drawing is in. AI is bringing it to life."
            )}
          </p>
        </div>

        {/* Overall progress bar */}
        <div className="w-full flex flex-col gap-2">
          <div className="flex justify-between text-xs" style={{ color: "var(--text-muted)" }}>
            <span style={{ fontFamily: "var(--font-bangers)", letterSpacing: "0.05em" }}>
              PIPELINE PROGRESS
            </span>
            <span>{progressPct}%</span>
          </div>
          <div
            className="w-full h-2 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(90deg, var(--hot-pink), var(--electric-purple), var(--neon-cyan))",
                boxShadow: "0 0 8px rgba(0,245,255,0.5)",
              }}
            />
          </div>
        </div>

        {/* Step list */}
        <div className="w-full flex flex-col gap-3">
          {PIPELINE_STEPS.map((step, i) => {
            const isDone = doneSteps.has(i);
            const isActive = activeStep === i && !isDone;
            const isPending = !isDone && !isActive;

            return (
              <div
                key={i}
                className="flex items-center gap-4 rounded-2xl px-5 py-4 transition-all duration-500"
                style={{
                  background: isDone
                    ? "rgba(255,255,255,0.04)"
                    : isActive
                    ? `rgba(${step.color === "var(--hot-pink)" ? "255,45,120" : step.color === "var(--electric-purple)" ? "176,38,255" : step.color === "var(--neon-cyan)" ? "0,245,255" : "255,215,0"},0.08)`
                    : "rgba(255,255,255,0.02)",
                  border: `1px solid ${
                    isDone
                      ? "rgba(255,255,255,0.08)"
                      : isActive
                      ? step.color
                      : "rgba(255,255,255,0.06)"
                  }`,
                  opacity: isPending ? 0.4 : 1,
                  boxShadow: isActive ? `0 0 16px -4px ${step.color}` : "none",
                }}
              >
                {/* Icon / spinner / check */}
                <div
                  className="text-2xl w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: isDone
                      ? "rgba(255,255,255,0.06)"
                      : isActive
                      ? `${step.color}22`
                      : "transparent",
                  }}
                >
                  {isDone ? (
                    <span style={{ color: "var(--neon-cyan)", fontSize: "1.1rem" }}>✓</span>
                  ) : isActive ? (
                    <span className="animate-spin inline-block" style={{ fontSize: "1rem" }}>⟳</span>
                  ) : (
                    <span style={{ fontSize: "1.1rem" }}>{step.icon}</span>
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 text-left">
                  <p
                    className="text-sm font-semibold"
                    style={{
                      color: isDone
                        ? "var(--text-muted)"
                        : isActive
                        ? step.color
                        : "var(--text-muted)",
                    }}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {step.detail}
                  </p>
                </div>

                {/* Status badge */}
                <div className="shrink-0">
                  {isDone ? (
                    <span
                      className="text-xs font-bold tracking-widest uppercase px-2 py-1 rounded-lg"
                      style={{
                        background: "rgba(0,245,255,0.1)",
                        color: "var(--neon-cyan)",
                      }}
                    >
                      Done
                    </span>
                  ) : isActive ? (
                    <span
                      className="text-xs font-bold tracking-widest uppercase px-2 py-1 rounded-lg"
                      style={{
                        background: `${step.color}22`,
                        color: step.color,
                      }}
                    >
                      Running
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA — only show when done */}
        {allDone && (
          <div className="flex gap-4 pt-2">
            <Link href="/wall" className="btn-primary">
              See The Wall 🐾
            </Link>
            <Link href="/draw" className="btn-secondary">
              Draw Another
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
