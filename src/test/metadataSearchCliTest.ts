import { MetadataSearchService } from "../services/MetadataSearchService";
import { parseFileMetadata } from "../services/AudioMetadataReader";
import fs from "node:fs";

function printResult(result: any) {
  console.log("\nApple Music Metadata Search\n");

  if (result.match) {
    console.log("最佳匹配:");
    console.log(JSON.stringify(result.match, null, 2));
  } else {
    console.log("没有找到匹配结果");
  }

  console.log("\n候选数量:", result.candidates.length);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
使用方式:

文件检索:
 npm run test:metadata-search -- "D:\\Music\\song.flac"

歌曲检索:
 npm run test:metadata-search -- "歌曲名" "歌手"
`);
    return;
  }

  const service = new MetadataSearchService();

  if (fs.existsSync(args[0])) {
    const metadata = await parseFileMetadata(args[0]);
    console.log("文件 Metadata:");
    console.log(JSON.stringify(metadata, null, 2));
    printResult(await service.search(metadata));
    return;
  }

  const title = args[0];
  const artist = args[1];

  printResult(await service.searchByName(title, artist));
}

main().catch((error) => {
  console.error("Metadata Search失败:", error);
  process.exit(1);
});
