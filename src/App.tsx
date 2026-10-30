import { useCallback, useEffect, useRef, useState } from 'react'
import {
  actualFacing,
  CAMERA_STOPPED_MESSAGE,
  cameraConstraints,
  describeCameraError,
  type Facing,
  facingLabel,
  isCameraSupported,
  isMirrored,
  otherFacing,
  UNSUPPORTED_MESSAGE,
} from './camera/camera.ts'

type Status = 'idle' | 'starting' | 'live' | 'error'

function App() {
  const [status, setStatus] = useState<Status>('idle')
  const [facing, setFacing] = useState<Facing>('user')
  const [error, setError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const startCamera = useCallback(
    async (requested: Facing) => {
      stopCamera()
      if (!isCameraSupported()) {
        setError(UNSUPPORTED_MESSAGE)
        setStatus('error')
        return
      }
      setStatus('starting')
      try {
        const stream = await navigator.mediaDevices.getUserMedia(cameraConstraints(requested))
        const track = stream.getVideoTracks()[0]
        track.addEventListener('ended', () => {
          if (streamRef.current !== stream) return
          stopCamera()
          setError(CAMERA_STOPPED_MESSAGE)
          setStatus('error')
        })
        streamRef.current = stream
        setFacing(actualFacing(track.getSettings()))
        setStatus('live')
      } catch (err) {
        setError(describeCameraError(err))
        setStatus('error')
      }
    },
    [stopCamera],
  )

  useEffect(() => {
    const video = videoRef.current
    if (status === 'live' && video && streamRef.current) {
      video.srcObject = streamRef.current
      video.play().catch(() => undefined)
    }
  }, [status])

  useEffect(() => stopCamera, [stopCamera])

  const live = status === 'live'

  return (
    <main className="app">
      <video
        ref={videoRef}
        className={isMirrored(facing) ? 'camera mirrored' : 'camera'}
        hidden={!live}
        autoPlay
        muted
        playsInline
      />

      {live ? (
        <>
          <div className="chip" role="status">
            {facingLabel(facing)}
          </div>
          <div className="bar">
            <button type="button" className="btn secondary" onClick={() => startCamera(otherFacing(facing))}>
              Switch camera
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                stopCamera()
                setStatus('idle')
              }}
            >
              Stop
            </button>
          </div>
        </>
      ) : (
        <section className="panel">
          <img className="logo" src="/favicon.svg" alt="" width="96" height="96" />
          <h1>Gym Form Coach</h1>
          <p className="lead">
            Your phone watches your form and tells you how to fix it. Everything runs on this
            device and no video leaves it.
          </p>
          {status === 'error' && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            className="btn primary"
            disabled={status === 'starting'}
            onClick={() => startCamera(facing)}
          >
            {status === 'starting' ? 'Starting camera…' : status === 'error' ? 'Try again' : 'Tap to start'}
          </button>
          <p className="hint">Starts with the front camera. You can switch to the back camera once it is on.</p>
        </section>
      )}
    </main>
  )
}

export default App
