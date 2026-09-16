import type { E2eReportParams, InstallKind, ReportKind } from "./types";

export const E2E_REPORT_ORIGIN = "https://static.openfuyao.cn";
export const E2E_REPORT_PREFIX = "/test-report/e2e";

export const INSTALL_KINDS: readonly InstallKind[] = ["install", "noninstall"];
export const REPORT_KINDS: readonly ReportKind[] = [
  "e2e-frontend",
  "e2e-backend",
];

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isoDateToCompact(isoDate: string): string {
  const match = ISO_DATE.exec(isoDate.trim());
  if (!match) return "";
  return `${match[1]}${match[2]}${match[3]}`;
}

export function todayIsoDate(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Reports are published after the day ends; default to yesterday. */
export function defaultReportIsoDate(now = new Date()): string {
  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  );
  return todayIsoDate(yesterday);
}

export function isInstallKind(value: string): value is InstallKind {
  return (INSTALL_KINDS as readonly string[]).includes(value);
}

export function isReportKind(value: string): value is ReportKind {
  return (REPORT_KINDS as readonly string[]).includes(value);
}

export function buildE2eReportUrl(params: E2eReportParams): string | null {
  const date = isoDateToCompact(params.isoDate);
  if (!date) return null;
  if (!isInstallKind(params.installKind)) return null;
  if (!isReportKind(params.reportKind)) return null;
  return `${E2E_REPORT_ORIGIN}${E2E_REPORT_PREFIX}/${date}/${params.installKind}/${params.reportKind}/index.html`;
}

/** Unique query so the iframe does not restore a previous Allure test hash. */
export function buildE2eIframeSrc(reportUrl: string, loadToken: number): string {
  const url = new URL(reportUrl);
  url.searchParams.set("_", String(loadToken));
  url.hash = "";
  return url.toString();
}

export type { E2eReportParams, InstallKind, ReportKind };
