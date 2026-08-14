import type { ReactNode } from "react";
import type { ViewStyle } from "react-native";

import { View } from "@/tw";

/**
 * Determinate circular progress indicator with an optional centred child.
 *
 * Drawn with borders rather than SVG: `react-native-svg` is not a dependency
 * here, and adding it would force a native rebuild for one visual.
 *
 * A rounded-full box with one adjacent pair of borders coloured renders a 180°
 * arc, so a full sweep needs two halves, each clipped by an `overflow-hidden`
 * wrapper and rotated into view:
 *
 * - 0-50%   clip the right half, sweep a left-half arc through it, so fill
 *           grows clockwise from 12 o'clock.
 * - 50-100% clip the left half and sweep a right-half arc, continuing from
 *           6 o'clock.
 *
 * The 45° base offset in both rotations exists because an adjacent border pair
 * centres its arc on a corner; this squares that arc to the vertical axis.
 *
 * Presentational only. The caller owns `accessibilityRole`/`accessibilityValue`
 * because only it knows what the progress describes.
 */
export function ProgressRing({
  children,
  color,
  size,
  thickness,
  trackColor = "#E8E8E8",
  value,
}: {
  children?: ReactNode;
  color: string;
  size: number;
  thickness: number;
  trackColor?: string;
  /** Percentage 0-100. Values outside the range, and NaN, are clamped. */
  value: number;
}) {
  const percent = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  const firstSweep = Math.min(percent, 50) * 3.6;
  const secondSweep = Math.max(0, percent - 50) * 3.6;

  const ring: ViewStyle = {
    borderRadius: size / 2,
    borderWidth: thickness,
    height: size,
    position: "absolute",
    top: 0,
    width: size,
  };

  const half: ViewStyle = {
    height: size,
    overflow: "hidden",
    position: "absolute",
    top: 0,
    width: size / 2,
  };

  return (
    <View style={{ height: size, width: size }}>
      <View style={{ ...ring, borderColor: trackColor }} />

      {firstSweep > 0 ? (
        <View style={{ ...half, left: size / 2 }}>
          <View
            style={{
              ...ring,
              borderBottomColor: color,
              borderLeftColor: color,
              borderRightColor: "transparent",
              borderTopColor: "transparent",
              left: -size / 2,
              transform: [{ rotate: `${45 + firstSweep}deg` }],
            }}
          />
        </View>
      ) : null}

      {secondSweep > 0 ? (
        <View style={{ ...half, left: 0 }}>
          <View
            style={{
              ...ring,
              borderBottomColor: "transparent",
              borderLeftColor: "transparent",
              borderRightColor: color,
              borderTopColor: color,
              left: 0,
              transform: [{ rotate: `${45 + secondSweep}deg` }],
            }}
          />
        </View>
      ) : null}

      <View style={{ alignItems: "center", height: size, justifyContent: "center", width: size }}>
        {children}
      </View>
    </View>
  );
}
