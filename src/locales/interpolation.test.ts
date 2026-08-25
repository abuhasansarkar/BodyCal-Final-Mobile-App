import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "@jest/globals";

import { i18n, languageOptions } from "@/locales/i18n";

/**
 * Every `t("key", { … })` call must supply the placeholders the string it
 * resolves to actually names.
 *
 * `parity.test.ts` guards that a key *exists* in every language. It cannot see
 * this failure, because the key existed everywhere and every language agreed:
 * the mismatch was between the call site and the bundle. `progress.pctOfGoal`
 * interpolates `{{percent}}` and `progress-screen.tsx` passed `pct`, so the
 * progress card rendered the literal text "{{percent}}% of goal" to users — in
 * all eight languages — and no test failed.
 *
 * i18next leaves an unmatched placeholder in place rather than throwing, which
 * is the right runtime behaviour and the reason this has to be caught here.
 */

const PLACEHOLDER = /\{\{\s*-?\s*([A-Za-z0-9_]+)\s*(?:,[^}]*)?\}\}/g;

/** Params i18next supplies or interprets itself, so a call site need not pass them. */
const RESERVED = new Set(["count", "context", "ordinal", "lng", "ns", "defaultValue", "replace"]);

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "locales") sourceFiles(full, out);
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Property names from an object literal argument, covering both `{ percent: x }`
 * and the shorthand `{ percent }`. Deliberately shallow: nested objects are not
 * interpolation params.
 */
function objectKeys(body: string): Set<string> {
  const keys = new Set<string>();
  for (const match of body.matchAll(/(?:^|[,{])\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?=[,:}]|$)/g)) {
    keys.add(match[1]);
  }
  for (const match of body.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*:/g)) keys.add(match[1]);
  return keys;
}

type CallSite = { key: string; params: Set<string>; file: string };

function collectCallSites(): CallSite[] {
  // Balanced-brace scan rather than a regex for the argument, so a call whose
  // params contain a nested object or a ternary is read whole.
  const opener = /\bt\(\s*["'`]([A-Za-z0-9_.]+)["'`]\s*,\s*\{/g;
  const sites: CallSite[] = [];

  for (const file of sourceFiles("src")) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(opener)) {
      const start = match.index! + match[0].length - 1;
      let depth = 0;
      let end = start;
      for (; end < source.length; end += 1) {
        if (source[end] === "{") depth += 1;
        else if (source[end] === "}") {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      sites.push({
        key: match[1],
        params: objectKeys(source.slice(start + 1, end)),
        file,
      });
    }
  }
  return sites;
}

function resolve(bundle: unknown, key: string): string | undefined {
  const value = key
    .split(".")
    .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], bundle);
  return typeof value === "string" ? value : undefined;
}

describe("translation interpolation", () => {
  const callSites = collectCallSites();

  it("finds the call sites it is meant to be checking", () => {
    expect(callSites.length).toBeGreaterThan(20);
    expect(callSites.some((site) => site.key === "progress.pctOfGoal")).toBe(true);
  });

  it.each(languageOptions.map((option) => option.code))(
    "%s: every call site supplies the placeholders its string names",
    (code) => {
      const bundle = i18n.getResourceBundle(code, "translation");
      const failures: string[] = [];

      for (const site of callSites) {
        const template = resolve(bundle, site.key);
        // A key that resolves to nothing here is `parity.test.ts`'s business, and
        // a plural key resolves through suffixes this lookup does not apply.
        if (template === undefined) continue;

        const needed = new Set(
          [...template.matchAll(PLACEHOLDER)].map((match) => match[1]).filter((name) => !RESERVED.has(name)),
        );
        const missing = [...needed].filter((name) => !site.params.has(name));
        if (missing.length > 0) {
          failures.push(
            `${site.key} in ${site.file}: string needs ${missing.join(", ")}, call passes ${
              [...site.params].join(", ") || "nothing"
            }`,
          );
        }
      }

      expect(failures).toEqual([]);
    },
  );

  /**
   * The same key defined twice with different placeholder names is what let the
   * mismatch above look correct in review: `resources.ts` says `{{pct}}` and
   * `screens/*.ts` says `{{percent}}`, and only one of them renders.
   */
  it("no rendered string leaks an unresolved placeholder for a no-argument call", () => {
    const bundle = i18n.getResourceBundle("en", "translation");
    const noArgCalls = new Set(
      [...fs.readFileSync("src/screens/progress-screen.tsx", "utf8").matchAll(
        /\bt\(\s*["'`]([A-Za-z0-9_.]+)["'`]\s*\)/g,
      )].map((match) => match[1]),
    );

    const leaking = [...noArgCalls].filter((key) => {
      const template = resolve(bundle, key);
      return template !== undefined && PLACEHOLDER.test(template);
    });

    expect(leaking).toEqual([]);
  });
});
