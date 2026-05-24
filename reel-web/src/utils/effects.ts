import { Style } from '../types'

// ---------------------------------------------------------------------------
// Ken Burns presets
// Each preset is applied to a 1620×2880 source (1.5× the 1080×1920 output),
// zoompan outputs exactly 1080×1920.
// Centering formula: x = iw/2 - ow/(zoom*2), y = ih/2 - oh/(zoom*2)
// Upper focus (faces): y = ih/3 - oh/(zoom*3)
// ---------------------------------------------------------------------------

interface KBPreset {
  zExpr: string
  xExpr: string
  yExpr: string
}

const KB_PRESETS: KBPreset[] = [
  // Zoom in, upper focus (toward faces)
  {
    zExpr: "min(zoom+0.00333,1.3)",
    xExpr: "iw/2-(ow/(zoom*2))",
    yExpr: "ih/3-(oh/(zoom*3))",
  },
  // Zoom out, center
  {
    zExpr: "if(lte(zoom,1),1.3,max(1,zoom-0.00333))",
    xExpr: "iw/2-(ow/(zoom*2))",
    yExpr: "ih/2-(oh/(zoom*2))",
  },
  // Slow zoom in, center
  {
    zExpr: "min(zoom+0.00200,1.2)",
    xExpr: "iw/2-(ow/(zoom*2))",
    yExpr: "ih/2-(oh/(zoom*2))",
  },
  // Zoom out, upper focus
  {
    zExpr: "if(lte(zoom,1),1.25,max(1,zoom-0.00278))",
    xExpr: "iw/2-(ow/(zoom*2))",
    yExpr: "ih/3-(oh/(zoom*3))",
  },
]

let kbIdx = 0
export function nextKenBurns(): KBPreset { return KB_PRESETS[kbIdx++ % KB_PRESETS.length] }
export function resetKenBurns(): void { kbIdx = 0 }

// ---------------------------------------------------------------------------
// Filter builders
// ---------------------------------------------------------------------------

export function buildPhotoVF(style: Style, clipDuration: number): string {
  const kb = nextKenBurns()
  const frames = Math.round(clipDuration * 30)
  const fade = `fade=t=in:st=0:d=0.4,fade=t=out:st=${(clipDuration - 0.4).toFixed(2)}:d=0.4`

  const parts = [
    // Fill the output frame without black bars, crop-centered
    'scale=1080:1920:force_original_aspect_ratio=increase',
    "crop=w=1080:h=1920:x='(iw-1080)/2':y='(ih-1920)/2'",
    // Scale up 1.5× to give zoompan room to move
    'scale=1620:2880',
    // Ken Burns
    `zoompan=z='${kb.zExpr}':x='${kb.xExpr}':y='${kb.yExpr}':d=${frames}:s=1080x1920`,
    'setsar=1',
    colorGrade(style),
    fade,
  ]
  return parts.filter(Boolean).join(',')
}

export function buildVideoVF(style: Style, clipDuration: number): string {
  const fade = `fade=t=in:st=0:d=0.4,fade=t=out:st=${(clipDuration - 0.4).toFixed(2)}:d=0.4`
  const parts = [
    'scale=1080:1920:force_original_aspect_ratio=decrease',
    'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
    'setsar=1',
    colorGrade(style),
    fade,
  ]
  return parts.filter(Boolean).join(',')
}

// Returns [filterComplex, outputLabel] for a 2-photo collage
export function buildCollageFilter(style: Style, clipDuration: number): [string, string] {
  const fade = `fade=t=in:st=0:d=0.4,fade=t=out:st=${(clipDuration - 0.4).toFixed(2)}:d=0.4`
  const grade = colorGrade(style)

  // Each photo fills a 540×1920 column; photos are fill-cropped (no black bars)
  const halfScale =
    "scale=540:1920:force_original_aspect_ratio=increase," +
    "crop=w=540:h=1920:x='(iw-540)/2':y='(ih-1920)/2'," +
    "setsar=1"

  const hstack = `[v0][v1]hstack=inputs=2${grade || fade ? '' : '[out]'}`
  const postStack = [grade, fade].filter(Boolean).join(',')

  const filterComplex = [
    `[0:v]${halfScale}[v0]`,
    `[1:v]${halfScale}[v1]`,
    postStack
      ? `${hstack}[stacked];[stacked]${postStack}[out]`
      : `${hstack}[out]`,
  ].join(';')

  return [filterComplex, '[out]']
}

function colorGrade(style: Style): string {
  switch (style) {
    case 'cinematic': return 'eq=saturation=0.82:contrast=1.12:gamma=1.05,vignette=angle=PI/4'
    case 'energetic': return 'eq=saturation=1.5:contrast=1.2:brightness=0.02'
    case 'minimal':   return ''
  }
}
