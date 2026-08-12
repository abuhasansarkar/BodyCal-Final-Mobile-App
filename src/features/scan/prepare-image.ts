import * as ImageManipulator from "expo-image-manipulator";
import { SaveFormat } from "expo-image-manipulator";

export async function prepareMealImage(input: { uri: string; width?: number; height?: number }) {
  const context = ImageManipulator.ImageManipulator.manipulate(input.uri);
  if (input.width && input.height && Math.max(input.width, input.height) > 1_600) {
    if (input.width >= input.height) context.resize({ width: 1_600, height: null });
    else context.resize({ width: null, height: 1_600 });
  }
  const rendered = await context.renderAsync();
  return rendered.saveAsync({ compress: 0.75, format: SaveFormat.JPEG });
}
