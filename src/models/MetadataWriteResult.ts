export interface FlacWrittenMetadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  genre?: string;
  composer?: string;
}

export interface MetadataWriteResult {
  mode: "write";
  ok: true;
  filePath: string;
  format: "flac";
  changeCount: number;
  writtenFields: string[];
  metadata: FlacWrittenMetadata;
  verifiedAt: number;
}
