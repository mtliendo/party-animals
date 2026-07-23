"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import type { Animal } from "@/lib/db";

export default function WallClient({ animals: initialAnimals, isLoggedIn }: { animals: Animal[]; isLoggedIn: boolean }) {
  const [animals, setAnimals] = useState<Animal[]>(initialAnimals);
  const [selected, setSelected] = useState<Animal | null>(null);

  const closeModal = useCallback(() => setSelected(null), []);
  const removeAnimal = useCallback((id: string) => {
    setAnimals((current) => current.filter((a) => a.id !== id));
    setSelected((current) => (current?.id === id ? null : current));
  }, []);
  const updateAnimal = useCallback((updated: Animal) => {
    setAnimals((current) =>
      current.map((animal) => (animal.id === updated.id ? updated : animal))
    );
    setSelected((current) => (current?.id === updated.id ? updated : current));
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!selected) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selected, closeModal]);

  // Lock body scroll while the modal is open (mobile-friendly)
  useEffect(() => {
    if (!selected) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [selected]);

  useEffect(() => {
    // Keep polling while any animal is missing its video or Claude description
    const hasPending = animals.some((a) => !a.video_url || !a.title);
    if (!hasPending) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/animals");
        if (!res.ok) return;
        const fresh: Animal[] = await res.json();
        setAnimals(fresh);
        const stillPending = fresh.some((a) => !a.video_url || !a.title);
        if (!stillPending) clearInterval(interval);
      } catch {
        // silently ignore transient fetch errors
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [animals]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-dark)" }}>
      {/* Nav */}
      <nav
        className="flex flex-wrap items-center justify-between gap-y-2 px-4 sm:px-6 py-4 border-b"
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
          <span
            className="text-sm font-semibold tracking-widest uppercase hidden sm:inline"
            style={{ color: "var(--neon-cyan)" }}
          >
            The Wall
          </span>
          {isLoggedIn && (
            <Link
              href="/settings"
              className="text-sm hover:text-white transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              Settings
            </Link>
          )}
          <Link href="/draw" className="btn-primary text-sm py-2 px-5">
            Draw Yours
          </Link>
        </div>
      </nav>

      <main className="flex-1 px-4 sm:px-6 py-8 sm:py-12 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1
            className="text-5xl sm:text-7xl mb-4 tracking-wide"
            style={{ fontFamily: "var(--font-bangers)" }}
          >
            <span className="gradient-text glow-pink">THE WALL</span>
          </h1>
          <p className="text-lg mb-4" style={{ color: "var(--text-muted)" }}>
            Every animal, immortalized forever.
          </p>
          <Link href="/draw" className="btn-primary inline-block text-sm px-6 py-2.5">
            Draw Your Animal
          </Link>
          <Separator className="mt-8 opacity-20" />
        </div>

        {/* Count badge */}
        <div className="flex items-center justify-between mb-8">
          <Badge
            className="text-sm px-4 py-1.5"
            style={{
              background: "rgba(255,45,120,0.12)",
              border: "1px solid rgba(255,45,120,0.3)",
              color: "var(--hot-pink)",
            }}
          >
            {animals.length} {animals.length === 1 ? "animal" : "animals"} on the wall
          </Badge>
        </div>

        {/* Grid */}
        {animals.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {animals.map((animal) => (
              <AnimalCard key={animal.id} animal={animal} onClick={() => setSelected(animal)} />
            ))}
          </div>
        )}
      </main>

      <footer
        className="text-center py-8 text-xs border-t px-4"
        style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
      >
        Powered by{" "}
        <span style={{ color: "var(--hot-pink)" }}>Auth0 Token Vault</span> ·{" "}
        <span style={{ color: "var(--neon-cyan)" }}>Grok AI</span> ·{" "}
        <span style={{ color: "var(--electric-purple)" }}>Claude</span> ·{" "}
        <span style={{ color: "var(--gold)" }}>Box</span>
      </footer>

      {selected && (
        <AnimalModal
          animal={selected}
          onClose={closeModal}
          onAnimalUpdated={updateAnimal}
          onAnimalDeleted={removeAnimal}
          isLoggedIn={isLoggedIn}
        />
      )}
    </div>
  );
}

