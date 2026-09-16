import { describe, expect, it } from "vitest";
import {
  buildE2eIframeSrc,
  buildE2eReportUrl,
  defaultReportIsoDate,
  isoDateToCompact,
  todayIsoDate,
} from "@/lib/e2e/reportUrl";

describe("isoDateToCompact", () => {
  it("converts ISO date to YYYYMMDD", () => {
    expect(isoDateToCompact("2026-09-15")).toBe("20260915");
  });

  it("returns empty string for invalid date", () => {
    expect(isoDateToCompact("20260915")).toBe("");
    expect(isoDateToCompact("")).toBe("");
    expect(isoDateToCompact("2026/09/15")).toBe("");
  });
});

describe("todayIsoDate", () => {
  it("formats local calendar date as YYYY-MM-DD", () => {
    expect(todayIsoDate(new Date(2026, 8, 16, 9, 23, 0))).toBe("2026-09-16");
  });
});

describe("defaultReportIsoDate", () => {
  it("defaults to yesterday", () => {
    expect(defaultReportIsoDate(new Date(2026, 8, 16, 9, 23, 0))).toBe(
      "2026-09-15",
    );
  });

  it("rolls back across month and year boundaries", () => {
    expect(defaultReportIsoDate(new Date(2026, 0, 1, 8, 0, 0))).toBe(
      "2025-12-31",
    );
  });
});

describe("buildE2eReportUrl", () => {
  it("builds the Allure report URL from date, install kind, and report kind", () => {
    expect(
      buildE2eReportUrl({
        isoDate: "2026-09-15",
        installKind: "install",
        reportKind: "e2e-frontend",
      }),
    ).toBe(
      "https://static.openfuyao.cn/test-report/e2e/20260915/install/e2e-frontend/index.html",
    );
  });

  it("supports noninstall and backend variants", () => {
    expect(
      buildE2eReportUrl({
        isoDate: "2026-09-16",
        installKind: "noninstall",
        reportKind: "e2e-backend",
      }),
    ).toBe(
      "https://static.openfuyao.cn/test-report/e2e/20260916/noninstall/e2e-backend/index.html",
    );
  });

  it("returns null when the date is invalid", () => {
    expect(
      buildE2eReportUrl({
        isoDate: "20260915",
        installKind: "install",
        reportKind: "e2e-frontend",
      }),
    ).toBeNull();
  });
});

describe("buildE2eIframeSrc", () => {
  it("adds a load token and strips any Allure test hash", () => {
    const reportUrl =
      "https://static.openfuyao.cn/test-report/e2e/20260915/install/e2e-frontend/index.html#1284fa07ecaa84bdc8736f9a0f769b90";
    expect(buildE2eIframeSrc(reportUrl, 42)).toBe(
      "https://static.openfuyao.cn/test-report/e2e/20260915/install/e2e-frontend/index.html?_=42",
    );
  });
});
