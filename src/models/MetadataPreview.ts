export type MetadataPreviewField =
  | "title"
  | "artist"
  | "album"
  | "year"
  | "genre"
  | "composer"
  | "artwork";

export interface MetadataPreviewItem {
  field: MetadataPreviewField;
  label: string;
  before: string;
  after: string;
  changed: boolean;
  selectable: boolean;
  selectedByDefault: boolean;
  kind: "text" | "artwork";
}

export interface MetadataPreview {
  filePath: string;
  appleMusicTrackId?: string;
  storefront?: string;
  items: MetadataPreviewItem[];
  changedCount: number;
  defaultSelectedCount: number;
}
