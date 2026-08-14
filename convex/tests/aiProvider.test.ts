import { afterEach, describe, expect, it } from "@jest/globals";

import { DEFAULT_AI_MODEL, providerModel, readProviderConfig } from "../lib/aiProvider";

/**
 * The environment contract for the AI provider.
 *
 * A deployment configured under the wrong variable name fails exactly like one
 * with no provider at all — the action throws "AI provider is not configured"
 * and the app reports it could not analyse the meal. `OPENAI_API_KEY` is the
 * name every OpenAI quickstart uses, so it has to keep working.
 */
const MANAGED = ["AI_API_KEY", "OPENAI_API_KEY", "AI_MODEL"] as const;
const original = Object.fromEntries(MANAGED.map((name) => [name, process.env[name]]));

function setEnv(values: Partial<Record<(typeof MANAGED)[number], string | undefined>>) {
  for (const name of MANAGED) {
    const value = values[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

afterEach(() => {
  for (const name of MANAGED) {
    if (original[name] === undefined) delete process.env[name];
    else process.env[name] = original[name];
  }
});

describe("readProviderConfig", () => {
  it("reads a key from AI_API_KEY", () => {
    setEnv({ AI_API_KEY: "sk-primary" });
    expect(readProviderConfig()).toEqual({
      apiKey: "sk-primary",
      keySource: "AI_API_KEY",
      model: DEFAULT_AI_MODEL,
    });
  });

  it("accepts OPENAI_API_KEY as an alias", () => {
    setEnv({ OPENAI_API_KEY: "sk-alias" });
    expect(readProviderConfig()).toEqual({
      apiKey: "sk-alias",
      keySource: "OPENAI_API_KEY",
      model: DEFAULT_AI_MODEL,
    });
  });

  it("prefers AI_API_KEY when both are set", () => {
    setEnv({ AI_API_KEY: "sk-primary", OPENAI_API_KEY: "sk-alias" });
    expect(readProviderConfig()?.apiKey).toBe("sk-primary");
  });

  it("trims whitespace a dashboard paste leaves behind", () => {
    // An untrimmed key is sent verbatim and rejected as a bad credential, which
    // reads as "analysis failed" rather than "your key is wrong".
    setEnv({ AI_API_KEY: "  sk-padded\n" });
    expect(readProviderConfig()?.apiKey).toBe("sk-padded");
  });

  it("treats an empty or whitespace-only value as unset", () => {
    setEnv({ AI_API_KEY: "   " });
    expect(readProviderConfig()).toBeNull();
  });

  it("returns null when no key is configured", () => {
    setEnv({});
    expect(readProviderConfig()).toBeNull();
  });

  it("honours AI_MODEL and falls back to the default", () => {
    setEnv({ AI_API_KEY: "sk-primary", AI_MODEL: "gpt-5" });
    expect(readProviderConfig()?.model).toBe("gpt-5");

    setEnv({ AI_API_KEY: "sk-primary", AI_MODEL: "  " });
    expect(readProviderConfig()?.model).toBe(DEFAULT_AI_MODEL);
  });

  it("reports the model even with no key, so status can be shown either way", () => {
    setEnv({ AI_MODEL: "gpt-5-mini" });
    expect(providerModel()).toBe("gpt-5-mini");
    expect(readProviderConfig()).toBeNull();
  });
});
