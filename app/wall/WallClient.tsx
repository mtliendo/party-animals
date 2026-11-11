"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { DrawYoursCard } from "@/components/DrawYoursCard";
import { WallQrCard } from "@/components/WallQrCard";
import { SiteBrand } from "@/components/SiteBrand";
import type { Animal } from "@/lib/db";

const VIDEO_FALLBACK_AFTER_MS = 3 * 60 * 1000;
const WALL_POLL_MS = 4000;

function isVideoStale(animal: Animal) {
  if (animal.video_url) return false;
  const created = new Date(animal.created_at).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created > VIDEO_FALLBACK_AFTER_MS;
}

function sameAnimal(a: Animal, b: Animal) {
  return (
    a.id === b.id &&
    a.video_url === b.video_url &&
    a.image_url === b.image_url &&
    a.status === b.status &&
    a.issue_url === b.issue_url
  );
}

function mergeWallAnimals(prev: Animal[], next: Animal[]): Animal[] {
  const prevById = new Map(prev.map((animal) => [animal.id, animal]));
  return next.map((animal) => {
    const existing = prevById.get(animal.id);
    if (existing && sameAnimal(existing, animal)) return existing;
    return animal;
  });
}

async function fetchWallAnimals(): Promise<Animal[] | null> {
  const res = await fetch("/api/animals", {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data: unknown = await res.json();
  if (!Array.isArray(data)) return null;
  return data as Animal[];
}

export default function WallClient({
  animals: initialAnimals,
  isAdmin,
  qrSvg,
}: {
  animals: Animal[];
  isAdmin: boolean;
  qrSvg: string;
}) {
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

  const kickedRef = useRef(new Set<string>());
  const animalsRef = useRef(animals);
  animalsRef.current = animals;

  useEffect(() => {
    function kickPending(list: Animal[]) {
      for (const animal of list) {
        if (animal.video_url || kickedRef.current.has(animal.id)) continue;
        kickedRef.current.add(animal.id);
        fetch(`/api/animals/${animal.id}/generate`, {
          method: "POST",
          keepalive: true,
        }).catch(() => {
          kickedRef.current.delete(animal.id);
        });
      }
    }

    async function refreshWall() {
      try {
        const fresh = await fetchWallAnimals();
        if (!fresh) return;
        setAnimals((current) => mergeWallAnimals(current, fresh));
        setSelected((current) => {
          if (!current) return current;
          return fresh.find((animal) => animal.id === current.id) ?? current;
        });
        kickPending(fresh);
      } catch {
        // silently ignore transient fetch errors
      }
    }

    kickPending(animalsRef.current);
    void refreshWall();
    const interval = window.setInterval(refreshWall, WALL_POLL_MS);

    function onVisible() {
      if (document.visibilityState === "visible") void refreshWall();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-dark)" }}>
      {/* Nav */}
      <nav className="app-nav">
        <SiteBrand />
        <div className="app-nav-links">
          <span
            className="text-sm font-semibold tracking-widest uppercase"
            style={{ color: "var(--neon-cyan)" }}
          >
            The Wall
          </span>
          {isAdmin && (
            <>
              <Link
                href="/settings"
                className="text-sm hover:text-white transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                Settings
              </Link>
              <Link
                href="/auth/logout"
                className="text-sm hover:text-white transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                Logout
              </Link>
            </>
          )}
          <Link href="/draw" className="btn-primary text-sm py-2 px-5">
            Draw Yours
          </Link>
        </div>
      </nav>

      <main className="flex-1 px-6 py-12 max-w-7xl mx-auto w-full">
        <div className="wall-hero">
          <div className="wall-hero-copy">
            <h1
              className="text-6xl sm:text-7xl mb-4 tracking-wide"
              style={{ fontFamily: "var(--font-bangers)" }}
            >
              <span className="gradient-text glow-pink">THE WALL</span>
            </h1>
            <p className="text-lg mb-5" style={{ color: "var(--text-muted)" }}>
              Every animal, immortalized forever.
            </p>
            <Link href="/draw" className="btn-primary inline-block text-sm px-6 py-2.5">
              Draw Your Animal
            </Link>
          </div>
          <WallQrCard qrSvg={qrSvg} />
        </div>
        <Separator className="mb-8 opacity-20" />

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

        {/* Grid — invite tile first, not counted in the badge */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <DrawYoursCard />
          {animals.map((animal) => (
            <AnimalCard key={animal.id} animal={animal} onClick={() => setSelected(animal)} />
          ))}
        </div>
      </main>

      <footer
        className="text-center py-8 text-xs border-t"
        style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
      >
        Powered by{" "}
        <span style={{ color: "var(--hot-pink)" }}>Auth0 Token Vault</span> ·{" "}
        <span style={{ color: "var(--neon-cyan)" }}>Grok AI</span>
      </footer>

      {selected && (
        <AnimalModal
          animal={selected}
          onClose={closeModal}
          onAnimalUpdated={updateAnimal}
          onAnimalDeleted={removeAnimal}
          isAdmin={isAdmin}
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
            alt={`${animal.github_handle}'s party animal`}
            className="w-full h-full object-contain p-4"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="w-full h-full" />
          </div>
        )}
        {!animal.video_url && animal.image_url && !isVideoStale(animal) && (
          <div className="animal-generating" aria-live="polite">
            Generating
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
              Posted to GitHub
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
          ) : isVideoStale(animal) ? (
            <Badge
              className="text-xs"
              style={{
                background: "rgba(255,45,120,0.15)",
                border: "1px solid rgba(255,45,120,0.4)",
                color: "var(--hot-pink)",
              }}
            >
              Drawing
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
      <div className="p-4 flex items-center justify-between">
        <a
          href={`https://github.com/${animal.github_handle.replace("@", "")}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-sm font-semibold hover:opacity-80 transition-opacity"
          style={{ color: "var(--hot-pink)" }}
        >
          {animal.github_handle.startsWith("@") ? animal.github_handle : `@${animal.github_handle}`}
        </a>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {new Date(animal.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}

function AnimalModal({
  animal,
  onClose,
  onAnimalUpdated,
  onAnimalDeleted,
  isAdmin,
}: {
  animal: Animal;
  onClose: () => void;
  onAnimalUpdated: (animal: Animal) => void;
  onAnimalDeleted: (id: string) => void;
  isAdmin: boolean;
}) {
  const showDrawingFallback = !animal.video_url && (!!animal.image_url && isVideoStale(animal));
  const handle = animal.github_handle.startsWith("@") ? animal.github_handle : `@${animal.github_handle}`;
  const [postState, setPostState] = useState<
    { type: "idle" } | { type: "posting" } | { type: "success" } | { type: "error"; message: string }
  >({ type: "idle" });
  const [deleteState, setDeleteState] = useState<"idle" | "confirming" | "deleting">("idle");

  async function handlePostToGitHub() {
    setPostState({ type: "posting" });

    try {
      const res = await fetch(
        new URL(`/api/animals/${animal.id}/post-to-github`, window.location.origin),
        {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
        },
      );

      const text = await res.text();
      let data: { error?: string; issueUrl?: string } = {};
      if (text) {
        try {
          data = JSON.parse(text) as { error?: string; issueUrl?: string };
        } catch {
          // Middleware / HTML error pages are not JSON.
        }
      }
      if (!res.ok) {
        throw new Error(
          (typeof data.error === "string" && data.error) ||
            text.trim().slice(0, 300) ||
            `Request failed (${res.status})`,
        );
      }

      onAnimalUpdated({
        ...animal,
        status: "posted",
        issue_url: data.issueUrl ?? animal.issue_url,
      });
      setPostState({ type: "success" });
    } catch (err) {
      setPostState({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to post to GitHub.",
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl overflow-hidden"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "0 0 60px rgba(255,45,120,0.15), 0 0 120px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <span
              className="text-xl tracking-wide"
              style={{ fontFamily: "var(--font-bangers)", color: "var(--hot-pink)" }}
            >
              {handle}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {new Date(animal.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-xl leading-none hover:opacity-60 transition-opacity"
            style={{ color: "var(--text-muted)" }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Media panels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
          {/* Original drawing */}
          <div
            className="flex flex-col"
            style={{ borderRight: "1px solid var(--border)" }}
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
                  alt={`${handle}'s original drawing`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Skeleton className="w-full h-full" />
              )}
            </div>
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
              ) : showDrawingFallback && animal.image_url ? (
                <div className="relative w-full h-full p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={animal.image_url}
                    alt={`${handle}'s party animal`}
                    className="w-full h-full object-contain"
                  />
                  <span
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs px-2 py-1 rounded"
                    style={{
                      color: "var(--gold)",
                      background: "rgba(0,0,0,0.55)",
                    }}
                  >
                    Showing original drawing
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Skeleton className="w-24 h-24 rounded-full" />
                  <span className="text-xs" style={{ color: "var(--gold)" }}>
                    Generating animation…
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-between border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex flex-col gap-2">
            {isAdmin && (
              <button
                onClick={handlePostToGitHub}
                disabled={
                  (!animal.video_url && !animal.image_url) ||
                  postState.type === "posting"
                }
                className="btn-primary text-sm px-5 py-2 border-0"
                style={{
                  background:
                    postState.type === "posting"
                      ? "rgba(255,45,120,0.4)"
                      : "linear-gradient(135deg, var(--hot-pink), var(--electric-purple))",
                }}
              >
                {postState.type === "posting"
                  ? "Posting..."
                  : animal.status === "posted"
                    ? "Post to GitHub Again"
                    : "Post to GitHub"}
              </button>
            )}
            {postState.type === "error" && (
              <span className="text-xs" style={{ color: "var(--hot-pink)" }}>
                {postState.message}
              </span>
            )}
            {postState.type === "success" && (
              <span className="text-xs" style={{ color: "var(--neon-cyan)" }}>
                Posted to GitHub!
              </span>
            )}
            {animal.issue_url && (
              <a
                href={animal.issue_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold hover:opacity-80 transition-opacity"
                style={{ color: "var(--neon-cyan)" }}
              >
                View issue on GitHub →
              </a>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div
              className="text-sm font-semibold"
              style={{ color: animal.status === "posted" ? "var(--neon-cyan)" : "var(--text-muted)" }}
            >
              {animal.status === "posted"
                ? "Posted to GitHub"
                : animal.video_url
                  ? "Ready to share"
                  : showDrawingFallback
                    ? "Drawing on the wall"
                    : "Animating…"}
            </div>
            {isAdmin && (
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
        Be the first to unleash your animal.
      </p>
      <Link href="/draw" className="btn-primary">
        Draw Your Animal 🎨
      </Link>
    </div>
  );
}
