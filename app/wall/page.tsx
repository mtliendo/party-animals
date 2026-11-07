import { getSessionFlags } from "@/lib/admin";
import { getAllAnimals } from "@/lib/db";
import WallClient from "./WallClient";

export const revalidate = 30;

export default async function WallPage() {
  const [animals, { isAdmin }] = await Promise.all([
    getAllAnimals(),
    getSessionFlags(),
  ]);
  return <WallClient animals={animals} isAdmin={isAdmin} />;
}
