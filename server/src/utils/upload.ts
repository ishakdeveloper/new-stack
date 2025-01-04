import { join } from "path";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export async function upload(
  base64File: string,
  fileName: string
): Promise<string> {
  try {
    // Extract MIME type and base64 data
    const [header, base64Data] = base64File.split(",");
    const mimeType = header.match(/data:(.*?);/)?.[1];

    // Validate MIME type
    if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error("Invalid file type");
    }

    // Validate file size
    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error("File too large");
    }

    // Add file extension based on MIME type
    const extension = mimeType.split("/")[1];
    const fullFileName = `${fileName}.${extension}`;

    // Define upload path
    const uploadDir = join(process.cwd(), "uploads");

    // Ensure uploads directory exists
    await Bun.write(join(uploadDir, ".keep"), "");

    // Save file using Bun
    await Bun.write(join(uploadDir, fullFileName), buffer);

    // Return public URL
    return `/uploads/${fullFileName}`;
  } catch (error) {
    console.error("Upload error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to upload file"
    );
  }
}
