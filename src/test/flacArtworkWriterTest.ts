import assert from "node:assert/strict";
import {
  expandAppleArtworkUrl,
  inspectArtworkImage,
  type DownloadedArtwork,
} from "../services/artwork/ArtworkDownloader";
import {
  applyFrontCoverPicture,
  buildFlacPictureBlock,
  parseFlacPictureBlock,
} from "../services/flac/FlacPictureBlock";
import type { FlacMetadataBlock } from "../services/flac/FlacVorbisComment";

function createPng(width: number, height: number): Buffer {
  const data = Buffer.alloc(33);
  Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]).copy(data, 0);
  data.writeUInt32BE(13, 8);
  data.write("IHDR", 12, "ascii");
  data.writeUInt32BE(width, 16);
  data.writeUInt32BE(height, 20);
  data[24] = 8;
  data[25] = 6;
  return data;
}

function createJpeg(width: number, height: number): Buffer {
  const data = Buffer.alloc(21);
  data[0] = 0xff;
  data[1] = 0xd8;
  data[2] = 0xff;
  data[3] = 0xc0;
  data.writeUInt16BE(17, 4);
  data[6] = 8;
  data.writeUInt16BE(height, 7);
  data.writeUInt16BE(width, 9);
  data[11] = 3;
  return data;
}

function run() {
  assert.equal(
    expandAppleArtworkUrl(
      "https://example.com/cover/{w}x{h}bb.jpg",
    ),
    "https://example.com/cover/1200x1200bb.jpg",
  );

  const png = inspectArtworkImage(createPng(1200, 900));
  assert.deepEqual(png, {
    mime: "image/png",
    width: 1200,
    height: 900,
    depth: 32,
    colors: 0,
  });

  const jpeg = inspectArtworkImage(createJpeg(800, 800));
  assert.deepEqual(jpeg, {
    mime: "image/jpeg",
    width: 800,
    height: 800,
    depth: 24,
    colors: 0,
  });

  const oldFront = buildFlacPictureBlock({
    pictureType: 3,
    mime: "image/jpeg",
    description: "old front",
    width: 300,
    height: 300,
    depth: 24,
    colors: 0,
    data: Buffer.from([1, 2, 3]),
  });
  const backCover = buildFlacPictureBlock({
    pictureType: 4,
    mime: "image/png",
    description: "back",
    width: 300,
    height: 300,
    depth: 32,
    colors: 0,
    data: Buffer.from([4, 5, 6]),
  });

  const artwork: DownloadedArtwork = {
    sourceUrl: "https://example.com/{w}x{h}bb.jpg",
    resolvedUrl: "https://example.com/1200x1200bb.jpg",
    mime: "image/jpeg",
    data: Buffer.from([9, 8, 7, 6]),
    width: 1200,
    height: 1200,
    depth: 24,
    colors: 0,
    sha256: "test",
  };

  const blocks: FlacMetadataBlock[] = [
    { type: 0, data: Buffer.alloc(34) },
    { type: 4, data: Buffer.alloc(8) },
    { type: 6, data: oldFront },
    { type: 6, data: backCover },
    { type: 1, data: Buffer.alloc(16) },
  ];

  const updated = applyFrontCoverPicture(blocks, artwork);
  const pictures = updated
    .filter((block) => block.type === 6)
    .map((block) => parseFlacPictureBlock(block.data));

  assert.equal(pictures.length, 2);
  assert.equal(
    pictures.filter((picture) => picture.pictureType === 3).length,
    1,
    "应只保留一个front cover",
  );

  const front = pictures.find(
    (picture) => picture.pictureType === 3,
  );
  assert.ok(front);
  assert.equal(front.mime, "image/jpeg");
  assert.equal(front.width, 1200);
  assert.equal(front.height, 1200);
  assert.ok(front.data.equals(artwork.data));

  const back = pictures.find(
    (picture) => picture.pictureType === 4,
  );
  assert.ok(back, "back cover应被保留");
  assert.ok(back.data.equals(Buffer.from([4, 5, 6])));

  console.log("FLAC artwork writer test passed");
}

run();
