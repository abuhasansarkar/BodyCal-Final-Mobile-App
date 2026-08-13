import { useSignIn, useSignUp } from "@clerk/expo";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { getPostSignUpRoute, type AuthDestination } from "@/features/auth/auth-destination";
import { AuthField } from "@/screens/auth/auth-fields";
import { Link, Pressable, Text, View } from "@/tw";

type Props = {
  destination?: AuthDestination;
  initialMode?: "signIn" | "signUp";
};

function splitName(value: string) {
  const parts = value.trim().replace(/\s+/g, " ").split(" ");
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") || undefined };
}

export function EmailSignInScreen({ destination = "/(app)/(tabs)/today", initialMode = "signIn" }: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = React.useState<"signIn" | "signUp">(initialMode);

  // Clerk Hooks
  const { errors: signInErrors, fetchStatus: signInFetchStatus, signIn } = useSignIn();
  const { errors: signUpErrors, fetchStatus: signUpFetchStatus, signUp } = useSignUp();

  // Form State
  const [fullName, setFullName] = React.useState("");
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");

  // Verification & Errors
  const [needsVerification, setNeedsVerification] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const isSubmitting = signInFetchStatus === "fetching" || signUpFetchStatus === "fetching";

  const finishSignIn = async () => {
    await signIn.finalize({
      navigate: ({ session }) => {
        if (session?.currentTask) {
          setFormError(t("auth.additionalVerification"));
          return;
        }
        router.replace(destination);
      },
    });
  };

  const submitSignIn = async () => {
    setFormError(null);
    try {
      const { error } = await signIn.password({ emailAddress: emailAddress.trim(), password });
      if (error) {
        setFormError(error.message ?? t("auth.authenticationFailed"));
        return;
      }

      if (signIn.status === "complete") {
        await finishSignIn();
        return;
      }

      if (signIn.status === "needs_client_trust" || signIn.status === "needs_second_factor") {
        const emailCodeFactor = signIn.supportedSecondFactors.find((factor) => factor.strategy === "email_code");
        if (!emailCodeFactor) {
          setFormError(t("auth.additionalVerification"));
          return;
        }

        const { error: sendError } = await signIn.mfa.sendEmailCode();
        if (!sendError) setNeedsVerification(true);
        else setFormError(sendError.message ?? t("auth.authenticationFailed"));
        return;
      }

      setFormError(t("auth.additionalVerification"));
    } catch (err: any) {
      setFormError(err?.message ?? t("auth.authenticationFailed"));
    }
  };

  const submitSignUp = async () => {
    setFormError(null);
    const { firstName, lastName } = splitName(fullName);

    try {
      const { error } = await signUp.password({
        emailAddress: emailAddress.trim(),
        firstName,
        lastName,
        password,
      });
      if (error) {
        setFormError(error.message ?? t("auth.authenticationFailed"));
        return;
      }
      const { error: verificationError } = await signUp.verifications.sendEmailCode();
      if (verificationError) {
        setFormError(verificationError.message ?? t("auth.authenticationFailed"));
      } else {
        setNeedsVerification(true);
      }
    } catch (err: any) {
      setFormError(err?.message ?? t("auth.authenticationFailed"));
    }
  };

  const verify = async () => {
    setFormError(null);
    try {
      if (mode === "signIn") {
        const { error } = await signIn.mfa.verifyEmailCode({ code: code.trim() });
        if (error) {
          setFormError(error.message ?? t("auth.authenticationFailed"));
          return;
        }
        if (signIn.status === "complete") await finishSignIn();
        else setFormError(t("auth.additionalVerification"));
      } else {
        const { error } = await signUp.verifications.verifyEmailCode({ code: code.trim() });
        if (error) {
          setFormError(error.message ?? t("auth.authenticationFailed"));
          return;
        }
        if (signUp.status !== "complete") {
          setFormError(t("auth.additionalVerification"));
          return;
        }
        await signUp.finalize({ navigate: () => router.replace(getPostSignUpRoute(destination)) });
      }
    } catch (err: any) {
      setFormError(err?.message ?? t("auth.authenticationFailed"));
    }
  };

  const resendSignUpCode = async () => {
    setFormError(null);
    try {
      const { error } = await signUp.verifications.sendEmailCode();
      if (error) {
        setFormError(error.message ?? t("auth.authenticationFailed"));
      }
    } catch (err: any) {
      setFormError(err?.message ?? t("auth.authenticationFailed"));
    }
  };

  if (needsVerification) {
    return (
      <AppScreen>
        <View className="-mt-2 flex-row items-center justify-between pb-1">
          <Pressable
            accessibilityLabel={t("common.back")}
            accessibilityRole="button"
            className="h-11 w-11 items-center justify-center rounded-full bg-[#F2F2F2] active:opacity-70"
            onPress={() => setNeedsVerification(false)}
          >
            <AppIcon color="#111111" name="back" size={22} weight="semibold" />
          </Pressable>
          <Text className="text-base font-semibold text-[#111111]">{t("auth.verifyTitle")}</Text>
          <View className="w-11" />
        </View>

        <View className="gap-2 pt-2">
          <Text className="text-3xl font-bold text-[#111111]" selectable>{t("auth.verifyTitle")}</Text>
          <Text className="text-base leading-6 text-[#737373]" selectable>{t("auth.verifyBody")}</Text>
        </View>

        <AuthField
          autoComplete="one-time-code"
          error={mode === "signIn" ? signInErrors.fields.code?.message : signUpErrors.fields.code?.message}
          keyboardType="number-pad"
          label={t("auth.verificationCode")}
          onChangeText={setCode}
          onSubmitEditing={() => void verify()}
          returnKeyType="done"
          textContentType="oneTimeCode"
          value={code}
        />

        {formError ? <Text accessibilityLiveRegion="polite" className="text-sm text-[#EF4444]" selectable>{formError}</Text> : null}

        <View className="gap-3 pt-2">
          <PrimaryButton disabled={!code.trim() || isSubmitting} label={isSubmitting ? t("auth.verifying") : t("auth.verify")} onPress={() => void verify()} />
          {mode === "signUp" ? (
            <PrimaryButton disabled={isSubmitting} label={t("auth.resendCode")} onPress={() => void resendSignUpCode()} />
          ) : null}
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      {/* Custom in-screen Header row */}
      <View className="flex-row items-center justify-between pb-1">
        <Pressable
          accessibilityLabel={t("common.back")}
          accessibilityRole="button"
          className="h-11 w-11 items-center justify-center rounded-full bg-[#F2F2F2] active:opacity-70"
          onPress={() => router.back()}
        >
          <AppIcon color="#111111" name="back" size={22} weight="semibold" />
        </Pressable>
        <Text className="text-base font-semibold text-[#111111]">
          {mode === "signIn" ? t("auth.emailSignIn") : t("auth.createAccount")}
        </Text>
        <View className="w-11" />
      </View>

      {/* Segmented Mode Control */}
      <View className="flex-row rounded-2xl bg-[#F2F2F2] p-1">
        <Pressable
          accessibilityRole="button"
          className={`flex-1 items-center justify-center rounded-xl py-2.5 ${
            mode === "signIn" ? "bg-white shadow-sm" : ""
          }`}
          onPress={() => {
            setFormError(null);
            setMode("signIn");
          }}
        >
          <Text className={`text-sm font-semibold ${mode === "signIn" ? "text-[#111111]" : "text-[#737373]"}`}>
            {t("auth.signIn")}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          className={`flex-1 items-center justify-center rounded-xl py-2.5 ${
            mode === "signUp" ? "bg-white shadow-sm" : ""
          }`}
          onPress={() => {
            setFormError(null);
            setMode("signUp");
          }}
        >
          <Text className={`text-sm font-semibold ${mode === "signUp" ? "text-[#111111]" : "text-[#737373]"}`}>
            {t("auth.createAccount")}
          </Text>
        </Pressable>
      </View>

      <View className="gap-2">
        <Text className="text-3xl font-bold text-[#111111]" selectable>
          {mode === "signIn" ? t("auth.title") : t("auth.createAccountTitle")}
        </Text>
        <Text className="text-base leading-6 text-[#737373]" selectable>
          {mode === "signIn" ? t("auth.emailSubtitle") : t("auth.createAccountSubtitle")}
        </Text>
      </View>

      <View className="gap-4">
        {mode === "signUp" ? (
          <AuthField
            autoCapitalize="words"
            autoComplete="name"
            error={signUpErrors.fields.firstName?.message ?? signUpErrors.fields.lastName?.message}
            label={t("auth.name")}
            onChangeText={setFullName}
            returnKeyType="next"
            textContentType="name"
            value={fullName}
          />
        ) : null}

        <AuthField
          autoCapitalize="none"
          autoComplete="email"
          error={mode === "signIn" ? signInErrors.fields.identifier?.message : signUpErrors.fields.emailAddress?.message}
          keyboardType="email-address"
          label={t("auth.email")}
          onChangeText={setEmailAddress}
          returnKeyType="next"
          textContentType="emailAddress"
          value={emailAddress}
        />

        <AuthField
          autoComplete={mode === "signIn" ? "current-password" : "new-password"}
          error={mode === "signIn" ? signInErrors.fields.password?.message : signUpErrors.fields.password?.message}
          label={t("auth.password")}
          onChangeText={setPassword}
          onSubmitEditing={() => void (mode === "signIn" ? submitSignIn() : submitSignUp())}
          returnKeyType="done"
          secureTextEntry
          textContentType={mode === "signIn" ? "password" : "newPassword"}
          value={password}
        />
      </View>

      {mode === "signUp" ? <View nativeID="clerk-captcha" /> : null}

      {formError ? <Text accessibilityLiveRegion="polite" className="text-sm text-[#EF4444]" selectable>{formError}</Text> : null}

      <View className="gap-3 pt-2">
        <PrimaryButton
          disabled={
            mode === "signIn"
              ? !emailAddress.trim() || !password || isSubmitting
              : !fullName.trim() || !emailAddress.trim() || !password || isSubmitting
          }
          label={
            mode === "signIn"
              ? isSubmitting
                ? t("auth.signingIn")
                : t("auth.signIn")
              : isSubmitting
                ? t("auth.creatingAccount")
                : t("auth.createAccount")
          }
          onPress={() => void (mode === "signIn" ? submitSignIn() : submitSignUp())}
        />

        {mode === "signIn" ? (
          <Link accessibilityRole="link" className="min-h-11 self-center py-3 text-base font-semibold text-[#111111] underline" href="/(auth)/forgot-password">
            {t("auth.forgotPassword")}
          </Link>
        ) : null}
      </View>
    </AppScreen>
  );
}


