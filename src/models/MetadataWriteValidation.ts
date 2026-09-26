import type { MetadataChange } from "./MetadataChangePlan";

export type MetadataWriteFormat = "flac" | "mp3" | "m4a" | "unknown";

export interface MetadataWriteCheck {
  key:
    | "plan"
    | "library"
    | "confirmation"
    | "file-exists"
    | "regular-file"
    | "readable"
    | "writable"
    | "format"
    | "audio-metadata"
    | "source-metadata"
    | "changes";
  label: string;
  ok: boolean;
  detail: string;
}

export interface MetadataWriteValidationIssue {
  code: string;
  severity: "error" | "warning";
  message: string;
  field?: MetadataChange["field"];
}

export interface MetadataWriteDryRunResult {
  mode: "dry-run";
  ok: boolean;
  filePath: string;
  format: MetadataWriteFormat;
  changeCount: number;
  changes: MetadataChange[];
  checks: MetadataWriteCheck[];
  issues: MetadataWriteValidationIssue[];
  validatedAt: number;
}
