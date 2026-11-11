import Link from "next/link";
import { HEART, SITE_NAME } from "@/lib/brand";

export function SiteBrand() {
  return (
    <Link href="/" className="site-brand" aria-label={SITE_NAME}>
      <span className="site-brand-auth0">Auth0</span>
      <span className="brand-heart" aria-hidden="true">
        {HEART}
      </span>
      <span className="site-brand-rest">AIE</span>
    </Link>
  );
}
