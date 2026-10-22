import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { tagRepository } from "@/lib/db/tag-repository";

export async function GET() {
  try {
    const tags = await tagRepository.listTags();
    return NextResponse.json({ tags });
  } catch (error) {
    console.error("[Tags API GET Error]:", error);
    return NextResponse.json({ error: "Failed to load tags" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin" && session.user.role !== "organizer") {
    return NextResponse.json({ error: "Forbidden: Admin or Organizer privileges required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, category = "general" } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
    }

    const tag = await tagRepository.createTag({
      name: name.trim(),
      category: category.trim(),
    });

    return NextResponse.json({ success: true, tag }, { status: 201 });
  } catch (error) {
    console.error("[Tags API POST Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create tag" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin" && session.user.role !== "organizer") {
    return NextResponse.json({ error: "Forbidden: Admin or Organizer privileges required" }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Tag ID is required" }, { status: 400 });
    }

    await tagRepository.deleteTag(id);
    return NextResponse.json({ success: true, message: "Tag deleted successfully" });
  } catch (error) {
    console.error("[Tags API DELETE Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete tag" },
      { status: 500 }
    );
  }
}
