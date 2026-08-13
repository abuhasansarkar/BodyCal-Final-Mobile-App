import * as ImageManipulator from "expo-image-manipulator";
import { SaveFormat } from "expo-image-manipulator";

/**
 * Prepares a meal photo for upload: long edge at most 1,600px, JPEG quality
 * around 0.75, and no more than 4 MB.
 *
 * Compression steps down until the result fits rather than handing the user a dead
 * end. Dimensions are read from the rendered image, so a gallery pick that arrives
 * without width and height is still resized.
 */

const MAX_LONG_EDGE = 1_600;
const MAX_BYTES = 4_000_000;
const QUALITY_STEPS = [0.75, 0.6, 0.45, 0.3] as const;

export type PreparedImage = {
  uri: string;
  width: number;
  height: number;
  byteSize: number;
};

async function byteSize(uri: string) {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob.size;
}

export async function prepareMealImage(input: {
  uri: string;
  width?: number;
  height?: number;
}): Promise<PreparedImage> {
  const context = ImageManipulator.ImageManipulator.manipulate(input.uri);
  const probe = await context.renderAsync();

  // Prefer the rendered dimensions; the caller's hints are only a fast path.
  const sourceWidth = probe.width || input.width || 0;
  const sourceHeight = probe.height || input.height || 0;
  const longEdge = Math.max(sourceWidth, sourceHeight);

  let working = ImageManipulator.ImageManipulator.manipulate(input.uri);
  if (longEdge > MAX_LONG_EDGE) {
    if (sourceWidth >= sourceHeight) working.resize({ width: MAX_LONG_EDGE, height: null });
    else working.resize({ width: null, height: MAX_LONG_EDGE });
  }

  let rendered = await working.renderAsync();
  let saved = await rendered.saveAsync({ compress: QUALITY_STEPS[0], format: SaveFormat.JPEG });
  let size = await byteSize(saved.uri);

  for (let step = 1; step < QUALITY_STEPS.length && size > MAX_BYTES; step += 1) {
    saved = await rendered.saveAsync({ compress: QUALITY_STEPS[step], format: SaveFormat.JPEG });
    size = await byteSize(saved.uri);
  }

  // Still too large: halve the long edge once and retry at the lowest quality.
  if (size > MAX_BYTES) {
    working = ImageManipulator.ImageManipulator.manipulate(input.uri);
    const target = Math.max(640, Math.floor(MAX_LONG_EDGE / 2));
    if (sourceWidth >= sourceHeight) working.resize({ width: target, height: null });
    else working.resize({ width: null, height: target });
    rendered = await working.renderAsync();
    saved = await rendered.saveAsync({
      compress: QUALITY_STEPS[QUALITY_STEPS.length - 1],
      format: SaveFormat.JPEG,
    });
    size = await byteSize(saved.uri);
  }

  if (size > MAX_BYTES) throw new Error("image_too_large");

  return { uri: saved.uri, width: saved.width, height: saved.height, byteSize: size };
}
