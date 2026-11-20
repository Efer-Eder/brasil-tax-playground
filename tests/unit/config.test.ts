import { describe, expect, it } from "vitest";
import { DEFAULT_TIMEOUT_MS, readRegimeRegularConfig } from "@/lib/tax-engine/config";

describe("readRegimeRegularConfig", () => {
  it("reports not configured when the URL is missing", () => {
    const result = readRegimeRegularConfig({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.motivo).toContain("REGIME_REGULAR_ENGINE_URL");
  });

  it("treats a blank URL as missing", () => {
    expect(readRegimeRegularConfig({ REGIME_REGULAR_ENGINE_URL: "   " }).ok).toBe(false);
  });

  it("rejects non-http URLs", () => {
    const result = readRegimeRegularConfig({ REGIME_REGULAR_ENGINE_URL: "ftp://localhost/api" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.motivo).toContain("inválida");
  });

  it("strips trailing slashes and applies the default timeout", () => {
    const result = readRegimeRegularConfig({ REGIME_REGULAR_ENGINE_URL: "http://localhost:8080/api//" });
    expect(result).toEqual({
      ok: true,
      config: { baseUrl: "http://localhost:8080/api", timeoutMs: DEFAULT_TIMEOUT_MS },
    });
  });

  it("accepts a custom timeout", () => {
    const result = readRegimeRegularConfig({
      REGIME_REGULAR_ENGINE_URL: "http://localhost:8080/api",
      REGIME_REGULAR_ENGINE_TIMEOUT_MS: "2500",
    });
    expect(result.ok && result.config.timeoutMs).toBe(2500);
  });

  it.each(["abc", "100", "999999", "1.5"])("rejects invalid timeout %s", (value) => {
    const result = readRegimeRegularConfig({
      REGIME_REGULAR_ENGINE_URL: "http://localhost:8080/api",
      REGIME_REGULAR_ENGINE_TIMEOUT_MS: value,
    });
    expect(result.ok).toBe(false);
  });
});
