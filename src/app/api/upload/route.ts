import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getServerSession } from "@/lib/auth/session";

/**
 * Neon S3 Object Storage Upload Handler
 * 
 * Uploads media files (banners, thumbnails, logos) directly to do4win S3 bucket.
 */

const s3Client = new S3Client({
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  region: process.env.AWS_REGION || "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true,
});

// Rate limiting map: userId -> { count, resetAt }
interface UploadRateLimit {
  count: number;
  resetAt: number;
}
const uploadLimits = new Map<string, UploadRateLimit>();
const MAX_UPLOADS_PER_WINDOW = 20; // Max 20 uploads per 60 seconds per user
const WINDOW_MS = 60 * 1000;

function checkUploadRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = uploadLimits.get(userId);

  if (!entry || now > entry.resetAt) {
    uploadLimits.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_UPLOADS_PER_WINDOW) {
    return false;
  }

  entry.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting to prevent denial-of-wallet / storage exhaustion
  if (!checkUploadRateLimit(session.user.id)) {
    return NextResponse.json(
      { error: "Upload rate limit exceeded. Please wait a minute before uploading more files." },
      { status: 429 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawFolder = (formData.get("folder") as string) || "hackathons";

    // Strict folder allowlist to prevent path traversal / prefix injection
    const ALLOWED_ROOTS = new Set([
      "hackathons",
      "projects",
      "submissions",
      "profiles",
      "banners",
      "avatars",
      "covers",
      "payments",
      "receipts",
      "qr_codes",
    ]);

    const normalizedFolder = rawFolder.replace(/^\/+|\/+$/g, "");
    const parts = normalizedFolder.split("/");
    const isSafe =
      parts.every((p) => /^[a-zA-Z0-9_-]+$/.test(p)) &&
      parts.length <= 2 &&
      ALLOWED_ROOTS.has(parts[0]);

    if (!isSafe) {
      return NextResponse.json(
        {
          error:
            "Invalid target folder. Must be one of: hackathons, projects, submissions, profiles, banners, avatars, covers, payments, receipts, qr_codes",
        },
        { status: 400 }
      );
    }
    const folder = normalizedFolder;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Determine extension strictly from approved MIME-type map (reject image/svg+xml and other unsafe types)
    const MIME_MAP: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };

    const extension = MIME_MAP[file.type.toLowerCase()];
    if (!extension) {
      return NextResponse.json({ error: "Only JPEG, PNG, WEBP, and GIF images are allowed" }, { status: 400 });
    }

    // Enforce 10MB size limit
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit. Please upload a smaller image." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Deep inspection: prevent disguised SVGs / HTML payloads masquerading under safe raster MIME types
    const textPrefix = buffer.subarray(0, Math.min(buffer.length, 1024)).toString("utf-8").toLowerCase();
    if (textPrefix.includes("<svg") || textPrefix.includes("<script") || textPrefix.includes("<?xml")) {
      return NextResponse.json({ error: "Only JPEG, PNG, WEBP, and GIF images are allowed" }, { status: 400 });
    }

    const bucket = process.env.S3_BUCKET || "do4win";
    const sanitizedName = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30);
    const key = `${folder}/${Date.now()}-${sanitizedName}.${extension}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const publicUrl = `${process.env.AWS_ENDPOINT_URL_S3}/${bucket}/${key}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      key,
      name: file.name,
      size: file.size,
    });
  } catch (error) {
    // Log details server-side only; never expose raw AWS SDK error objects or bucket details to clients
    console.error("[S3 Upload Error]:", error);
    return NextResponse.json(
      { error: "Failed to upload file to storage. Please try again." },
      { status: 500 }
    );
  }
}
