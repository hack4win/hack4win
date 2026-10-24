"use client";

import React, { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  UploadCloud,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  CheckCircle2,
  X,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { compressImage } from "@/lib/utils/image-compression";
import { isValidHttpUrl } from "@/lib/url-validation";

interface PresetItem {
  name: string;
  url: string;
}

interface ImageUploaderProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  presets?: PresetItem[];
  folder?: string;
  aspectRatio?: "banner" | "square";
}

export function ImageUploader({
  label,
  value,
  onChange,
  presets = [],
  folder = "hackathons",
  aspectRatio = "banner",
}: ImageUploaderProps) {
  const [mode, setMode] = useState<"upload" | "presets" | "url">("upload");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadError("Only image files (PNG, JPG, WEBP, GIF) are allowed.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Smart compression: resize & optimize WebP before upload
      const optimizedFile = await compressImage(file, {
        maxWidth: aspectRatio === "square" ? 600 : 1920,
        maxHeight: aspectRatio === "square" ? 600 : 1080,
        quality: 0.84,
      });

      const formData = new FormData();
      formData.append("file", optimizedFile);
      formData.append("folder", folder);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload image");
      }

      onChange(data.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload error");
    } finally {
      setIsUploading(false);
    }
  };

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground">{label}</label>

        {/* Mode Selector Tabs */}
        <div className="inline-flex items-center rounded-full border bg-muted/40 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`px-3 py-1 rounded-full font-medium transition-all cursor-pointer ${
              mode === "upload"
                ? "bg-card text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Upload
          </button>
          {presets.length > 0 && (
            <button
              type="button"
              onClick={() => setMode("presets")}
              className={`px-3 py-1 rounded-full font-medium transition-all cursor-pointer ${
                mode === "presets"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Presets
            </button>
          )}
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`px-3 py-1 rounded-full font-medium transition-all cursor-pointer ${
              mode === "url"
                ? "bg-card text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            URL
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="text-xs text-destructive p-2.5 rounded-xl bg-destructive/10 border border-destructive/20">
          {uploadError}
        </div>
      )}

      {/* Mode 1: File Upload */}
      {mode === "upload" && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
            isDragging
              ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20 scale-[1.01]"
              : value
              ? "border-primary/40 bg-muted/20 hover:border-primary"
              : "border-muted-foreground/25 hover:border-primary hover:bg-muted/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />

          {isUploading ? (
            <div className="py-4 space-y-2">
              <Loader2 className="size-8 animate-spin text-primary mx-auto" />
              <div className="text-xs font-semibold">Uploading to Neon S3 bucket...</div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <UploadCloud className="size-5" />
              </div>
              <div className="text-xs font-semibold">
                Click to upload or drag & drop image
              </div>
              <div className="text-[0.7rem] text-muted-foreground">
                PNG, JPG, WEBP, GIF or SVG &middot; Uploaded directly to S3
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Presets Gallery */}
      {mode === "presets" && presets.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {presets.map((preset) => (
            <button
              type="button"
              key={preset.name}
              onClick={() => onChange(preset.url)}
              className={`relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                aspectRatio === "banner" ? "aspect-video" : "aspect-square"
              } ${
                value === preset.url
                  ? "border-primary ring-2 ring-primary/20 scale-[1.02]"
                  : "border-transparent opacity-75 hover:opacity-100"
              }`}
            >
              <img src={preset.url} alt={preset.name} className="size-full object-cover" />
              <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[0.65rem] px-1.5 py-0.5 rounded-sm">
                {preset.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Mode 3: Custom URL */}
      {mode === "url" && (
        <div className="space-y-1.5">
          <Input
            type="url"
            placeholder="https://images.unsplash.com/..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="rounded-full text-xs"
            aria-invalid={!!value && !isValidHttpUrl(value)}
          />
          {!!value && !isValidHttpUrl(value) && (
            <p className="text-[11px] text-destructive flex items-center gap-1 font-medium pl-2">
              <AlertCircle className="size-3 shrink-0" />
              Please enter a valid HTTP or HTTPS image URL.
            </p>
          )}
        </div>
      )}

      {/* Image Preview Box */}
      {value && (
        <div className="relative rounded-xl overflow-hidden border bg-muted/30">
          <div
            className={`w-full overflow-hidden relative ${
              aspectRatio === "banner" ? "h-32 sm:h-40" : "size-24 mx-auto my-2"
            }`}
          >
            <img src={value} alt="Selected preview" className="size-full object-cover" />
          </div>

          <div className="p-2 border-t flex items-center justify-between text-xs bg-card/80 backdrop-blur-xs">
            <span className="text-muted-foreground truncate max-w-xs text-[0.7rem] font-mono">
              {value}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onChange("")}
              className="size-6 text-muted-foreground hover:text-destructive rounded-full"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
