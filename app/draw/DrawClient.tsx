"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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

export default function DrawClient({
  displayName,
  boxConnected,
}: {
  displayName: string;
  boxConnected: boolean;
}) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const onExcalidrawAPI = useCallback((api: ExcalidrawImperativeAPI) => setExcalidrawAPI(api), []);
  const [state, setState] = useState<SubmitState>({ type: "idle" });

  async function handleSubmit() {
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
    return <SuccessScreen displayName={displayName} boxConnected={boxConnected} />;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0" style={{ background: "var(--bg-dark)" }}>
      {/* Nav */}
      <nav
        className="flex flex-wrap items-center justify-between gap-y-2 px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        <Link
          href="/"
          className="text-2xl tracking-wider hover:opacity-80 transition-opacity"
          style={{ fontFamily: "var(--font-bangers)", color: "var(--hot-pink)" }}
        >
          PARTY ANIMALS
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/wall" className="text-sm hover:text-white transition-colors" style={{ color: "var(--text-muted)" }}>
            The Wall
          </Link>
          <Link href="/settings" className="text-sm hover:text-white transition-colors" style={{ color: "var(--text-muted)" }}>
            Settings
          </Link>
          <Link href="/auth/logout" className="text-sm hover:text-white transition-colors" style={{ color: "var(--text-muted)" }}>
            Logout
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden min-h-[45vh] lg:min-h-0">
          <ExcalidrawWrapper
            excalidrawAPI={onExcalidrawAPI}
          />
        </div>

        {/* Sidebar — scrollable; capped at 45vh on mobile, full height on desktop */}
        <div
          className="w-full lg:w-80 shrink-0 flex flex-col gap-5 p-4 sm:p-6 border-t lg:border-t-0 lg:border-l overflow-y-auto max-h-[45vh] lg:max-h-none"
          style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
        >
          <div>
            <h1
              className="text-3xl tracking-wide mb-1"
              style={{ fontFamily: "var(--font-bangers)" }}
            >
              <span className="gradient-text">DRAW YOUR</span>
              <br />
              <span style={{ color: "var(--neon-cyan)" }}>PARTY ANIMAL</span>
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Sketch anything wild. Claude names it, Grok animates it, and it hits the wall.
            </p>
          </div>

          <Separator className="opacity-20" />

          {/* Attribution */}
          <div
            className="rounded-xl p-4 flex items-center gap-3"
            style={{
              background: "rgba(0,240,255,0.06)",
              border: "1px solid rgba(0,240,255,0.2)",
            }}
          >
            <span className="text-xl">🎨</span>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest font-bold" style={{ color: "var(--neon-cyan)" }}>
                Drawing as
              </p>
              <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                {displayName}
              </p>
            </div>
          </div>

          {/* Box status */}
          <div
            className="rounded-xl p-4 text-xs flex items-start gap-3"
            style={{
              background: boxConnected ? "rgba(0,240,255,0.06)" : "rgba(255,215,0,0.06)",
              border: boxConnected
                ? "1px solid rgba(0,240,255,0.2)"
                : "1px solid rgba(255,215,0,0.2)",
              color: boxConnected ? "var(--neon-cyan)" : "var(--gold)",
            }}
          >
            <span className="text-lg">📦</span>
            <span>
              {boxConnected ? (
                "Box connected — your animal will be saved to your Box account automatically."
              ) : (
                <>
                  Box not connected — your animal still hits the wall, but won&apos;t be
                  saved to Box.{" "}
                  <Link href="/settings" className="underline hover:opacity-80">
                    Connect in Settings
                  </Link>
                </>
              )}
            </span>
          </div>

          {/* Tips */}
          <div
            className="rounded-xl p-4 flex flex-col gap-2"
            style={{
              background: "rgba(176,38,255,0.06)",
              border: "1px solid rgba(176,38,255,0.2)",
            }}
          >
            <p
              className="text-xs font-bold tracking-widest uppercase"
              style={{ color: "var(--electric-purple)" }}
            >
              Tips
            </p>
            {[
              "Big shapes = better animation",
              "Bold lines over fine details",
              "Keep it fun — no stick figures… unless that is your thing",
            ].map((tip) => (
              <p key={tip} className="text-xs flex gap-2" style={{ color: "var(--text-muted)" }}>
                <span style={{ color: "var(--electric-purple)" }}>✦</span> {tip}
              </p>
            ))}
          </div>

          {/* Error */}
          {state.type === "error" && (
            <div
              className="rounded-xl p-3 text-sm"
              style={{
                background: "rgba(255,45,120,0.1)",
                border: "1px solid rgba(255,45,120,0.3)",
                color: "var(--hot-pink)",
              }}
            >
              {state.message}
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={state.type === "submitting"}
            className="w-full btn-primary border-0 mt-auto"
            style={{
              background: state.type === "submitting"
                ? "rgba(255,45,120,0.4)"
                : "linear-gradient(135deg, var(--hot-pink), var(--electric-purple))",
            }}
          >
            {state.type === "submitting" ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                Unleashing…
              </>
            ) : (
              "Unleash Your Animal! 🐾"
            )}
          </Button>
        </div>
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

const BASE_PIPELINE_STEPS = [
  {
    icon: "🧠",
    label: "Claude Reads Your Drawing",
    detail: "Writing a title + description of what it sees",
    color: "var(--electric-purple)",
    durationMs: 2400,
  },
  {
    icon: "🎬",
    label: "Animating with Grok AI",
    detail: "Converting your drawing into a video",
    color: "var(--hot-pink)",
    durationMs: 3200,
  },
  {
    icon: "🗄️",
    label: "Saving to Neon Database",
    detail: "Storing your animal on the wall",
    color: "var(--gold)",
    durationMs: 1800,
  },
];

const BOX_PIPELINE_STEPS = [
  {
    icon: "🔐",
    label: "Auth0 Token Vault",
    detail: "Fetching short-lived Box credentials — securely",
    color: "var(--neon-cyan)",
    durationMs: 2400,
  },
  {
    icon: "📦",
    label: "Saving to Box",
    detail: "Dropping your drawing + animation in your Box account",
    color: "var(--gold)",
    durationMs: 1600,
  },
];

function SuccessScreen({
  displayName,
  boxConnected,
}: {
  displayName: string;
  boxConnected: boolean;
}) {
  const steps = boxConnected
    ? [...BASE_PIPELINE_STEPS, ...BOX_PIPELINE_STEPS]
    : BASE_PIPELINE_STEPS;
  const [activeStep, setActiveStep] = useState(0);
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());
  const [allDone, setAllDone] = useState(false);

  useEffect(() => {
    let current = 0;
    let cancelled = false;

    function advance() {
      if (cancelled) return;
      if (current >= steps.length) {
        setAllDone(true);
        return;
      }
      setActiveStep(current);
      const step = current;
      const duration = steps[step].durationMs;
      setTimeout(() => {
        if (cancelled) return;
        setDoneSteps((prev) => new Set([...prev, step]));
        current += 1;
        setTimeout(advance, 300);
      }, duration);
    }

    advance();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progressPct = allDone
    ? 100
    : Math.round((doneSteps.size / steps.length) * 100);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-center px-4 sm:px-6 py-12"
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
                <span style={{ color: "var(--neon-cyan)" }}>{displayName}</span>&apos;s party
                animal is heading to the wall{boxConnected ? " — and your Box account!" : "!"}
              </>
            ) : (
              "Watch the full agent pipeline run in real-time."
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
          {steps.map((step, i) => {
            const isDone = doneSteps.has(i);
            const isActive = activeStep === i && !isDone;
            const isPending = !isDone && !isActive;

            return (
              <div
                key={i}
                className="flex items-center gap-4 rounded-2xl px-4 sm:px-5 py-4 transition-all duration-500"
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
                    {step.label === "Auth0 Token Vault" && (
                      <span
                        className="ml-2 text-xs font-bold tracking-widest uppercase px-1.5 py-0.5 rounded"
                        style={{
                          background: "rgba(0,245,255,0.12)",
                          color: "var(--neon-cyan)",
                          border: "1px solid rgba(0,245,255,0.3)",
                        }}
                      >
                        Auth0
                      </span>
                    )}
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
          <div className="flex flex-wrap gap-4 pt-2 justify-center">
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
