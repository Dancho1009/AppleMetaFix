import { AudioMetadataReader } from '../services/AudioMetadataReader';

async function main() {
  const file = process.argv[2];

  if (!file) {
    throw new Error('请提供音频文件路径');
  }

  const reader = new AudioMetadataReader();
  const result = await reader.read(file);

  console.log(JSON.stringify({
    file,
    metadata: result,
  }, null, 2));
}

main().catch(console.error);
