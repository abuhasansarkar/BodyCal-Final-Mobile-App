import type { Id } from "../../../convex/_generated/dataModel";

const MAX_UPLOAD_BYTES = 4_000_000;
const UPLOAD_TIMEOUT_MS = 60_000;

function isJpeg(bytes: Uint8Array) {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

/** Reads the prepared JPEG once, validates it, and performs exactly one upload. */
export async function uploadImageToStorage(
  uploadUrl: string,
  localUri: string,
): Promise<{ storageId: Id<"_storage"> }> {
  const fileResponse = await fetch(localUri);
  const arrayBuffer = await fileResponse.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  if (bytes.byteLength === 0 || !isJpeg(bytes)) throw new Error("image_unreadable");
  if (bytes.byteLength > MAX_UPLOAD_BYTES) throw new Error("image_too_large");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  try {
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: bytes,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`upload_failed_status_${response.status}`);

    const result = (await response.json()) as { storageId?: unknown };
    if (typeof result.storageId !== "string" || result.storageId.length === 0) {
      throw new Error("upload_invalid_response");
    }
    return { storageId: result.storageId as Id<"_storage"> };
  } catch (cause) {
    if (cause instanceof Error && cause.name === "AbortError") throw new Error("upload_timeout");
    throw cause;
  } finally {
    clearTimeout(timeout);
  }
}
