import { DrawingUtils, PoseLandmarker } from '@mediapipe/tasks-vision'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  actualFacing,
  cameraConstraints,
  describeCameraError,
  type Facing,
  isMirrored,
} from '../camera/camera.ts'
import { createRollingMean, fpsFromInterval } from '../core/stats.ts'
import { createLandmarker, type Delegate, type ModelSize } from '../pose/landmarker.ts'
import './bench.css'
import { type BenchResult, formatResultsTable, RESULT_COLUMNS, resultCells, maxFps } from './results.ts'

type Source = 'camera' | 'video'
type Phase = 'idle' | 'loading' | 'running'

interface Live {
  detectMs: number
  fps: number
  tracking: number
  visibility: number
}

const WINDOW = 90 // frames averaged for the numbers on screen
const UI_EVERY_MS = 250

function BenchPage() {
  const [model, setModel] = useState<ModelSize>('lite')
  const [delegate, setDelegate] = useState<Delegate>('GPU')
  const [source, setSource] = useState<Source>('camera')
  const [facing, setFacing] = useState<Facing>('user')
  const [file, setFile] = useState<File | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [message, setMessage] = useState('')
  const [mirrored, setMirrored] = useState(false)
  const [loadMs, setLoadMs] = useState(0)
  const [live, setLive] = useState<Live | null>(null)
  const [results, setResults] = useState<BenchResult[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  const stop = useCallback(() => {
    cleanupRef.current?.()
    cleanupRef.current = null
    setPhase('idle')
  }, [])

  const start = useCallback(async () => {
    stop()
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!video || !canvas || !ctx) return
    if (source === 'video' && !file) {
      setMessage('Choose a video file first.')
      return
    }

    let stopped = false
    let landmarker: PoseLandmarker | undefined
    let stream: MediaStream | undefined
    let videoUrl: string | undefined
    cleanupRef.current = () => {
      stopped = true
      landmarker?.close()
      stream?.getTracks().forEach((track) => track.stop())
      if (videoUrl) URL.revokeObjectURL(videoUrl)
      video.pause()
      video.srcObject = null
      video.removeAttribute('src')
      video.load()
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    setPhase('loading')
    setMessage('Loading model…')
    setLive(null)
    try {
      const startedAt = performance.now()
      const created = await createLandmarker(model, delegate)
      if (stopped) {
        created.close()
        return
      }
      landmarker = created
      setLoadMs(performance.now() - startedAt)

      if (source === 'camera') {
        const media = await navigator.mediaDevices.getUserMedia(cameraConstraints(facing))
        if (stopped) {
          media.getTracks().forEach((track) => track.stop())
          return
        }
        stream = media
        video.srcObject = media
        video.loop = false
        setMirrored(isMirrored(actualFacing(media.getVideoTracks()[0].getSettings())))
      } else if (file) {
        videoUrl = URL.createObjectURL(file)
        video.src = videoUrl
        video.loop = true
        setMirrored(false)
      }
      await video.play()
      if (stopped) return

      const drawing = new DrawingUtils(ctx)
      const detect = createRollingMean(WINDOW)
      const interval = createRollingMean(WINDOW)
      const tracking = createRollingMean(WINDOW)
      const visibility = createRollingMean(WINDOW)
      let lastVideoTime = -1
      let lastFrameAt = 0
      let lastUiAt = 0

      setPhase('running')
      setMessage('')
      const tick = () => {
        if (stopped) return
        if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime
          if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth
          if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight

          const now = performance.now()
          const result = created.detectForVideo(video, now)
          detect.add(performance.now() - now)
          if (lastFrameAt > 0) interval.add(now - lastFrameAt)
          lastFrameAt = now

          ctx.clearRect(0, 0, canvas.width, canvas.height)
          const pose = result.landmarks[0]
          tracking.add(pose ? 100 : 0)
          if (pose) {
            visibility.add(pose.reduce((sum, point) => sum + point.visibility, 0) / pose.length)
            const unit = canvas.width / 320
            drawing.drawConnectors(pose, PoseLandmarker.POSE_CONNECTIONS,{ color: '#22c55e', lineWidth: unit })
            drawing.drawLandmarks(pose, {
              color: (data) => ((data.from?.visibility ?? 1) < 0.5 ? '#ef4444' : '#f8fafc'),
              radius: unit * 1.2,
              lineWidth: 0,
            })
          }

          if (now - lastUiAt > UI_EVERY_MS) {
            lastUiAt = now
            setLive({
              detectMs: detect.mean,
              fps: fpsFromInterval(interval.mean),
              tracking: tracking.mean,
              visibility: visibility.mean,
            })
          }
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    } catch (err) {
      cleanupRef.current?.()
      cleanupRef.current = null
      setPhase('idle')
      setMessage(
        err instanceof DOMException
          ? describeCameraError(err)
          : `Could not start: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }, [stop, source, file, model, delegate, facing])

  useEffect(() => () => cleanupRef.current?.(), [])

  const saveResult = () => {
    if (!live) return
    setResults((rows) => [
      ...rows,
      {
        model,
        delegate,
        source: source === 'camera' ? `camera (${facing})` : 'video file',
        loadMs,
        detectMs: live.detectMs,
        fps: live.fps,
        tracking: live.tracking,
        visibility: live.visibility,
      },
    ])
  }

  const copyResults = async () => {
    try {
      await navigator.clipboard.writeText(formatResultsTable(results))
      setMessage('Table copied.')
    } catch {
      setMessage('Could not copy. Select the table and copy it by hand.')
    }
  }

  const busy = phase !== 'idle'

  return (
    <main className="bench">
      <h1>Pose test</h1>
      <p className="note">
        Runs MediaPipe Pose Landmarker on this device. Pick a model, start, wait for the numbers to
        settle, then tap Save result. Repeat for each model size.
      </p>

      <div className="stage">
        <video ref={videoRef} className={mirrored ? 'camera mirrored' : 'camera'} muted playsInline />
        <canvas ref={canvasRef} className={mirrored ? 'overlay mirrored' : 'overlay'} />
      </div>

      <div className="controls">
        <label className="field">
          Model
          <select value={model} disabled={busy} onChange={(e) => setModel(e.target.value as ModelSize)}>
            <option value="lite">lite (5.5 MB)</option>
            <option value="full">full (9 MB)</option>
            <option value="heavy">heavy (29 MB, from Google)</option>
          </select>
        </label>
        <label className="field">
          Delegate
          <select value={delegate} disabled={busy} onChange={(e) => setDelegate(e.target.value as Delegate)}>
            <option value="GPU">GPU</option>
            <option value="CPU">CPU</option>
          </select>
        </label>
        <label className="field">
          Source
          <select value={source} disabled={busy} onChange={(e) => setSource(e.target.value as Source)}>
            <option value="camera">Live camera</option>
            <option value="video">Video file</option>
          </select>
        </label>
        {source === 'camera' ? (
          <label className="field">
            Camera
            <select value={facing} disabled={busy} onChange={(e) => setFacing(e.target.value as Facing)}>
              <option value="user">Front</option>
              <option value="environment">Back</option>
            </select>
          </label>
        ) : (
          <label className="field">
            Video
            <input
              type="file"
              accept="video/*"
              disabled={busy}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        )}
      </div>

      <div className="actions">
        {busy ? (
          <button type="button" className="btn primary" onClick={stop}>
            Stop
          </button>
        ) : (
          <button type="button" className="btn primary" onClick={start}>
            Start
          </button>
        )}
        <button type="button" className="btn outline" disabled={phase !== 'running' || !live} onClick={saveResult}>
          Save result
        </button>
      </div>

      {message && (
        <p className="note" role="status">
          {message}
        </p>
      )}

      <dl className="stats">
        <div>
          <dt>Detect time</dt>
          <dd>{live ? `${live.detectMs.toFixed(1)} ms` : '–'}</dd>
        </div>
        <div>
          <dt>Max FPS (1000 / detect time)</dt>
          <dd>{live ? maxFps(live.detectMs).toFixed(0) : '–'}</dd>
        </div>
        <div>
          <dt>Live FPS (capped by the camera)</dt>
          <dd>{live ? live.fps.toFixed(0) : '–'}</dd>
        </div>
        <div>
          <dt>Tracking (frames with a pose)</dt>
          <dd>{live ? `${live.tracking.toFixed(0)}%` : '–'}</dd>
        </div>
        <div>
          <dt>Point visibility (0 to 1)</dt>
          <dd>{live ? live.visibility.toFixed(2) : '–'}</dd>
        </div>
        <div>
          <dt>Model load time</dt>
          <dd>{loadMs ? `${loadMs.toFixed(0)} ms` : '–'}</dd>
        </div>
      </dl>

      {results.length > 0 && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {RESULT_COLUMNS.map((name) => (
                    <th key={name}>{name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((row, i) => (
                  <tr key={i}>
                    {resultCells(row).map((cell, j) => (
                      <td key={j}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="actions">
            <button type="button" className="btn outline" onClick={copyResults}>
              Copy table
            </button>
            <button type="button" className="btn outline" onClick={() => setResults([])}>
              Clear
            </button>
          </div>
        </>
      )}

      <a className="note" href="/">
        Back to the app
      </a>
    </main>
  )
}

export default BenchPage
