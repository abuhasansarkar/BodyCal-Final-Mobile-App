import { useSession } from "@clerk/expo";
import React from "react";

/**
 * Fresh-credential check before a destructive account operation.
 *
 * `useReverification` cannot do this job here. It only reacts to a Clerk API
 * call that comes back with `session_reverification_required`, and account
 * deletion runs through Convex mutations — no Clerk request is made, so the
 * reverification modal never opens and the wrapper passes straight through. It
 * also relies on Clerk's prebuilt UI, which does not exist in React Native.
 *
 * This drives the session verification API directly instead, so an unlocked
 * phone left on a table cannot erase somebody's account.
 *
 * Only first-factor verification is handled. The app enrols no second factor
 * anywhere, so a `needs_second_factor` result means the account was configured
 * outside BodyCal; that is reported as unsupported rather than half-verified.
 */

export type ReauthStep = "idle" | "password" | "code" | "unsupported";

type BeginResult = { step: ReauthStep; verified: boolean };

export function useReauthentication() {
  const { session } = useSession();
  const [step, setStep] = React.useState<ReauthStep>("idle");

  const reset = React.useCallback(() => setStep("idle"), []);

  /**
   * Opens a verification and reports which credential the user must supply.
   * Returns `verified` when the session is already fresh enough to proceed.
   */
  const begin = React.useCallback(async (): Promise<BeginResult> => {
    if (!session) return { step: "unsupported", verified: false };

    const verification = await session.startVerification({ level: "first_factor" });
    if (verification.status === "complete") return { step: "idle", verified: true };

    const factors = verification.supportedFirstFactors ?? [];
    if (factors.some((factor) => factor.strategy === "password")) {
      setStep("password");
      return { step: "password", verified: false };
    }

    // Social-only accounts have no password to re-enter, so fall back to a code
    // sent to the verified email address on the account.
    const emailFactor = factors.find((factor) => factor.strategy === "email_code");
    if (emailFactor) {
      await session.prepareFirstFactorVerification({
        strategy: "email_code",
        emailAddressId: emailFactor.emailAddressId,
      });
      setStep("code");
      return { step: "code", verified: false };
    }

    setStep("unsupported");
    return { step: "unsupported", verified: false };
  }, [session]);

  /** Throws when the credential is wrong or a second factor is demanded. */
  const submit = React.useCallback(
    async (value: string) => {
      if (!session) throw new Error("reauth_unsupported");

      const attempt =
        step === "password"
          ? await session.attemptFirstFactorVerification({
              strategy: "password",
              password: value,
            })
          : await session.attemptFirstFactorVerification({
              strategy: "email_code",
              code: value,
            });

      if (attempt.status !== "complete") throw new Error("reauth_incomplete");
      setStep("idle");
    },
    [session, step],
  );

  return { begin, reset, step, submit };
}
