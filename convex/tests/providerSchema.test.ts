import { describe, expect, it } from "@jest/globals";
import { zodTextFormat } from "openai/helpers/zod";

import { estimateSchema } from "../ai";
import { planSchema } from "../planGeneration";

/**
 * Guards the JSON Schema actually sent to the provider.
 *
 * OpenAI's strict Structured Outputs mode accepts only a subset of JSON Schema
 * and **rejects the whole request** when it meets a keyword outside it — before
 * the model runs, so nothing about the prompt or the image matters. Zod emits
 * those keywords automatically: a single `z.string().max(120)` is enough to make
 * every call fail, and it did. Both call sites failed this way, and neither said
 * so out loud — the meal scan surfaced a generic "analysis did not finish", and
 * the plan generator silently fell back to the local calculator.
 *
 * The supported subset is documented at
 * https://developers.openai.com/api/docs/guides/structured-outputs — strings
 * take only `pattern` and `format`; numbers and arrays keep their bounds.
 */
const UNSUPPORTED_KEYWORDS = [
  "minLength",
  "maxLength",
  "patternProperties",
  "unevaluatedProperties",
  "propertyNames",
  "minProperties",
  "maxProperties",
  "contains",
  "minContains",
  "maxContains",
  "uniqueItems",
];

function findUnsupported(node: unknown, path = "$"): string[] {
  if (node === null || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap((entry, index) => findUnsupported(entry, `${path}[${index}]`));

  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) => {
    const here = `${path}.${key}`;
    return [
      ...(UNSUPPORTED_KEYWORDS.includes(key) ? [here] : []),
      ...findUnsupported(value, here),
    ];
  });
}

describe("provider JSON Schema", () => {
  it.each([
    ["ai.estimateSchema", estimateSchema, "nutrition_estimate"],
    ["planGeneration.planSchema", planSchema, "nutrition_plan"],
  ])("%s uses only keywords strict Structured Outputs supports", (_name, schema, formatName) => {
    const format = zodTextFormat(schema as never, formatName);
    expect(findUnsupported(format.schema)).toEqual([]);
  });

  it("still declares the numeric and array bounds that are supported", () => {
    // The fix removes string lengths; it must not quietly remove the plausibility
    // limits that keep an implausible estimate out of the database.
    const emitted = JSON.stringify(zodTextFormat(estimateSchema as never, "nutrition_estimate").schema);
    expect(emitted).toContain("\"minimum\"");
    expect(emitted).toContain("\"maximum\"");
    expect(emitted).toContain("\"maxItems\"");
  });

  it("requires additionalProperties: false on every object, as strict mode demands", () => {
    const missing: string[] = [];
    (function walk(node: unknown, path: string) {
      if (node === null || typeof node !== "object") return;
      const record = node as Record<string, unknown>;
      if (record.type === "object" && record.additionalProperties !== false) missing.push(path);
      for (const [key, value] of Object.entries(record)) walk(value, `${path}.${key}`);
    })(zodTextFormat(estimateSchema as never, "nutrition_estimate").schema, "$");

    expect(missing).toEqual([]);
  });
});
