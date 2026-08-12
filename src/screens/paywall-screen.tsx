import { Image } from "expo-image";
import { router, type Href } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import type { PurchasesPackage } from "react-native-purchases";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { PrimaryButton } from "@/components/primary-button";
import { useSubscription } from "@/features/subscription/subscription-provider";
import { Link, Pressable, ScrollView, Text, View } from "@/tw";

const logo = require("@/../assets/images/BodyCal-Black-Logo.png");
const meal = require("@/../assets/images/welcome-meal-hero.png");
type Plan = "annual" | "monthly";
type Step = 1 | 2 | 3;

function freeTrialDays(subscriptionPackage: PurchasesPackage | null) {
  const intro = subscriptionPackage?.product.introPrice;
  if (!intro || intro.price !== 0 || intro.periodUnit !== "DAY") return null;
  return intro.periodNumberOfUnits * intro.cycles;
}

function BrandHeader({ onClose, onRestore, showRestore }: { onClose: () => void; onRestore: () => void; showRestore: boolean }) {
  const { t } = useTranslation();
  return (
    <>
      <View className="h-12 flex-row items-center justify-between">
        <Pressable accessibilityLabel={t("paywallFlow.close")} accessibilityRole="button" className="h-12 w-12 items-center justify-center rounded-full active:bg-app-surface" onPress={onClose}>
          <AppIcon name="close" size={21} />
        </Pressable>
        {showRestore ? (
          <Pressable accessibilityRole="button" className="min-h-12 min-w-16 items-end justify-center" onPress={onRestore}>
            <Text className="text-sm font-medium text-[#111111]">{t("paywall.restore")}</Text>
          </Pressable>
        ) : <View className="h-12 w-16" />}
      </View>
      <View className="items-center pb-2">
        <Image accessibilityLabel="BodyCal" contentFit="contain" source={logo} style={{ height: 76, width: 76 }} />
        <Text className="text-[21px] font-bold tracking-[-0.5px] text-[#111111]">BodyCal</Text>
      </View>
    </>
  );
}

