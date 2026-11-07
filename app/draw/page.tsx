import { getSessionFlags } from "@/lib/admin";
import DrawClient from "./DrawClient";

export default async function DrawPage() {
  const { isAdmin } = await getSessionFlags();
  return <DrawClient isAdmin={isAdmin} />;
}
