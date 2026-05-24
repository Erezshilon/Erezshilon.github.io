/**
 * Finds the most energetic (loudest/busiest) segment in a video's audio track.
 * Returns the start time in seconds for the best clip window.
 */
export async function findHighlightStart(
  file: File,
  clipDuration: number
): Promise<number> {
  if (file.size > 200_000_000) return 0 // skip analysis for very large files

  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!AC) return 0

  const ctx = new AC()
  try {
    let audioBuf: AudioBuffer
    try {
      audioBuf = await ctx.decodeAudioData(await file.arrayBuffer())
    } catch {
      return 0 // no audio track or unsupported codec
    }

    const data = audioBuf.getChannelData(0)
    const sr = audioBuf.sampleRate
    const segLen = Math.floor(clipDuration * sr)
    const step = Math.floor(sr * 0.1) // evaluate every 100ms
    const maxStart = Math.max(0, audioBuf.duration - clipDuration)

    let bestT = 0
    let bestEnergy = -Infinity

    for (let i = 0; i + segLen <= data.length; i += step) {
      let energy = 0
      for (let j = i; j < i + segLen; j++) energy += data[j] * data[j]
      if (energy > bestEnergy) {
        bestEnergy = energy
        bestT = i / sr
      }
    }

    return Math.min(bestT, maxStart)
  } finally {
    ctx.close()
  }
}
