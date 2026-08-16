import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenTitle } from "@/components/ui/section-card";
import { InlineNotice } from "@/components/ui/states";
import { prepareMealImage } from "@/features/scan/prepare-image";
import { Image } from "@/tw/image";

export function ScanPreviewScreen({
  uri,
  width,
  height,
}: {
  uri?: string;
  width?: string;
  height?: string;
}) {
  const { t } = useTranslation();
  const [error, setError] = React.useState<string | null>(null);
  const [preparing, setPreparing] = React.useState(false);

  const analyze = async () => {
    if (!uri) return;
    setPreparing(true);
    setError(null);
    try {
      const image = await prepareMealImage({
        uri,
        width: Number(width) || undefined,
        height: Number(height) || undefined,
      });
      router.replace({ pathname: "/(app)/scan/analyzing", params: { uri: image.uri } });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "";
      setError(message === "image_too_large" ? t("scan.errorTooLarge") : t("scan.errorGeneric"));
    } finally {
      setPreparing(false);
    }
  };

  if (!uri) return null;

  return (
    <AppScreen>
      <ScreenTitle title={t("scan.preparingTitle")} />
      <Image
        accessibilityLabel={t("scan.preparingTitle")}
        className="h-96 w-full rounded-3xl bg-app-surface"
        contentFit="cover"
        source={{ uri }}
      />
      {error ? <InlineNotice message={error} tone="error" /> : null}
      <PrimaryButton
        disabled={preparing}
        icon="analysis"
        label={preparing ? t("scan.preparing") : t("scan.analyzeAction")}
        onPress={() => void analyze()}
      />
      <PrimaryButton icon="refresh" label={t("scan.retake")} onPress={() => router.back()} />
    </AppScreen>
  );
}
