/**
 * Auth0 Post-Login Action — copy the GitHub social identity token onto the ID token.
 *
 * Needed because Token Vault cannot store GitHub OAuth App tokens (no refresh token),
 * and the Next.js app can only read identities[].access_token via Management API if
 * the app is granted `read:user_idp_tokens`.
 *
 * Dashboard (tenant: focusotter-apps):
 *   Actions → Triggers → post-login → Custom → Create Action
 *   Paste this file, Deploy, then add it to the post-login flow.
 *
 * After this is live, sign out and sign in with GitHub once.
 */
exports.onExecutePostLogin = async (event, api) => {
  const github = (event.user.identities || []).find(
    (identity) => identity.provider === 'github' || identity.connection === 'github',
  )

  if (github && github.access_token) {
    api.idToken.setCustomClaim(
      'https://party-animals/github_access_token',
      github.access_token,
    )
  }
}
