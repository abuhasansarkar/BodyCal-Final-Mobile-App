import { useAction, useMutation } from "convex/react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";

import { hasBackendConfiguration } from "@/config/env";
import { api } from "@/lib/convex-api";
import { createClientRequestId } from "@/lib/local-day";
import { i18n } from "@/locales/i18n";
import { FeatureScreen } from "@/screens/feature-screen";

function ConfiguredAnalyzing({ uri }: { uri: string }) {
  const generateUploadUrl = useMutation(api.aiDb.generateUploadUrl);
  const analyzeMeal = useAction(api.ai.analyzeMeal);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const blob = await (await fetch(uri)).blob();
        if (blob.size > 4_000_000) throw new Error("The compressed photo is larger than 4 MB.");
        const uploadUrl = await generateUploadUrl({});
        const upload = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob });
        if (!upload.ok) throw new Error("Photo upload failed.");
        const { storageId } = await upload.json() as { storageId: Id<"_storage"> };
        const estimate = await analyzeMeal({ storageId, locale: i18n.resolvedLanguage ?? "en", requestId: createClientRequestId() });
        if (!cancelled) router.replace({ pathname: "/(app)/scan/result", params: { uri, estimate: JSON.stringify(estimate), scanId: estimate.scanId } });
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Meal analysis failed.");
      }
    })();
    return () => { cancelled = true; };
  }, [analyzeMeal, generateUploadUrl, uri]);

  if (error) return <FeatureScreen title="Could not analyze this meal" description={`${error} You can retry, retake the photo, or enter nutrition manually.`} />;
  return <FeatureScreen title="Analyzing your meal…" description="Identifying foods, estimating portions, and calculating nutrition. Results are estimates and must be reviewed." />;
}

export default function AnalyzingRoute() {
  const { uri } = useLocalSearchParams<{ uri: string }>();
  if (hasBackendConfiguration) return <ConfiguredAnalyzing uri={uri} />;
  return <FeatureScreen title="AI setup required" description="Configure Convex, RevenueCat, and the server-side AI provider before meal analysis can run." />;
}
