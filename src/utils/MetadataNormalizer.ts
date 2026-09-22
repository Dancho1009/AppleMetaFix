export function normalizeMetadataText(value?: string): string {
  return (value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]/g, "");
}

export function normalizeTitle(value?: string): string {
  return normalizeMetadataText(value);
}

export function normalizeArtist(value?: string): string {
  return normalizeMetadataText(value).replace(/cv[.:]?/gi, "");
}

export function normalizeAlbum(value?: string): string {
  return normalizeMetadataText(value);
}
