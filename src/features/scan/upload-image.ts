import type { Id } from "../../../convex/_generated/dataModel";

/**
 * Uploads a local image file (from camera or gallery) to a Convex storage upload URL.
 * Supports Android & iOS React Native environments by trying ArrayBuffer binary,
 * Blob stream, and XMLHttpRequest fallbacks.
 */
export async function uploadImageToStorage(
  uploadUrl: string,
  localUri: string,
): Promise<{ storageId: Id<"_storage"> }> {
  let lastError: Error | null = null;

  // Strategy 1: ArrayBuffer binary upload (most reliable on Android React Native)
  try {
    const fileRes = await fetch(localUri);
    if (!fileRes.ok) throw new Error(`Cannot read local image file: ${fileRes.status}`);

    const arrayBuffer = await fileRes.arrayBuffer();
    if (arrayBuffer.byteLength > 4_000_000) {
      throw new Error("image_too_large");
    }

    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: new Uint8Array(arrayBuffer),
    });

    if (uploadRes.ok) {
      const data = (await uploadRes.json()) as { storageId: Id<"_storage"> };
      return data;
    }

    const errText = await uploadRes.text().catch(() => "");
    console.warn(`ArrayBuffer upload failed with status ${uploadRes.status}: ${errText}`);
    lastError = new Error(`upload_failed_status_${uploadRes.status}: ${errText}`);
  } catch (err) {
    console.warn("ArrayBuffer upload error, trying Blob strategy:", err);
    if (err instanceof Error && err.message === "image_too_large") throw err;
    lastError = err instanceof Error ? err : new Error(String(err));
  }

  // Strategy 2: Blob fetch upload
  try {
    const fileRes = await fetch(localUri);
    const blob = await fileRes.blob();
    if (blob.size > 4_000_000) throw new Error("image_too_large");

    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: blob,
    });

    if (uploadRes.ok) {
      const data = (await uploadRes.json()) as { storageId: Id<"_storage"> };
      return data;
    }

    const errText = await uploadRes.text().catch(() => "");
    console.warn(`Blob upload failed with status ${uploadRes.status}: ${errText}`);
    lastError = new Error(`upload_failed_status_${uploadRes.status}: ${errText}`);
  } catch (err) {
    console.warn("Blob upload error, trying XHR strategy:", err);
    if (err instanceof Error && err.message === "image_too_large") throw err;
    lastError = err instanceof Error ? err : new Error(String(err));
  }

  // Strategy 3: XMLHttpRequest fallback
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as { storageId: Id<"_storage"> };
          resolve(data);
        } catch {
          reject(new Error("upload_invalid_json_response"));
        }
      } else {
        reject(new Error(`upload_failed_xhr_${xhr.status}: ${xhr.responseText}`));
      }
    };
    xhr.onerror = () => reject(lastError ?? new Error("upload_network_error"));
    xhr.ontimeout = () => reject(new Error("upload_timeout"));
    xhr.open("POST", uploadUrl);
    xhr.setRequestHeader("Content-Type", "image/jpeg");

    fetch(localUri)
      .then((res) => res.blob())
      .then((blob) => xhr.send(blob))
      .catch((e) => reject(lastError ?? e));
  });
}
