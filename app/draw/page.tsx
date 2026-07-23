import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import DrawClient from "./DrawClient";

export default async function DrawPage() {
  const session = await auth0.getSession();
  if (!session) {
    redirect("/auth/login?returnTo=/draw");
  }

  async function checkBoxConnected() {
    try {
      await auth0.getAccessTokenForConnection({ connection: "box" });
      return true;
    } catch {
      return false;
    }
  }

  const displayName =
    (session.user.name as string | undefined) ??
    (session.user.nickname as string | undefined) ??
    (session.user.email as string | undefined) ??
    "Party Animal";

  return <DrawClient displayName={displayName} boxConnected={await checkBoxConnected()} />;
}
