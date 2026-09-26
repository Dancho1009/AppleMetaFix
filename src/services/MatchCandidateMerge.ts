import type { TrackMetadata } from "../providers/AppleMusicProvider";

function trackIdentityKey(track: TrackMetadata): string {
  const storefront = track.storefront?.trim().toLowerCase() || "unknown";
  const id = track.id?.trim();

  if (id) {
    return `${storefront}:${id}`;
  }

  return [
    storefront,
    track.isrc ?? "",
    track.title ?? "",
    track.artist ?? "",
    track.album ?? "",
  ].join("|");
}

export function mergeConfirmedTrack(
  candidates: TrackMetadata[],
  confirmedTrack?: TrackMetadata | null,
): TrackMetadata[] {
  if (!confirmedTrack) {
    return candidates;
  }

  const confirmedKey = trackIdentityKey(confirmedTrack);

  return [
    confirmedTrack,
    ...candidates.filter(
      (candidate) => trackIdentityKey(candidate) !== confirmedKey,
    ),
  ];
}
