import { MetadataMatchPipeline } from "../services/MetadataMatchPipeline";

async function main() {
  const file = process.argv[2];

  if (!file) {
    console.log("请输入音乐文件路径");
    console.log("示例: npm run test:local-pipeline -- D:\\Music\\test.m4a");
    return;
  }

  console.log("Local Metadata Pipeline Test");
  console.log("文件:", file);

  const pipeline = new MetadataMatchPipeline();
  const result = await pipeline.process(file);

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("测试失败:", error);
  process.exit(1);
});
