import { AppleMusicCatalogProvider } from "../providers/AppleMusicCatalogProvider";

async function main() {
  console.log("Apple Music Catalog Test");

  const provider = new AppleMusicCatalogProvider();

  const result = await provider.searchTrack("Hotel California", "Eagles");

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("Apple Music Catalog测试失败:", error);
  process.exit(1);
});
