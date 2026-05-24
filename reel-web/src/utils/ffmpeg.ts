import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { MediaFile, Progress, Style } from '../types'
import { buildPhotoVF, buildVideoVF, buildCollageFilter, resetKenBurns } from './effects'
import { findHighlightStart } from './audioAnalysis'

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

const PHOTO_DURATION = 3   // seconds each photo is shown
const VIDEO_MAX_CLIP = 5   // max seconds per video clip

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function generateReel(
  items: MediaFile[],
  style: Style,
  collageMode: boolean,
  onProgress: (p: Progress) => void
): Promise<string> {
  resetKenBurns()

  const groups = groupItems(items, collageMode)
  const clipNames: string[] = []

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]
    const out = `clip_${i}.mp4`

    onProgress({
      step: `Processing clip ${i + 1} of ${groups.length}…`,
      percent: Math.round((i / (groups.length + 1)) * 100),
    })

    if (group.length === 2) {
      await processCollage(group, out, style)
    } else {
      const item = group[0]
      if (item.type === 'image') await processPhoto(item, out, style)
      else await processVideo(item, out, style)
    }

    clipNames.push(out)
  }

  onProgress({ step: 'Stitching clips together…', percent: 95 })

  const list = clipNames.map(n => `file '${n}'`).join('\n')
  await ffmpeg.writeFile('list.txt', list)
  await ffmpeg.exec([
    '-f', 'concat', '-safe', '0', '-i', 'list.txt',
    '-c', 'copy', '-y', 'reel.mp4',
  ])

  const data = await ffmpeg.readFile('reel.mp4') as Uint8Array
  return URL.createObjectURL(new Blob([data.buffer as ArrayBuffer], { type: 'video/mp4' }))
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

function groupItems(items: MediaFile[], collageMode: boolean): MediaFile[][] {
  const groups: MediaFile[][] = []
  let i = 0
  while (i < items.length) {
    const item = items[i]
    if (
      collageMode &&
      item.type === 'image' &&
      i + 1 < items.length &&
      items[i + 1].type === 'image'
    ) {
      groups.push([item, items[i + 1]])
      i += 2
    } else {
      groups.push([item])
      i++
    }
  }
  return groups
}

// ---------------------------------------------------------------------------
// Processors
// ---------------------------------------------------------------------------

async function processPhoto(item: MediaFile, out: string, style: Style) {
  const name = `in_${out}.jpg`
  await ffmpeg.writeFile(name, await fetchFile(item.file))

  await ffmpeg.exec([
    '-loop', '1', '-i', name,
    '-vf', buildPhotoVF(style, PHOTO_DURATION),
    '-c:v', 'libx264', '-crf', '20', '-preset', 'fast',
    '-t', String(PHOTO_DURATION), '-pix_fmt', 'yuv420p', '-r', '30',
    '-y', out,
  ])
}

async function processVideo(item: MediaFile, out: string, style: Style) {
  const name = `in_${out}.mp4`
  await ffmpeg.writeFile(name, await fetchFile(item.file))

  const clipDur = Math.min(item.duration ?? VIDEO_MAX_CLIP, VIDEO_MAX_CLIP)
  const startT  = await findHighlightStart(item.file, clipDur)

  await ffmpeg.exec([
    '-ss', String(startT), '-i', name,
    '-vf', buildVideoVF(style, clipDur),
    '-c:v', 'libx264', '-crf', '20', '-preset', 'fast',
    '-t', String(clipDur), '-pix_fmt', 'yuv420p', '-r', '30', '-an',
    '-y', out,
  ])
}

async function processCollage(items: MediaFile[], out: string, style: Style) {
  await ffmpeg.writeFile(`col0_${out}.jpg`, await fetchFile(items[0].file))
  await ffmpeg.writeFile(`col1_${out}.jpg`, await fetchFile(items[1].file))

  const [filterComplex, mapLabel] = buildCollageFilter(style, PHOTO_DURATION)

  await ffmpeg.exec([
    '-loop', '1', '-i', `col0_${out}.jpg`,
    '-loop', '1', '-i', `col1_${out}.jpg`,
    '-filter_complex', filterComplex,
    '-map', mapLabel,
    '-c:v', 'libx264', '-crf', '20', '-preset', 'fast',
    '-t', String(PHOTO_DURATION), '-pix_fmt', 'yuv420p', '-r', '30',
    '-y', out,
  ])
}
