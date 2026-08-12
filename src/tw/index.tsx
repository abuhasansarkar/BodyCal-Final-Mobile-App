import { Link as RouterLink } from "expo-router";
import { useCssElement, useNativeVariable } from "react-native-css";
import {
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  Text as RNText,
  TextInput as RNTextInput,
  View as RNView,
} from "react-native";

export { Image } from "./image";

const cssElement = useCssElement as unknown as (
  component: React.ComponentType<Record<string, unknown>>,
  props: Record<string, unknown>,
  mapping: Record<string, string>,
) => React.ReactElement;

export const useCSSVariable = process.env.EXPO_OS === "web"
  ? (variable: string) => `var(${variable})`
  : useNativeVariable;

export const View = (props: React.ComponentProps<typeof RNView> & { className?: string }) =>
  useCssElement(RNView, props, { className: "style" });

export const Text = (props: React.ComponentProps<typeof RNText> & { className?: string }) =>
  useCssElement(RNText, props, { className: "style" });

export const Pressable = (props: React.ComponentProps<typeof RNPressable> & { className?: string }) =>
  cssElement(RNPressable as never, props as never, { className: "style" });

export const TextInput = (props: React.ComponentProps<typeof RNTextInput> & { className?: string }) =>
  useCssElement(RNTextInput, props, { className: "style" });

export const ScrollView = (
  props: React.ComponentProps<typeof RNScrollView> & {
    className?: string;
    contentContainerClassName?: string;
    ref?: React.Ref<RNScrollView>;
  },
) => cssElement(RNScrollView as never, props as never, {
  className: "style",
  contentContainerClassName: "contentContainerStyle",
});

export const Link = (props: React.ComponentProps<typeof RouterLink> & { className?: string }) =>
  cssElement(RouterLink as never, props as never, { className: "style" });
