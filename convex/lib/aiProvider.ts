/**
 * The server-side AI provider boundary.
 *
 * Every AI call site reads its credentials and model through here rather than
 * touching `process.env` directly, so the environment contract is stated once
 * and a misconfigured deployment fails the same way everywhere.
 *
 * Deliberately free of the `openai` import so the V8 runtime can read the
 * configuration too — only the `"use node"` action modules construct a client.
 *
 * ## Environment contract
 *
 * | Variable         | Required | Meaning                                      |
 * | ---------------- | -------- | -------------------------------------------- |
 * | `AI_API_KEY`     | yes*     | Provider key. `OPENAI_API_KEY` also accepted. |
 * | `OPENAI_API_KEY` | yes*     | Alias for `AI_API_KEY`, checked second.       |
 * | `AI_MODEL`       | no       | Model override; defaults below.               |
 * | `AI_PROVIDER`    | no       | Only `openai` is implemented.                 |
 *
 * \* Exactly one of the two key names must be set on the Convex deployment
 * (`npx convex env set …`), not merely in a local `.env` file — actions read the
 * deployment's environment, never the developer's shell.
 *
 * Both key names are accepted because `OPENAI_API_KEY` is the name every OpenAI
 * quickstart uses, and a deployment configured with it would otherwise look
 * exactly like one with no key at all: the action throws "AI provider is not
 * configured" and the app reports that it could not analyse the meal.
 */

export const DEFAULT_AI_MODEL = "gpt-4o-mini";

/** Key variables in precedence order. The first non-empty one wins. */
const KEY_VARIABLES = ["AI_API_KEY", "OPENAI_API_KEY"] as const;

export type ProviderConfig = {
  apiKey: string;
  /** Which variable supplied the key. Safe to log; the key itself is not. */
  keySource: (typeof KEY_VARIABLES)[number];
  model: string;
};

/** The configured model, whether or not a key is present. */
export function providerModel() {
  return process.env.AI_MODEL?.trim() || DEFAULT_AI_MODEL;
}

/**
 * Reads the provider configuration, or null when no key is set.
 *
 * Values are trimmed: a key pasted into a dashboard field with a trailing
 * newline is otherwise sent to the provider verbatim and rejected as a bad
 * credential, which reads as "the analysis failed" rather than "the key is
 * wrong".
 */
export function readProviderConfig(): ProviderConfig | null {
  for (const variable of KEY_VARIABLES) {
    const apiKey = process.env[variable]?.trim();
    if (apiKey) return { apiKey, keySource: variable, model: providerModel() };
  }
  return null;
}

/**
 * Explains a missing or unusable configuration in the deployment logs.
 *
 * Names only which variables were looked for and whether `AI_PROVIDER` is
 * something this build cannot honour — never a key, or any part of one.
 */
export function logProviderMisconfiguration(scope: string) {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase();
  console.error(
    `[${scope}] no AI provider key found. Set one of ${KEY_VARIABLES.join(" or ")} on the Convex ` +
      `deployment with \`npx convex env set <NAME> <value>\`; a local .env file is not read by ` +
      `deployed functions.` +
      (provider && provider !== "openai"
        ? ` AI_PROVIDER is "${provider}", but only "openai" is implemented.`
        : ""),
  );
}
