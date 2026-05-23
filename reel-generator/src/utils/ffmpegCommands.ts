import * as FileSystem from 'expo-file-system';
import { FFmpegKit, FFmpegKitConfig, ReturnCode } from 'ffmpeg-kit-react-native';
import { MediaItem, ReelConfig } from '../types';

const CACHE_DIR = `${FileSystem.cacheDirectory}reel-generator/`;

const DEFAULT_CONFIG: ReelConfig = {
  clipDurationForImages: 3,
  maxClipDuration: 5,
  outputWidth: 1080,
  outputHeight: 1920,
  transitionDuration: 0.5,
};

async function ensureCacheDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

async function clearCacheDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (info.exists) {
    await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
  }
  await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
}

// Scale/pad a single media item to 9:16 format
function buildScaleFilter(width: number, height: number): string {
  const w = 1080;
  const h = 1920;
  return (
    `scale=${w}:${h}:force_original_aspect_ratio=decrease,` +
    `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black,` +
    `setsar=1`
  );
}

async function processImage(
  item: MediaItem,
  outputPath: string,
  config: ReelConfig
): Promise<boolean> {
  const filter = buildScaleFilter(item.width, item.height);
  const cmd = [
    '-loop 1',
    `-i "${item.uri}"`,
    `-vf "${filter}"`,
    `-c:v libx264`,
    `-t ${config.clipDurationForImages}`,
    `-pix_fmt yuv420p`,
    `-r 30`,
    `-y "${outputPath}"`,
  ].join(' ');

  const session = await FFmpegKit.execute(cmd);
  const returnCode = await session.getReturnCode();
  return ReturnCode.isSuccess(returnCode);
}

async function processVideo(
  item: MediaItem,
  outputPath: string,
  config: ReelConfig
): Promise<boolean> {
  const filter = buildScaleFilter(item.width, item.height);
  const duration = Math.min(item.duration ?? config.maxClipDuration, config.maxClipDuration);
  const cmd = [
    `-i "${item.uri}"`,
    `-vf "${filter}"`,
    `-c:v libx264`,
    `-t ${duration}`,
    `-pix_fmt yuv420p`,
    `-r 30`,
    `-an`,
    `-y "${outputPath}"`,
  ].join(' ');

  const session = await FFmpegKit.execute(cmd);
  const returnCode = await session.getReturnCode();
  return ReturnCode.isSuccess(returnCode);
}

async function concatenateClips(
  clipPaths: string[],
  outputPath: string
): Promise<boolean> {
  const listPath = `${CACHE_DIR}concat_list.txt`;
  const listContent = clipPaths.map((p) => `file '${p}'`).join('\n');
  await FileSystem.writeAsStringAsync(listPath, listContent);

  const cmd = [
    `-f concat`,
    `-safe 0`,
    `-i "${listPath}"`,
    `-c copy`,
    `-y "${outputPath}"`,
  ].join(' ');

  const session = await FFmpegKit.execute(cmd);
  const returnCode = await session.getReturnCode();
  return ReturnCode.isSuccess(returnCode);
}

export interface ProcessingProgress {
  step: string;
  current: number;
  total: number;
}

export async function generateReel(
  items: MediaItem[],
  onProgress?: (progress: ProcessingProgress) => void,
  config: ReelConfig = DEFAULT_CONFIG
): Promise<string | null> {
  await clearCacheDir();

  FFmpegKitConfig.enableLogCallback(() => {}); // suppress logs

  const clipPaths: string[] = [];
  const total = items.length;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const outputPath = `${CACHE_DIR}clip_${i}.mp4`;

    onProgress?.({
      step: `מעבד פריט ${i + 1} מתוך ${total}...`,
      current: i,
      total,
    });

    let success = false;
    if (item.type === 'image') {
      success = await processImage(item, outputPath, config);
    } else {
      success = await processVideo(item, outputPath, config);
    }

    if (!success) return null;
    clipPaths.push(outputPath);
  }

  onProgress?.({
    step: 'מחבר קליפים לריל...',
    current: total,
    total,
  });

  const finalOutput = `${CACHE_DIR}reel_output.mp4`;
  const success = await concatenateClips(clipPaths, finalOutput);

  if (!success) return null;
  return finalOutput;
}
