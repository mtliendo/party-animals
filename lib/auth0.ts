import {
  Auth0Client,
  filterDefaultIdTokenClaims,
} from "@auth0/nextjs-auth0/server";
import type { User } from "@auth0/nextjs-auth0/types";
import { sessionKeepsGitHubClaims } from "@/lib/github-claims";

export const auth0 = new Auth0Client({
  enableConnectAccountEndpoint: true,
  authorizationParameters: {
    scope: "openid profile email offline_access",
  },
  async beforeSessionSaved(session) {
    const original = session.user as Record<string, unknown>;
    return {
      ...session,
      user: sessionKeepsGitHubClaims(
        filterDefaultIdTokenClaims(original),
        original,
      ) as User,
    };
  },
});
