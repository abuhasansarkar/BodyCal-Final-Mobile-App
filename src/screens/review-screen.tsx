import { useMutation } from "convex/react";
import { router, type Href } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import { PostPurchaseShell } from "@/components/post-purchase-shell";
import { PrimaryButton } from "@/components/primary-button";
import { hasBackendConfiguration } from "@/config/env";
import { api } from "@/lib/convex-api";
import { Pressable, Text, TextInput, View } from "@/tw";

type ReviewContentProps = {
  saveFeedback?: (rating: number, feedback: string) => Promise<void>;
};

function ReviewContent({ saveFeedback }: ReviewContentProps) {
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [rating, setRating] = React.useState(0);
  const [feedback, setFeedback] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const finish = (requestStoreReview = false) => router.replace((requestStoreReview ? "/(app)/thank-you?review=1" : "/(app)/thank-you") as Href);
  const submit = async () => {
    if (saving || rating === 0) return;
    setSaving(true);
    setError(null);
    try {
      await saveFeedback?.(rating, feedback);
      setModalVisible(false);
      finish(rating >= 4);
    } catch {
      setError(t("postPurchase.review.submitError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PostPurchaseShell
        buttonIcon="star"
        buttonLabel={t("postPurchase.review.button")}
        footerAccessory={<Pressable accessibilityRole="button" className="min-h-11 items-center justify-center" onPress={() => finish()}><Text className="text-[15px] font-medium text-[#737373]">{t("postPurchase.review.skip")}</Text></Pressable>}
        onContinue={() => setModalVisible(true)}
        step={2}
      >
        <View className="gap-3 px-2">
          <Text className="text-[36px] font-bold leading-[43px] tracking-[-1px] text-[#111111]" selectable>{t("postPurchase.review.title")}</Text>
          <Text className="text-[16px] leading-6 text-[#737373]" selectable>{t("postPurchase.review.description")}</Text>
        </View>

        <View className="items-center gap-3 rounded-[24px] bg-[#FAFAFA] px-5 py-6">
          <View className="flex-row gap-2">{[1, 2, 3, 4, 5].map((star) => <AppIcon color="#E5A15E" key={star} name="star" size={29} />)}</View>
          <Text className="text-center text-[18px] font-semibold text-[#111111]">{t("postPurchase.review.honestTitle")}</Text>
          <Text className="text-center text-[14px] leading-5 text-[#737373]">{t("postPurchase.review.honestDescription")}</Text>
        </View>

        {["heart", "feedback"].map((icon, index) => (
          <View className="gap-3 rounded-[22px] border border-[#E8E8E8] bg-white p-5" key={index}>
            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#F7F7F7]"><AppIcon name={icon === "heart" ? "heart" : "feedback"} size={21} /></View>
            <Text className="text-[17px] font-semibold text-[#111111]" selectable>{t(`postPurchase.review.reasons.${index}.title`)}</Text>
            <Text className="text-[15px] leading-6 text-[#737373]" selectable>{t(`postPurchase.review.reasons.${index}.description`)}</Text>
          </View>
        ))}
      </PostPurchaseShell>

      <Modal animationType="slide" onRequestClose={() => setModalVisible(false)} presentationStyle="pageSheet" visible={modalVisible}>
        <SafeAreaView edges={["top", "right", "bottom", "left"]} style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
          <View className="flex-1 gap-6 px-5 py-5">
            <View className="flex-row items-center justify-between"><Text className="text-[26px] font-bold text-[#111111]">{t("postPurchase.review.modalTitle")}</Text><Pressable accessibilityLabel={t("postPurchase.review.close")} accessibilityRole="button" className="h-11 w-11 items-center justify-center rounded-full bg-[#F5F5F5]" onPress={() => setModalVisible(false)}><AppIcon color="#737373" name="close" size={21} /></Pressable></View>
            <Text className="text-[16px] leading-6 text-[#737373]" selectable>{t("postPurchase.review.modalDescription")}</Text>
            <View accessibilityRole="radiogroup" className="flex-row justify-center gap-2">{[1, 2, 3, 4, 5].map((star) => <Pressable accessibilityLabel={t("postPurchase.review.starLabel", { count: star })} accessibilityRole="radio" accessibilityState={{ selected: rating === star }} className="h-12 w-12 items-center justify-center" key={star} onPress={() => setRating(star)}><AppIcon color={star <= rating ? "#E5A15E" : "#D8D8D8"} name="star" size={36} /></Pressable>)}</View>
            {rating > 0 && rating < 4 ? <TextInput accessibilityLabel={t("postPurchase.review.feedbackLabel")} className="min-h-[132px] rounded-[18px] border border-[#D8D8D8] px-4 py-3 text-[16px] text-[#111111]" multiline onChangeText={setFeedback} placeholder={t("postPurchase.review.feedbackPlaceholder")} textAlignVertical="top" value={feedback} /> : null}
            {error ? <Text accessibilityLiveRegion="polite" className="text-center text-[14px] text-[#DC2626]" selectable>{error}</Text> : null}
            <View className="mt-auto gap-2"><PrimaryButton disabled={rating === 0 || saving} icon="heart" label={saving ? t("postPurchase.review.submitting") : t("postPurchase.review.submit")} onPress={() => void submit()} /><Pressable accessibilityRole="button" className="min-h-11 items-center justify-center" disabled={saving} onPress={() => finish()}><Text className="text-[15px] text-[#737373]">{t("postPurchase.review.skip")}</Text></Pressable></View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

function ConfiguredReviewScreen() {
  const { i18n } = useTranslation();
  const submitFeedback = useMutation(api.feedback.submit);
  return <ReviewContent saveFeedback={async (rating, feedback) => { await submitFeedback({ rating, feedback: feedback.trim() || undefined, locale: i18n.resolvedLanguage ?? "en" }); }} />;
}

export function ReviewScreen() {
  return hasBackendConfiguration ? <ConfiguredReviewScreen /> : <ReviewContent />;
}
