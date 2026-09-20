import { MetadataMatchService } from "../services/MetadataMatchService";

async function main() {
  console.log("Apple Music Metadata Match Test");

  const service = new MetadataMatchService();

  const result = service.match(
    {
      title: "Hotel California",
      artist: "Eagles",
      album: "Hotel California",
      year: 1976,
      duration: 391,
    },
    [
      {
        title: "Hotel California",
        artist: "Eagles",
        album: "Hotel California",
        releaseDate: "1976-12-08",
        durationInMillis: 391000,
      },
    ],
  );

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("测试失败:", error);
  process.exit(1);
});
