import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getAnimalById, updateAnimal } from "@/lib/db";
import { saveAnimalToBox } from "@/lib/box-post";

export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const animal = await getAnimalById(id);

    if (!animal) {
      return NextResponse.json({ error: "Animal not found" }, { status: 404 });
    }
    if (!animal.image_url) {
      return NextResponse.json(
        { error: "Drawing not ready yet" },
        { status: 422 }
      );
    }

    // Token Vault hands us a short-lived Box token for the logged-in user
    let boxToken: string;
    try {
      const { token } = await auth0.getAccessTokenForConnection({
        connection: "box",
      });
      boxToken = token;
    } catch {
      return NextResponse.json(
        { error: "Connect your Box account in Settings first." },
        { status: 422 }
      );
    }

    const { folderUrl } = await saveAnimalToBox({
      token: boxToken,
      animalId: animal.id,
      imageUrl: animal.image_url,
      videoUrl: animal.video_url ?? undefined,
    });

    await updateAnimal(id, { status: "posted", box_url: folderUrl });

    return NextResponse.json({ boxUrl: folderUrl });
  } catch (err) {
    console.error("[POST /api/animals/[id]/save-to-box]", err);
    return NextResponse.json({ error: "Failed to save to Box" }, { status: 500 });
  }
}
