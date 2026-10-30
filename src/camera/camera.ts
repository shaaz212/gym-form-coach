export type Facing = 'user' | 'environment'

export const UNSUPPORTED_MESSAGE =
  'This page cannot use the camera. Open it from a secure (https) link in Safari or Chrome.'

export const CAMERA_STOPPED_MESSAGE = 'The camera stopped. Tap Try again to restart it.'

export function isCameraSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function'
}

export function cameraConstraints(facing: Facing): MediaStreamConstraints {
  return {
    audio: false,
    video: {
      facingMode: { ideal: facing },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  }
}

export const otherFacing = (facing: Facing): Facing => (facing === 'user' ? 'environment' : 'user')

// The front camera is shown like a mirror, so you can line yourself up on screen.
export const isMirrored = (facing: Facing): boolean => facing === 'user'

export const facingLabel = (facing: Facing): string =>
  facing === 'user' ? 'Front camera' : 'Back camera'

// A laptop webcam reports no facingMode: treat it as facing the user.
export const actualFacing = (settings: MediaTrackSettings): Facing =>
  settings.facingMode === 'environment' ? 'environment' : 'user'

export function describeCameraError(err: unknown): string {
  const name = typeof err === 'object' && err !== null && 'name' in err ? String(err.name) : ''
  switch (name) {
    case 'NotAllowedError':
      return 'Camera access is blocked. Allow the camera for this page in your browser settings, then tap Try again.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera was found on this device.'
    case 'NotReadableError':
    case 'AbortError':
      return 'The camera is busy. Close any other app using it, then tap Try again.'
    case 'SecurityError':
      return UNSUPPORTED_MESSAGE
    default:
      return 'The camera could not be opened. Tap Try again.'
  }
}
