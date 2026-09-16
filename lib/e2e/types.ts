export type InstallKind = "install" | "noninstall";
export type ReportKind = "e2e-frontend" | "e2e-backend";

export type E2eReportParams = {
  isoDate: string;
  installKind: InstallKind;
  reportKind: ReportKind;
};
