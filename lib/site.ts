/**
 * Public URL of the deployed app.
 *
 * This is deliberately the production URL by default — the booth QR code has
 * to point somewhere phones can actually reach, even when the app is running
 * on localhost during a demo.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://party-night-peach.vercel.app'
