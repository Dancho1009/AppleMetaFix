import type { TrackMetadata } from "../providers/AppleMusicProvider";

function normalize(value?: string): string {
  return value
    ?.normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]/g, "") ?? "";
}

export function buildAppleMusicSearchTerms(
  title: string,
  artist?: string,
  album?: string,
): string[] {
  const variants = [
    [title, artist, album],
    [title, album],
    [title],
    [artist, title, album],
  ]
    .map((items) => items.filter(Boolean).join(" ").trim())
    .filter(Boolean);

  return [...new Set(variants)];
}

export function buildStorefrontSearchOrder(
  configuredStorefront: string,
  detectedStorefronts: string[],
): string[] {
  const configured = configuredStorefront.trim().toLowerCase();
  const detected = detectedStorefronts
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const order =
    configured === "auto"
      ? detected
      : [configured];

  return [...new Set(order)].filter((item) => item !== "auto");
}

function candidateKey(track: TrackMetadata): string {
  const storefront = track.storefront?.trim().toLowerCase() || "unknown";
  if (track.id) return `${storefront}:${track.id}`;

  return [
    storefront,
    track.isrc ?? "",
    normalize(track.title),
    normalize(track.artist),
    normalize(track.album),
  ].join("|");
}

export function mergeSearchCandidates(
  current: TrackMetadata[],
  incoming: TrackMetadata[],
): TrackMetadata[] {
  const result = [...current];
  const seen = new Set(current.map(candidateKey));

  for (const candidate of incoming) {
    const key = candidateKey(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(candidate);
  }

  return result;
}

export function hasExactTitleMatch(
  title: string,
  candidates: TrackMetadata[],
): boolean {
  const expected = normalize(title);
  if (!expected) return false;

  return candidates.some(
    (candidate) => normalize(candidate.title) === expected,
  );
}

export function prioritizeSearchCandidates(
  title: string,
  candidates: TrackMetadata[],
): TrackMetadata[] {
  const expected = normalize(title);

  return candidates
    .map((candidate, index) => {
      const actual = normalize(candidate.title);
      const titlePriority =
        actual === expected
          ? 2
          : actual.includes(expected) || expected.includes(actual)
            ? 1
            : 0;

      return { candidate, index, titlePriority };
    })
    .sort(
      (a, b) =>
        b.titlePriority - a.titlePriority ||
        a.index - b.index,
    )
    .map(({ candidate }) => candidate);
}
