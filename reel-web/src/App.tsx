import { useState, useRef, useCallback, useEffect } from 'react'
import { loadFFmpeg, generateReel, MediaFile, Progress } from './utils/ffmpeg'
import { s } from './styles'

type View = 'pick' | 'processing' | 'preview'

export default function App() {
  const [view, setView] = useState<View>('pick')
  const [items, setItems] = useState<MediaFile[]>([])
  const [progress, setProgress] = useState<Progress>({ step: 'Loading FFmpeg…', percent: 0 })
  const [outputUrl, setOutputUrl] = useState<string | null>(null)
  const [ffmpegReady, setFfmpegReady] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadFFmpeg().then(() => setFfmpegReady(true))
  }, [])

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return
    const next: MediaFile[] = []
    for (const file of Array.from(files)) {
      const type = file.type.startsWith('video') ? 'video' : 'image'
      next.push({
        id: crypto.randomUUID(),
        file,
        type,
        previewUrl: URL.createObjectURL(file),
      })
    }
    setItems(prev => [...prev, ...next])
  }, [])

  const remove = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const generate = useCallback(async () => {
    if (!ffmpegReady || items.length === 0) return
    setView('processing')
    try {
      const url = await generateReel(items, setProgress)
      setOutputUrl(url)
      setView('preview')
    } catch (e) {
      console.error(e)
      alert('Something went wrong — check the console.')
      setView('pick')
    }
  }, [ffmpegReady, items])

  const reset = () => {
    setItems([])
    setOutputUrl(null)
    setView('pick')
  }

  if (view === 'processing') {
    return (
      <div style={s.center}>
        <div style={s.card}>
          <div style={s.spinner} />
          <p style={s.title}>Creating your reel…</p>
          <p style={s.sub}>{progress.step}</p>
          <div style={s.barTrack}>
            <div style={{ ...s.barFill, width: `${progress.percent}%` }} />
          </div>
          <p style={s.pct}>{progress.percent}%</p>
        </div>
      </div>
    )
  }

  if (view === 'preview' && outputUrl) {
    return (
      <div style={s.page}>
        <h1 style={s.heading}>Your Reel is Ready</h1>
        <video
          src={outputUrl}
          controls
          autoPlay
          loop
          style={s.video}
        />
        <div style={s.row}>
          <a href={outputUrl} download="reel.mp4" style={s.btnPrimary}>
            Download MP4
          </a>
          <button onClick={reset} style={s.btnSecondary}>
            Make another
          </button>
        </div>
      </div>
    )
  }

  // Pick view
  return (
    <div style={s.page}>
      <h1 style={s.heading}>Reel Generator</h1>
      <p style={s.sub}>{ffmpegReady ? 'Select photos & videos, then generate.' : 'Loading FFmpeg…'}</p>

      <div
        style={{ ...s.dropZone, ...(dragOver ? s.dropZoneActive : {}) }}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
      >
        <span style={s.dropIcon}>＋</span>
        <p>Click or drag photos & videos here</p>
        <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>PNG, JPG, MP4, MOV</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          style={{ display: 'none' }}
          onChange={e => addFiles(e.target.files)}
        />
      </div>

      {items.length > 0 && (
        <>
          <div style={s.grid}>
            {items.map((item, idx) => (
              <div key={item.id} style={s.thumb}>
                {item.type === 'image' ? (
                  <img src={item.previewUrl} style={s.thumbMedia} alt="" />
                ) : (
                  <video src={item.previewUrl} style={s.thumbMedia} muted />
                )}
                <span style={s.badge}>{idx + 1}</span>
                {item.type === 'video' && <span style={s.vidBadge}>▶</span>}
                <button style={s.removeBtn} onClick={() => remove(item.id)}>✕</button>
              </div>
            ))}
          </div>

          <button
            style={ffmpegReady ? s.btnPrimary : s.btnDisabled}
            disabled={!ffmpegReady}
            onClick={generate}
          >
            {ffmpegReady ? `Generate Reel (${items.length} clips)` : 'Loading FFmpeg…'}
          </button>
        </>
      )}
    </div>
  )
}
