import { Image as ExpoImage } from "expo-image";
import { useCssElement } from "react-native-css";

export const Image = (props: React.ComponentProps<typeof ExpoImage> & { className?: string }) =>
  useCssElement(ExpoImage, props, { className: "style" });
