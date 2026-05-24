export type Style = 'cinematic' | 'energetic' | 'minimal'

export interface MediaFile {
  id: string
  file: File
  type: 'image' | 'video'
  previewUrl: string
  duration?: number
}

export interface Progress {
  step: string
  percent: number
}
