"use client";
import { useEvent } from "./EventProvider";
import Link from "next/link";
import { HEART } from "@/lib/event-heart";

export function SiteBrand() {
  const { host, shortName, siteName } = useEvent();
  return (
    <Link href="/" className="site-brand" aria-label={siteName}>
      <span className="site-brand-auth0">{host}</span>
      <span className="brand-heart" aria-hidden="true">
        {HEART}
      </span>
      <span className="site-brand-rest">{shortName}</span>
    </Link>
  );
}