function BenefitRow({ description, icon, title }: { description: string; icon: AppIconName; title: string }) {
  return (
    <View className="min-h-[62px] flex-row items-center gap-4 rounded-2xl border border-[#ECECEC] bg-white px-4 py-3" style={{ borderCurve: "continuous" }}>
      <AppIcon name={icon} size={27} />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-[15px] font-semibold text-[#111111]" selectable>{title}</Text>
        <Text className="text-[14px] leading-[19px] text-[#737373]" selectable>{description}</Text>
      </View>
    </View>
  );
}

function StepOne({ cta, disclosure, onContinue }: { cta: string; disclosure: string; onContinue: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 gap-4">
      <View className="items-center gap-2 px-4">
        <Text accessibilityRole="header" className="text-center text-[29px] font-bold leading-[35px] tracking-[-0.7px] text-[#111111]" selectable>{t("paywall.title")}</Text>
        <Text className="text-center text-[15px] leading-[21px] text-[#737373]" selectable>{t("paywallFlow.benefitsSubtitle")}</Text>
      </View>
      <View className="gap-2">
        <BenefitRow description={t("paywallFlow.nutritionDescription")} icon="nutrition" title={t("paywallFlow.nutritionTitle")} />
        <BenefitRow description={t("paywallFlow.trackingDescription")} icon="goal" title={t("paywallFlow.trackingTitle")} />
        <BenefitRow description={t("paywallFlow.progressDescription")} icon="progress" title={t("paywallFlow.progressTitle")} />
      </View>
      <Image accessibilityLabel={t("welcome.mealImage")} className="min-h-[180px] flex-1 rounded-3xl" contentFit="cover" source={meal} />
      <View className="items-center gap-3">
        <View className="flex-row items-center gap-2 rounded-full bg-[#F5F5F5] px-4 py-2"><AppIcon name="motivation" size={17} /><Text className="text-sm font-semibold text-[#111111]">{t("paywallFlow.flexibleBadge")}</Text></View>
        <PrimaryButton className="min-h-[60px] w-full rounded-2xl" label={cta} labelClassName="text-[18px]" onPress={onContinue} />
        <Text className="text-center text-[13px] leading-[18px] text-[#737373]" selectable>{disclosure}</Text>
      </View>
    </View>
  );
}

function TimelineRow({ active, description, icon, title }: { active?: boolean; description: string; icon: AppIconName; title: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className={`h-11 w-11 items-center justify-center rounded-full ${active ? "bg-[#111111]" : "bg-[#F4F4F4]"}`}>
        <AppIcon color={active ? "#FFFFFF" : "#111111"} name={icon} size={21} weight="semibold" />
      </View>
      <View className="min-h-[68px] min-w-0 flex-1 justify-center rounded-2xl border border-[#E8E8E8] bg-white px-4 py-3" style={{ borderCurve: "continuous" }}>
        <Text className="text-[15px] font-bold text-[#111111]" selectable>{title}</Text>
        <Text className="text-[14px] leading-[19px] text-[#737373]" selectable>{description}</Text>
      </View>
    </View>
  );
}

function StepTwo({ hasTrial, onContinue, trialDays }: { hasTrial: boolean; onContinue: () => void; trialDays: number | null }) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 gap-5">
      <View className="items-center gap-2 px-4">
        <Text accessibilityRole="header" className="text-center text-[29px] font-bold leading-[34px] tracking-[-0.7px] text-[#111111]" selectable>{hasTrial ? t("paywallFlow.reminderTitle") : t("paywallFlow.accessTitle")}</Text>
        <Text className="text-center text-[15px] leading-[21px] text-[#737373]" selectable>{hasTrial ? t("paywallFlow.reminderSubtitle") : t("paywallFlow.accessSubtitle")}</Text>
      </View>
      <View className="items-center py-1">
        <View className="h-28 w-28 items-center justify-center rounded-full border-[9px] border-[#F0F0F0]"><AppIcon name={hasTrial ? "notification" : "unlock"} size={52} /></View>
      </View>
      <View className="gap-3">
        <TimelineRow active description={hasTrial ? t("paywallFlow.todayTrial", { count: trialDays ?? 0 }) : t("paywallFlow.todayAccess")} icon="check" title={t("paywall.today")} />
        <TimelineRow description={hasTrial ? t("paywallFlow.dayTwoDescription") : t("paywallFlow.trackDescription")} icon={hasTrial ? "calendar" : "nutrition"} title={hasTrial ? t("paywallFlow.dayTwo") : t("paywallFlow.trackTitle")} />
        <TimelineRow description={hasTrial ? t("paywallFlow.finalReminder", { count: trialDays ?? 0 }) : t("paywallFlow.manageDescription")} icon={hasTrial ? "notification" : "settings"} title={hasTrial ? t("paywallFlow.finalDay", { count: trialDays ?? 0 }) : t("paywallFlow.manageTitle")} />
      </View>
      <View className="mt-auto gap-4">
        <View className="flex-row items-center gap-3 rounded-2xl border border-[#E8E8E8] bg-[#FAFAFA] p-4"><AppIcon name="privacy" size={22} /><Text className="min-w-0 flex-1 text-[13px] leading-[18px] text-[#737373]">{hasTrial ? t("paywallFlow.noChargeUntilEnd") : t("paywallFlow.cancelAnytime")}</Text></View>
        <PrimaryButton className="min-h-[60px] rounded-2xl" label={t("common.continue")} labelClassName="text-[18px]" onPress={onContinue} />
        <View className="flex-row justify-center gap-3"><View className="h-2 w-2 rounded-full bg-[#BDBDBD]" /><View className="h-2 w-2 rounded-full bg-[#111111]" /><View className="h-2 w-2 rounded-full bg-[#D8D8D8]" /></View>
      </View>
    </View>
  );
}

