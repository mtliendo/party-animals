import { toString as toQrSvg } from "qrcode";
import { getDrawEntryUrl } from "@/lib/draw-entry";
import { getSessionFlags } from "@/lib/admin";
import { getAllAnimals } from "@/lib/db";
import WallClient from "./WallClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WallPage() {
  const drawEntryUrl = await getDrawEntryUrl();
  const [animals, { isAdmin }, qrSvg] = await Promise.all([
    getAllAnimals(),
    getSessionFlags(),
    toQrSvg(drawEntryUrl, {
      type: "svg",
      errorCorrectionLevel: "H",
      margin: 4,
      width: 1024,
      color: {
        dark: "#111111",
        light: "#ffffff",
      },
    }),
  ]);
  return <WallClient animals={animals} isAdmin={isAdmin} qrSvg={qrSvg} />;
}
