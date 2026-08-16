import { describe, expect, it } from "@jest/globals";

import http from "../http";

describe("HTTP routes", () => {
  it("accepts both configured RevenueCat webhook paths", () => {
    const routes = http.getRoutes().map(([path, method]) => `${method} ${path}`);

    expect(routes).toContain("POST /revenuecat/webhook");
    expect(routes).toContain("POST /revenuecat-webhook");
  });
});