function PlanOption({ description, disabled, label, onPress, price, selected }: { description?: string; disabled: boolean; label: string; onPress: () => void; price: string; selected: boolean }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ disabled, selected }} className={`min-h-[92px] flex-row items-center gap-3 rounded-[22px] border-2 bg-white px-4 py-4 ${selected ? "border-[#111111]" : "border-[#E1E1E1]"}`} disabled={disabled} onPress={onPress} style={{ borderCurve: "continuous" }}>
      <View className={`h-7 w-7 items-center justify-center rounded-full border-2 ${selected ? "border-[#111111]" : "border-[#CFCFCF]"}`}>{selected ? <View className="h-4 w-4 rounded-full bg-[#111111]" /> : null}</View>
      <View className="min-w-0 flex-1 gap-1"><Text className="text-[17px] font-bold text-[#111111]">{label}</Text><Text className="text-[22px] font-bold text-[#111111]" selectable>{price}</Text>{description ? <Text className="text-[13px] text-[#737373]" selectable>{description}</Text> : null}</View>
      {selected ? <View className="h-8 w-8 items-center justify-center rounded-full bg-[#111111]"><AppIcon color="#FFFFFF" name="check" size={19} weight="semibold" /></View> : null}
    </Pressable>
  );
}

export function PaywallScreen() {
  const { t } = useTranslation();
  const { annualPackage, error, monthlyPackage, purchase, restore, state, trialEligible } = useSubscription();
  const [step, setStep] = React.useState<Step>(1);
  const [plan, setPlan] = React.useState<Plan>("annual");
  const [working, setWorking] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const selectedPlan: Plan = plan === "annual" && !annualPackage && monthlyPackage ? "monthly" : plan;
  const selectedPackage = selectedPlan === "annual" ? annualPackage : monthlyPackage;
  const eligible = trialEligible[selectedPlan] === true && selectedPackage?.product.introPrice?.price === 0;
  const days = eligible ? freeTrialDays(selectedPackage) : null;
  const annualSavings = annualPackage && monthlyPackage && monthlyPackage.product.price > 0 ? Math.max(0, Math.round((1 - annualPackage.product.price / (monthlyPackage.product.price * 12)) * 100)) : 0;
  const loadingPrice = state === "loading" ? t("common.loading") : t("paywall.unavailable");
  const active = ["trial", "active", "cancelledActive", "billingIssueActive"].includes(state);

  const close = () => router.canGoBack() ? router.back() : router.replace("/(app)/(tabs)/today" as Href);
  const run = async (operation: () => Promise<void>, success?: () => void) => {
    if (working) return;
    setWorking(true); setNotice(null);
    try { await operation(); success?.(); } catch { setNotice(t("paywall.actionError")); } finally { setWorking(false); }
  };
  const restorePurchases = () => void run(restore, () => setNotice(t("paywall.restoreComplete")));
  const purchasePlan = () => void run(() => purchase(selectedPlan), () => router.replace("/(app)/benefits" as Href));
  const selectedTrialDuration = days ? t("paywall.daysFree", { count: days }) : t("paywall.freeTrial");
  const disclosure = eligible
    ? selectedPlan === "annual" ? t("paywall.annualDisclosure", { trial: selectedTrialDuration, price: annualPackage?.product.priceString ?? loadingPrice }) : t("paywall.monthlyDisclosure", { trial: selectedTrialDuration, price: monthlyPackage?.product.priceString ?? loadingPrice })
    : t("paywall.storeDisclosure");

  return (
    <SafeAreaView edges={["top", "right", "bottom", "left"]} style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <ScrollView className="flex-1 bg-white" contentContainerClassName="flex-grow px-5 pb-5" contentInsetAdjustmentBehavior="automatic">
        <BrandHeader onClose={step === 1 ? close : () => setStep((step - 1) as Step)} onRestore={restorePurchases} showRestore={step !== 2} />
        {step === 1 ? <StepOne cta={eligible ? t("paywallFlow.tryFree") : t("common.continue")} disclosure={eligible ? t("paywallFlow.thenPrice", { price: selectedPackage?.product.priceString ?? loadingPrice }) : t("paywall.storeDisclosure")} onContinue={() => setStep(2)} /> : null}
        {step === 2 ? <StepTwo hasTrial={eligible} onContinue={() => setStep(3)} trialDays={days} /> : null}
        {step === 3 ? (
          <View className="flex-1 gap-4">
            <View className="items-center gap-2 px-4"><Text accessibilityRole="header" className="text-center text-[29px] font-bold text-[#111111]">{t("paywallFlow.choosePlan")}</Text><Text className="text-center text-[15px] text-[#737373]">{eligible ? t("paywallFlow.chooseTrial", { count: days ?? 0 }) : t("paywallFlow.chooseSubtitle")}</Text></View>
            <View accessibilityRole="radiogroup" className="gap-3">
              <PlanOption description={annualSavings ? t("paywall.annualSavings", { savings: annualSavings }) : t("paywall.bestValue")} disabled={!annualPackage} label={t("paywall.annual")} onPress={() => setPlan("annual")} price={annualPackage?.product.priceString ?? loadingPrice} selected={selectedPlan === "annual"} />
              <PlanOption disabled={!monthlyPackage} label={t("paywall.monthly")} onPress={() => setPlan("monthly")} price={monthlyPackage?.product.priceString ?? loadingPrice} selected={selectedPlan === "monthly"} />
            </View>
            <View className="gap-3 rounded-2xl border border-[#E8E8E8] bg-[#FAFAFA] p-4"><FeatureLine icon="unlock" left={eligible ? t("paywallFlow.daysFree", { count: days ?? 0 }) : t("paywallFlow.fullAccess")} right={t("paywallFlow.fullAccess")} /><FeatureLine icon="privacy" left={t("paywallFlow.cancelAnytimeShort")} right={t("paywallFlow.noCommitments")} /><FeatureLine icon="checkCircle" left={t("paywallFlow.securePrivate")} right={t("paywallFlow.storeProtected")} /></View>
            {error || notice ? <Text accessibilityLiveRegion="polite" className={`text-center text-sm ${notice === t("paywall.restoreComplete") ? "text-[#737373]" : "text-app-error"}`}>{notice ?? t("paywall.loadError")}</Text> : null}
            <View className="mt-auto gap-3"><PrimaryButton className="min-h-[60px] rounded-2xl" disabled={working || !selectedPackage || active} label={active ? t("paywall.active") : working ? t("paywall.processing") : eligible ? t("paywall.startTrialDays", { count: days ?? 0 }) : t("common.continue")} labelClassName="text-[18px]" onPress={purchasePlan} /><Text className="text-center text-[13px] leading-[18px] text-[#737373]" selectable>{disclosure}</Text><View className="flex-row flex-wrap justify-center gap-x-2"><Link className="min-h-11 py-3 text-sm font-medium text-[#111111] underline" href="/(app)/settings/terms">{t("paywall.terms")}</Link><Link className="min-h-11 py-3 text-sm font-medium text-[#111111] underline" href="/(app)/settings/privacy">{t("paywall.privacy")}</Link></View><View className="flex-row items-center justify-center gap-2"><AppIcon color="#737373" name="privacy" size={15} /><Text className="text-xs text-[#737373]">{t("paywallFlow.secureCheckout")}</Text></View></View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureLine({ icon, left, right }: { icon: AppIconName; left: string; right: string }) {
  return <View className="flex-row items-center gap-3"><AppIcon name={icon} size={18} /><Text className="min-w-0 flex-1 text-sm text-[#111111]">{left}</Text><Text className="text-right text-xs text-[#737373]">{right}</Text></View>;
}