function AnimalCard({ animal, onClick }: { animal: Animal; onClick: () => void }) {
  return (
    <div
      className="card flex flex-col cursor-pointer group"
      onClick={onClick}
    >
      {/* Media */}
      <div
        className="relative w-full aspect-square overflow-hidden"
        style={{ background: "var(--bg-card-hover)" }}
      >
        {animal.video_url ? (
          <video
            src={animal.video_url}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : animal.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={animal.image_url}
            alt={animal.title ?? `${animal.handle}'s party animal`}
            className="w-full h-full object-contain p-4"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="w-full h-full" />
          </div>
        )}

        {/* Hover overlay hint */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "rgba(0,0,0,0.45)" }}
        >
          <span
            className="text-sm font-semibold tracking-widest uppercase"
            style={{ color: "var(--neon-cyan)" }}
          >
            View
          </span>
        </div>

        {/* Status pill */}
        <div className="absolute top-3 right-3">
          {animal.status === "posted" ? (
            <Badge
              className="text-xs"
              style={{
                background: "rgba(0,240,255,0.15)",
                border: "1px solid rgba(0,240,255,0.4)",
                color: "var(--neon-cyan)",
              }}
            >
              Saved to Box
            </Badge>
          ) : animal.video_url ? (
            <Badge
              className="text-xs"
              style={{
                background: "rgba(176,38,255,0.15)",
                border: "1px solid rgba(176,38,255,0.4)",
                color: "var(--electric-purple)",
              }}
            >
              Animated
            </Badge>
          ) : (
            <Badge
              className="text-xs"
              style={{
                background: "rgba(255,215,0,0.15)",
                border: "1px solid rgba(255,215,0,0.4)",
                color: "var(--gold)",
              }}
            >
              Processing
            </Badge>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 flex flex-col gap-1">
        <p
          className="text-sm font-semibold leading-snug"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-bangers)", letterSpacing: "0.03em" }}
        >
          {animal.title ?? "Untitled masterpiece…"}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold" style={{ color: "var(--hot-pink)" }}>
            {animal.handle}
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {new Date(animal.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

// Vercel Blob honors ?download=1 by serving the file with a
// Content-Disposition: attachment header — the `download` attribute alone is
// ignored on cross-origin URLs.
function downloadUrl(url: string) {
  return `${url}${url.includes("?") ? "&" : "?"}download=1`;
}

function DownloadLink({ url, label }: { url: string; label: string }) {
  return (
    <a
      href={downloadUrl(url)}
      className="text-center py-2.5 text-xs font-semibold tracking-widest uppercase hover:opacity-70 transition-opacity"
      style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}
    >
      ↓ {label}
    </a>
  );
}

function AnimalModal({
  animal,
  onClose,
  onAnimalUpdated,
  onAnimalDeleted,
  isLoggedIn,
}: {
  animal: Animal;
  onClose: () => void;
  onAnimalUpdated: (animal: Animal) => void;
  onAnimalDeleted: (id: string) => void;
  isLoggedIn: boolean;
}) {
  const [saveState, setSaveState] = useState<
    { type: "idle" } | { type: "saving" } | { type: "success" } | { type: "error"; message: string }
  >({ type: "idle" });
  const [deleteState, setDeleteState] = useState<"idle" | "confirming" | "deleting">("idle");

  async function handleSaveToBox() {
    setSaveState({ type: "saving" });

    try {
      const res = await fetch(`/api/animals/${animal.id}/save-to-box`, {
        method: "POST",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save to Box.");
      }

      onAnimalUpdated({
        ...animal,
        status: "posted",
        box_url: data.boxUrl ?? animal.box_url,
      });
      setSaveState({ type: "success" });
    } catch (err) {
      setSaveState({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save to Box.",
      });
    }
  }

  async function handleDelete() {
    if (deleteState === "idle") { setDeleteState("confirming"); return; }
    setDeleteState("deleting");
    try {
      await fetch(`/api/animals/${animal.id}`, { method: "DELETE" });
      onAnimalDeleted(animal.id);
    } catch {
      setDeleteState("idle");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl overflow-y-auto max-h-[90dvh] overscroll-contain"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "0 0 60px rgba(255,45,120,0.15), 0 0 120px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b"
          style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
        >
          <div className="flex flex-col min-w-0">
            <span
              className="text-lg sm:text-xl tracking-wide leading-tight truncate"
              style={{ fontFamily: "var(--font-bangers)", color: "var(--hot-pink)" }}
            >
              {animal.title ?? `${animal.handle}'s Party Animal`}
            </span>
            <span className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
              by {animal.handle} ·{" "}
              {new Date(animal.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-xl leading-none hover:opacity-60 transition-opacity shrink-0 p-2 -m-2"
            style={{ color: "var(--text-muted)" }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* What the agent saw */}
        <div
          className="px-4 sm:px-6 py-4 border-b"
          style={{ borderColor: "var(--border)", background: "rgba(176,38,255,0.04)" }}
        >
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-1"
            style={{ color: "var(--electric-purple)" }}
          >
            🧠 What the agent saw
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
            {animal.description ?? "Claude is still studying this masterpiece…"}
          </p>
        </div>

        {/* Media panels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
          {/* Original drawing */}
          <div
            className="flex flex-col border-b sm:border-b-0 sm:border-r"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="text-center py-2 text-xs font-semibold tracking-widest uppercase"
              style={{
                color: "var(--neon-cyan)",
                borderBottom: "1px solid var(--border)",
                background: "rgba(0,240,255,0.04)",
              }}
            >
              Original Drawing
            </div>
            <div
              className="aspect-square flex items-center justify-center p-4"
              style={{ background: "var(--bg-dark)" }}
            >
              {animal.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={animal.image_url}
                  alt={animal.title ?? `${animal.handle}'s original drawing`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Skeleton className="w-full h-full" />
              )}
            </div>
            {animal.image_url && (
              <DownloadLink url={animal.image_url} label="Download Image" />
            )}
          </div>

          {/* Animated video */}
          <div className="flex flex-col">
            <div
              className="text-center py-2 text-xs font-semibold tracking-widest uppercase"
              style={{
                color: "var(--electric-purple)",
                borderBottom: "1px solid var(--border)",
                background: "rgba(176,38,255,0.04)",
              }}
            >
              AI Animation
            </div>
            <div
              className="aspect-square flex items-center justify-center"
              style={{ background: "var(--bg-dark)" }}
            >
              {animal.video_url ? (
                <video
                  src={animal.video_url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Skeleton className="w-24 h-24 rounded-full" />
                  <span className="text-xs" style={{ color: "var(--gold)" }}>
                    Generating animation…
                  </span>
                </div>
              )}
            </div>
            {animal.video_url && (
              <DownloadLink url={animal.video_url} label="Download Video" />
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex flex-col gap-2">
            {isLoggedIn && (
              <button
                onClick={handleSaveToBox}
                disabled={!animal.image_url || saveState.type === "saving"}
                className="btn-primary text-sm px-5 py-2 border-0"
                style={{
                  background:
                    saveState.type === "saving"
                      ? "rgba(255,45,120,0.4)"
                      : "linear-gradient(135deg, var(--hot-pink), var(--electric-purple))",
                }}
              >
                {saveState.type === "saving"
                  ? "Saving..."
                  : animal.status === "posted"
                    ? "Save to Box Again"
                    : "Save to Box 📦"}
              </button>
            )}
            {saveState.type === "error" && (
              <span className="text-xs" style={{ color: "var(--hot-pink)" }}>
                {saveState.message}
              </span>
            )}
            {saveState.type === "success" && (
              <span className="text-xs" style={{ color: "var(--neon-cyan)" }}>
                Saved to Box!
              </span>
            )}
            {animal.box_url && (
              <a
                href={animal.box_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold hover:opacity-80 transition-opacity"
                style={{ color: "var(--neon-cyan)" }}
              >
                View folder in Box →
              </a>
            )}
          </div>
          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2">
            <div
              className="text-sm font-semibold"
              style={{ color: animal.status === "posted" ? "var(--neon-cyan)" : "var(--text-muted)" }}
            >
              {animal.status === "posted" ? "Saved to Box" : "On the wall"}
            </div>
            {isLoggedIn && (
              <button
                onClick={handleDelete}
                disabled={deleteState === "deleting"}
                className="text-xs hover:opacity-80 transition-opacity"
                style={{ color: deleteState === "confirming" ? "var(--hot-pink)" : "var(--text-muted)" }}
              >
                {deleteState === "deleting" ? "Deleting…" : deleteState === "confirming" ? "Confirm delete?" : "Delete"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center gap-6">
      <div className="text-8xl">🐾</div>
      <h2
        className="text-4xl tracking-wide"
        style={{ fontFamily: "var(--font-bangers)", color: "var(--text-muted)" }}
      >
        The wall is empty
      </h2>
      <p style={{ color: "var(--text-muted)" }}>
        Be the first to unleash your party animal.
      </p>
      <Link href="/draw" className="btn-primary">
        Draw Your Animal 🎨
      </Link>
    </div>
  );
}
