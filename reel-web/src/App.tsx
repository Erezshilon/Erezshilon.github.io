import { useState, useRef, useCallback, useEffect } from 'react'
import { loadFFmpeg, generateReel } from './utils/ffmpeg'
import { MediaFile, Progress, Style } from './types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function uid() { return crypto.randomUUID() }

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StylePicker({ value, onChange }: { value: Style; onChange: (s: Style) => void }) {
  const styles: { key: Style; label: string; desc: string }[] = [
    { key: 'cinematic', label: '🎬 Cinematic', desc: 'Soft tones · Ken Burns · Vignette' },
    { key: 'energetic', label: '⚡ Energetic', desc: 'Vivid colors · High contrast' },
    { key: 'minimal',   label: '✦ Minimal',   desc: 'Clean · No color grade' },
  ]
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {styles.map(s => (
        <button
          key={s.key}
          onClick={() => onChange(s.key)}
          title={s.desc}
          style={{
            flex: 1,
            padding: '10px 6px',
            borderRadius: 10,
            border: `2px solid ${value === s.key ? '#E1306C' : '#2a2a2a'}`,
            background: value === s.key ? 'rgba(225,48,108,0.12)' : '#111',
            color: value === s.key ? '#fff' : '#666',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s',
            textAlign: 'center',
          }}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}

function Toggle({ label, sub, checked, onChange }: {
  label: string; sub: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#111', borderRadius: 12, padding: '12px 16px',
        border: '1px solid #222', cursor: 'pointer',
      }}
      onClick={() => onChange(!checked)}
    >
      <div>
        <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{label}</div>
        <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{
        width: 44, height: 24, borderRadius: 12,
        background: checked ? '#E1306C' : '#333',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 3, left: checked ? 23 : 3,
          width: 18, height: 18, borderRadius: 9, background: '#fff',
          transition: 'left 0.2s',
        }} />
      </div>
    </div>
  )
}

