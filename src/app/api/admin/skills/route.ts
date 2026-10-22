import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { skillRepository } from "@/lib/db/skill-repository";

export async function GET() {
  try {
    const skills = await skillRepository.listSkills();
    return NextResponse.json({ skills });
  } catch (error) {
    console.error("[Skills API GET Error]:", error);
    return NextResponse.json({ error: "Failed to load skills" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, category = "general" } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Skill name is required" }, { status: 400 });
    }

    const skill = await skillRepository.createSkill({
      name: name.trim(),
      category: category.trim(),
    });

    return NextResponse.json({ success: true, skill }, { status: 201 });
  } catch (error) {
    console.error("[Skills API POST Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create skill" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Skill ID is required" }, { status: 400 });
    }

    await skillRepository.deleteSkill(id);
    return NextResponse.json({ success: true, message: "Skill deleted successfully" });
  } catch (error) {
    console.error("[Skills API DELETE Error]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete skill" },
      { status: 500 }
    );
  }
}
