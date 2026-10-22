/**
 * Client-Side Smart Image Compression Utility
 * 
 * Compresses images in the browser using HTML5 Canvas before uploading to S3.
 * Preserves high visual fidelity while reducing file sizes by up to 90%.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0 (default 0.85)
  format?: "image/webp" | "image/jpeg";
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  // If not an image or SVG/GIF, return original
  if (
    !file.type.startsWith("image/") ||
    file.type === "image/svg+xml" ||
    file.type === "image/gif"
  ) {
    return file;
  }

  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.82,
    format = "image/webp",
  } = options;

  return new Promise<File>((resolve) => {
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // If image is already smaller than max dimensions and under 400KB, return as-is
        if (width <= maxWidth && height <= maxHeight && file.size < 400 * 1024) {
          resolve(file);
          return;
        }

        // Calculate aspect-ratio preserved dimensions
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        // Image smoothing for highest quality downscaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              // If compression didn't reduce size, keep original
              resolve(file);
              return;
            }

            const extension = format === "image/webp" ? "webp" : "jpg";
            const originalBase = file.name.replace(/\.[^/.]+$/, "");
            const compressedName = `${originalBase}.${extension}`;

            const compressedFile = new File([blob], compressedName, {
              type: format,
              lastModified: Date.now(),
            });

            console.log(
              `[Smart Compression]: "${file.name}" compressed from ${(
                file.size / 1024
              ).toFixed(1)} KB to ${(compressedFile.size / 1024).toFixed(1)} KB (-${(
                (1 - compressedFile.size / file.size) *
                100
              ).toFixed(0)}%)`
            );

            resolve(compressedFile);
          },
          format,
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };

      img.src = objectUrl;
    } catch (err) {
      console.warn("Client compression fallback:", err);
      resolve(file);
    }
  });
}
