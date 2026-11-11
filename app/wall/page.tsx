import { toString as toQrSvg } from "qrcode";
import { DRAW_ENTRY_URL } from "@/lib/draw-entry";
import { getSessionFlags } from "@/lib/admin";
import { getAllAnimals } from "@/lib/db";
import WallClient from "./WallClient";

export const revalidate = 30;

export default async function WallPage() {
  const [animals, { isAdmin }, qrSvg] = await Promise.all([
    getAllAnimals(),
    getSessionFlags(),
    toQrSvg(DRAW_ENTRY_URL, {
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
