import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

const ffmpeg = new FFmpeg()
let loaded = false

export async function loadFFmpeg(onLog?: (msg: string) => void) {
  if (loaded) return
  if (onLog) ffmpeg.on('log', ({ message }) => onLog(message))

  const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
  await ffmpeg.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
  })
  loaded = true
}

export interface MediaFile {
  id: string
  file: File
  type: 'image' | 'video'
  previewUrl: string
  duration?: number // seconds (videos only)
}

export interface Progress {
  step: string
  percent: number
}

const REEL_W = 1080
const REEL_H = 1920
const SCALE_FILTER = `scale=${REEL_W}:${REEL_H}:force_original_aspect_ratio=decrease,pad=${REEL_W}:${REEL_H}:(ow-iw)/2:(oh-ih)/2:black,setsar=1`

export async function generateReel(
  items: MediaFile[],
  onProgress: (p: Progress) => void
): Promise<string> {
  const total = items.length
  const clips: string[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const inputName = `input_${i}${item.type === 'image' ? '.jpg' : '.mp4'}`
    const outputName = `clip_${i}.mp4`

    onProgress({ step: `Processing ${i + 1} of ${total}…`, percent: Math.round((i / (total + 1)) * 100) })

    await ffmpeg.writeFile(inputName, await fetchFile(item.file))

    if (item.type === 'image') {
      await ffmpeg.exec([
        '-loop', '1', '-i', inputName,
        '-vf', SCALE_FILTER,
        '-c:v', 'libx264', '-t', '3', '-pix_fmt', 'yuv420p', '-r', '30',
        '-y', outputName,
      ])
    } else {
      const duration = String(Math.min(item.duration ?? 5, 5))
      await ffmpeg.exec([
        '-i', inputName,
        '-vf', SCALE_FILTER,
        '-c:v', 'libx264', '-t', duration, '-pix_fmt', 'yuv420p', '-r', '30', '-an',
        '-y', outputName,
      ])
    }

    clips.push(outputName)
  }

  onProgress({ step: 'Stitching clips together…', percent: Math.round((total / (total + 1)) * 100) })

  // Write concat list
  const list = clips.map(c => `file '${c}'`).join('\n')
  await ffmpeg.writeFile('list.txt', list)

  await ffmpeg.exec([
    '-f', 'concat', '-safe', '0', '-i', 'list.txt',
    '-c', 'copy', '-y', 'reel.mp4',
  ])

  const data = await ffmpeg.readFile('reel.mp4') as Uint8Array
  return URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }))
}
