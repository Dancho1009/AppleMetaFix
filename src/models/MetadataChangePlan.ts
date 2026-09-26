import type { MetadataPreviewField } from "./MetadataPreview";

export interface MetadataChange {
  field: MetadataPreviewField;
  label: string;
  before: string;
  after: string;
  kind: "text" | "artwork";
}

export interface MetadataChangePlan {
  filePath: string;
  appleMusicTrackId?: string;
  storefront?: string;
  changes: MetadataChange[];
}