function Thumbnail({ item, index, onRemove }: {
  item: MediaFile; index: number; onRemove: (id: string) => void
}) {
  return (
    <div style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', background: '#111' }}>
      {item.type === 'image'
        ? <img src={item.previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
        : <video src={item.previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
      }
      <div style={{
        position: 'absolute', top: 4, left: 6,
        background: 'rgba(0,0,0,0.7)', borderRadius: 4,
        padding: '1px 5px', fontSize: 11, fontWeight: 700, color: '#fff',
      }}>{index + 1}</div>
      {item.type === 'video' && (
        <div style={{
          position: 'absolute', bottom: 5, left: 5,
          background: 'rgba(0,0,0,0.65)', borderRadius: 4,
          padding: '2px 6px', fontSize: 11, color: '#fff',
        }}>▶</div>
      )}
      <button
        onClick={() => onRemove(item.id)}
        style={{
          position: 'absolute', top: 3, right: 3,
          background: 'rgba(0,0,0,0.65)', border: 'none',
          color: '#fff', borderRadius: '50%', width: 22, height: 22,
          fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >✕</button>
    </div>
  )
}

function Spinner() {
  return (
    <div style={{
      width: 48, height: 48, borderRadius: '50%',
      border: '3px solid #2a2a2a', borderTop: '3px solid #E1306C',
      animation: 'spin 0.75s linear infinite',
    }} />
  )
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

type View = 'pick' | 'processing' | 'preview'

export default function App() {
  const [view, setView]           = useState<View>('pick')
  const [items, setItems]         = useState<MediaFile[]>([])
  const [style, setStyle]         = useState<Style>('cinematic')
  const [collage, setCollage]     = useState(false)
  const [progress, setProgress]   = useState<Progress>({ step: 'Loading…', percent: 0 })
  const [outputUrl, setOutputUrl] = useState<string | null>(null)
  const [ready, setReady]         = useState(false)
  const [dragOver, setDragOver]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadFFmpeg().then(() => setReady(true))
  }, [])

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return
    const next: MediaFile[] = Array.from(files).map(file => ({
      id: uid(),
      file,
      type: file.type.startsWith('video') ? 'video' : 'image',
      previewUrl: URL.createObjectURL(file),
      duration: undefined,
    }))

    // Eagerly read video durations via a temporary element
    next.forEach(item => {
      if (item.type === 'video') {
        const el = document.createElement('video')
        el.src = item.previewUrl
        el.onloadedmetadata = () => { item.duration = el.duration }
      }
    })

    setItems(prev => [...prev, ...next])
  }, [])

  const remove = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const generate = useCallback(async () => {
    if (!ready || items.length === 0) return
    setView('processing')
    try {
      const url = await generateReel(items, style, collage, setProgress)
      setOutputUrl(url)
      setView('preview')
    } catch (e) {
      console.error(e)
      alert('Something went wrong — check the browser console.')
      setView('pick')
    }
  }, [ready, items, style, collage])

  const reset = () => { setItems([]); setOutputUrl(null); setView('pick') }

  // ---- Processing view ----
  if (view === 'processing') {
    return (
      <div style={centerFull}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={card}>
          <Spinner />
          <p style={{ fontSize: 20, fontWeight: 700, marginTop: 16 }}>Creating your reel…</p>
          <p style={{ color: '#888', fontSize: 14, textAlign: 'center', marginTop: 4 }}>{progress.step}</p>
          <div style={{ width: '100%', height: 6, background: '#222', borderRadius: 3, overflow: 'hidden', marginTop: 16 }}>
            <div style={{ width: `${progress.percent}%`, height: '100%', background: '#E1306C', borderRadius: 3, transition: 'width 0.4s' }} />
          </div>
          <p style={{ color: '#E1306C', fontWeight: 700, marginTop: 8 }}>{progress.percent}%</p>
        </div>
      </div>
    )
  }

  // ---- Preview view ----
  if (view === 'preview' && outputUrl) {
    return (
      <div style={page}>
        <h1 style={heading}>Your Reel</h1>
        <video src={outputUrl} controls autoPlay loop style={{ width: '100%', borderRadius: 12, background: '#111', maxHeight: '65vh' }} />
        <div style={{ display: 'flex', gap: 12 }}>
          <a href={outputUrl} download="reel.mp4" style={btnPrimary}>⬇ Download MP4</a>
          <button onClick={reset} style={btnOutline}>Make another</button>
        </div>
      </div>
    )
  }

  // ---- Pick view ----
  const collagePhotoPairs = collage
    ? items.filter(i => i.type === 'image').length
    : 0

  return (
    <div style={page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div>
        <h1 style={heading}>Reel Generator</h1>
        <p style={{ color: '#666', fontSize: 14, marginTop: 4 }}>
          {ready ? 'Select media, pick a style, generate.' : '⏳ Loading FFmpeg…'}
        </p>
      </div>

      {/* Style selector */}
      <StylePicker value={style} onChange={setStyle} />

      {/* Collage toggle */}
      <Toggle
        label="Collage mode"
        sub="Groups every 2 consecutive photos into a split-screen frame"
        checked={collage}
        onChange={setCollage}
      />

      {/* Drop zone */}
      <div
        style={{
          border: `2px dashed ${dragOver ? '#E1306C' : '#2a2a2a'}`,
          borderRadius: 14, padding: '40px 16px', textAlign: 'center',
          cursor: 'pointer', color: dragOver ? '#E1306C' : '#444',
          background: dragOver ? 'rgba(225,48,108,0.05)' : 'transparent',
          transition: 'all 0.15s',
        }}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
      >
        <div style={{ fontSize: 40, lineHeight: 1 }}>＋</div>
        <p style={{ marginTop: 8, fontWeight: 600 }}>Click or drag photos & videos</p>
        <p style={{ fontSize: 12, color: '#555', marginTop: 4 }}>JPG · PNG · MP4 · MOV — up to 20 files</p>
        <input ref={inputRef} type="file" accept="image/*,video/*" multiple style={{ display: 'none' }}
          onChange={e => addFiles(e.target.files)} />
      </div>

      {/* Media grid */}
      {items.length > 0 && (
        <>
          {collage && collagePhotoPairs > 0 && (
            <p style={{ color: '#888', fontSize: 13 }}>
              {Math.floor(collagePhotoPairs / 2)} collage pair{Math.floor(collagePhotoPairs / 2) > 1 ? 's' : ''} detected
            </p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {items.map((item, idx) => (
              <Thumbnail key={item.id} item={item} index={idx} onRemove={remove} />
            ))}
          </div>
          <button
            onClick={generate}
            disabled={!ready}
            style={ready ? btnPrimary : { ...btnPrimary, background: '#333', cursor: 'not-allowed', color: '#666' }}
          >
            {ready
              ? `✦ Generate Reel · ${items.length} clip${items.length > 1 ? 's' : ''}`
              : 'Loading FFmpeg…'}
          </button>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Styles (inline objects)
// ---------------------------------------------------------------------------

const page: React.CSSProperties = {
  maxWidth: 600,
  margin: '0 auto',
  padding: '32px 16px 80px',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
}

const heading: React.CSSProperties = {
  fontSize: 30,
  fontWeight: 800,
  letterSpacing: -0.5,
}

const centerFull: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  minHeight: '100vh',
}

const card: React.CSSProperties = {
  background: '#0d0d0d', border: '1px solid #1f1f1f',
  borderRadius: 20, padding: '40px 32px',
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  width: 300,
}

const btnPrimary: React.CSSProperties = {
  display: 'block', width: '100%', padding: '15px 24px',
  background: 'linear-gradient(135deg, #E1306C, #833AB4)',
  color: '#fff', border: 'none', borderRadius: 12,
  fontSize: 16, fontWeight: 700, cursor: 'pointer',
  textAlign: 'center', textDecoration: 'none',
}

const btnOutline: React.CSSProperties = {
  flex: '0 0 140px', padding: '15px 24px',
  background: 'transparent', color: '#E1306C',
  border: '1.5px solid #E1306C', borderRadius: 12,
  fontSize: 15, fontWeight: 700, cursor: 'pointer',
}
