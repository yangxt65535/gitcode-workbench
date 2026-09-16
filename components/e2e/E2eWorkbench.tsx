"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  INSTALL_KINDS,
  REPORT_KINDS,
  buildE2eIframeSrc,
  buildE2eReportUrl,
  defaultReportIsoDate,
  isInstallKind,
  isReportKind,
  type InstallKind,
  type ReportKind,
} from "@/lib/e2e/reportUrl";
import styles from "./E2eWorkbench.module.css";

const INSTALL_LABELS: Record<InstallKind, string> = {
  install: "安装 (install)",
  noninstall: "非安装 (noninstall)",
};

const REPORT_LABELS: Record<ReportKind, string> = {
  "e2e-frontend": "前端 (e2e-frontend)",
  "e2e-backend": "后端 (e2e-backend)",
};

export function E2eWorkbench() {
  const [isoDate, setIsoDate] = useState(() => defaultReportIsoDate());
  const [installKind, setInstallKind] = useState<InstallKind>("install");
  const [reportKind, setReportKind] = useState<ReportKind>("e2e-frontend");
  const [loadToken, setLoadToken] = useState<number | null>(null);

  const reportUrl = useMemo(
    () => buildE2eReportUrl({ isoDate, installKind, reportKind }),
    [isoDate, installKind, reportKind],
  );
  const iframeSrc = useMemo(
    () =>
      reportUrl && loadToken !== null
        ? buildE2eIframeSrc(reportUrl, loadToken)
        : null,
    [reportUrl, loadToken],
  );

  useEffect(() => {
    setLoadToken(Date.now());
  }, []);

  function handleDateChange(event: ChangeEvent<HTMLInputElement>) {
    setIsoDate(event.target.value);
  }

  function handleInstallChange(event: ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    if (isInstallKind(next)) setInstallKind(next);
  }

  function handleReportChange(event: ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    if (isReportKind(next)) setReportKind(next);
  }

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <label className={styles.field}>
          <span className={styles.label}>日期</span>
          <input
            type="date"
            className={styles.control}
            value={isoDate}
            onChange={handleDateChange}
            aria-label="报告日期"
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>安装场景</span>
          <select
            className={styles.control}
            value={installKind}
            onChange={handleInstallChange}
            aria-label="安装场景"
          >
            {INSTALL_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {INSTALL_LABELS[kind]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>报告类型</span>
          <select
            className={styles.control}
            value={reportKind}
            onChange={handleReportChange}
            aria-label="报告类型"
          >
            {REPORT_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {REPORT_LABELS[kind]}
              </option>
            ))}
          </select>
        </label>
        {reportUrl ? (
          <p className={styles.url} title={reportUrl}>
            {reportUrl}
          </p>
        ) : (
          <p className={styles.url}>请选择有效日期</p>
        )}
      </div>
      <div className={styles.frameWrap}>
        {iframeSrc ? (
          <iframe
            key={iframeSrc}
            className={styles.frame}
            src={iframeSrc}
            title="E2E Allure 报告"
          />
        ) : (
          <div className={styles.invalid}>请选择有效日期后再查看报告</div>
        )}
      </div>
    </div>
  );
}
