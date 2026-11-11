"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function DrawClient({ isAdmin }: { isAdmin: boolean }) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const onExcalidrawAPI = useCallback((api: ExcalidrawImperativeAPI) => setExcalidrawAPI(api), []);
  const [githubHandle, setGithubHandle] = useState("");
  const [state, setState] = useState<SubmitState>({ type: "idle" });

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
    <div className="flex-1 flex flex-col overflow-hidden min-h-0" style={{ background: "var(--bg-dark)" }}>
      {/* Nav */}
      <nav
        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        <Link
          href="/"
          className="text-2xl tracking-wider hover:opacity-80 transition-opacity"
          style={{ fontFamily: "var(--font-bangers)", color: "var(--hot-pink)" }}
        >
          PARTY ANIMALS
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/wall" className="text-sm hover:text-white transition-colors" style={{ color: "var(--text-muted)" }}>
            The Wall
          </Link>
          {isAdmin && (
            <>
              <Link href="/settings" className="text-sm hover:text-white transition-colors" style={{ color: "var(--text-muted)" }}>
                Settings
              </Link>
              <Link href="/auth/logout" className="text-sm hover:text-white transition-colors" style={{ color: "var(--text-muted)" }}>
                Logout
              </Link>
            </>
          )}
        </div>
      </nav>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden min-h-0 min-w-0">
          <ExcalidrawWrapper
            excalidrawAPI={onExcalidrawAPI}
          />
        </div>

        {/* Sidebar — scrollable; capped at 50vh on mobile, full height on desktop */}
        <div
          className="w-full lg:w-80 shrink-0 flex flex-col gap-6 p-6 border-t lg:border-t-0 lg:border-l overflow-y-auto max-h-[50vh] lg:max-h-none"
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
              Sketch anything wild. AI animates it into a video that hits the wall — and GitHub.
            </p>
          </div>

          <Separator className="opacity-20" />

          {/* GitHub handle input */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="github-handle" className="text-sm font-semibold tracking-wide" style={{ color: "var(--text-primary)" }}>
              Your GitHub Username
            </Label>
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold select-none"
                style={{ color: "var(--text-muted)" }}
              >
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
                className="pl-7"
                style={{
                  background: "var(--bg-dark)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
                disabled={state.type === "submitting"}
              />
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              You&apos;ll be mentioned in the GitHub issue when your animal is posted.
            </p>
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
                <span style={{ color: "var(--neon-cyan)" }}>@{githubHandle}</span>&apos;s party animal is on the wall. Animation keeps cooking in the background.
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
