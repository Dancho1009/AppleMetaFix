import type {
  MetadataPreview,
  MetadataPreviewField,
  MetadataPreviewItem,
} from "../models/MetadataPreview";
import type { MetadataChangePlan } from "../models/MetadataChangePlan";
import type { SongMatchConfirmation } from "../models/SongMatchConfirmation";

export interface LocalMetadataPreviewSource {
  path: string;
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  genre?: string;
  composer?: string;
  coverDataUrl?: string;
  coverPath?: string;
  cover_path?: string;
}

function text(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function yearFromReleaseDate(value?: string): string {
  const match = value?.match(/^(\d{4})/);
  return match?.[1] ?? "";
}

function createTextItem(
  field: MetadataPreviewItem["field"],
  label: string,
  beforeValue: unknown,
  afterValue: unknown,
): MetadataPreviewItem {
  const before = text(beforeValue);
  const after = text(afterValue);
  const changed = Boolean(after) && before !== after;

  return {
    field,
    label,
    before,
    after,
    changed,
    selectable: changed,
    selectedByDefault: changed,
    kind: "text",
  };
}

export function createMetadataPreview(
  local: LocalMetadataPreviewSource,
  confirmation: SongMatchConfirmation,
): MetadataPreview {
  const { track } = confirmation;
  const localArtwork =
    local.coverDataUrl ||
    local.coverPath ||
    local.cover_path ||
    "";
  const remoteArtwork = track.artwork ?? "";

  const items: MetadataPreviewItem[] = [
    createTextItem("title", "标题", local.title, track.title),
    createTextItem("artist", "艺术家", local.artist, track.artist),
    createTextItem("album", "专辑", local.album, track.album),
    createTextItem(
      "year",
      "年份",
      local.year,
      yearFromReleaseDate(track.releaseDate),
    ),
    createTextItem(
      "genre",
      "流派",
      local.genre,
      track.genre?.filter(Boolean).join("; "),
    ),
    createTextItem("composer", "作曲家", local.composer, track.composer),
    {
      field: "artwork",
      label: "封面",
      before: localArtwork,
      after: remoteArtwork,
      changed: Boolean(remoteArtwork) && localArtwork !== remoteArtwork,
      selectable: Boolean(remoteArtwork) && localArtwork !== remoteArtwork,
      selectedByDefault: Boolean(remoteArtwork) && !localArtwork,
      kind: "artwork",
    },
  ];

  return {
    filePath: local.path,
    appleMusicTrackId: track.id,
    storefront: track.storefront,
    items,
    changedCount: items.filter((item) => item.changed).length,
    defaultSelectedCount: items.filter(
      (item) => item.selectable && item.selectedByDefault,
    ).length,
  };
}


export function getDefaultMetadataPreviewFields(
  preview: MetadataPreview,
): MetadataPreviewField[] {
  return preview.items
    .filter((item) => item.selectable && item.selectedByDefault)
    .map((item) => item.field);
}

export function createMetadataChangePlan(
  preview: MetadataPreview,
  selectedFields: MetadataPreviewField[],
): MetadataChangePlan {
  const selected = new Set(selectedFields);

  return {
    filePath: preview.filePath,
    appleMusicTrackId: preview.appleMusicTrackId,
    storefront: preview.storefront,
    changes: preview.items
      .filter(
        (item) =>
          item.changed &&
          item.selectable &&
          selected.has(item.field),
      )
      .map((item) => ({
        field: item.field,
        label: item.label,
        before: item.before,
        after: item.after,
        kind: item.kind,
      })),
  };
}
