import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  actualFacing,
  cameraConstraints,
  describeCameraError,
  facingLabel,
  isCameraSupported,
  isMirrored,
  otherFacing,
  UNSUPPORTED_MESSAGE,
} from './camera.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('cameraConstraints', () => {
  it('asks for the front camera without audio', () => {
    const constraints = cameraConstraints('user')
    expect(constraints.audio).toBe(false)
    expect(constraints.video).toMatchObject({ facingMode: { ideal: 'user' } })
  })

  it('asks for the back camera', () => {
    expect(cameraConstraints('environment').video).toMatchObject({
      facingMode: { ideal: 'environment' },
    })
  })
})

describe('facing helpers', () => {
  it('switches between front and back', () => {
    expect(otherFacing('user')).toBe('environment')
    expect(otherFacing('environment')).toBe('user')
  })

  it('mirrors only the front camera', () => {
    expect(isMirrored('user')).toBe(true)
    expect(isMirrored('environment')).toBe(false)
  })

  it('labels each camera', () => {
    expect(facingLabel('user')).toBe('Front camera')
    expect(facingLabel('environment')).toBe('Back camera')
  })

  it('reads the real facing from the track settings', () => {
    expect(actualFacing({ facingMode: 'environment' })).toBe('environment')
    expect(actualFacing({ facingMode: 'user' })).toBe('user')
  })

  it('treats a camera that reports no facing (laptop webcam) as the front camera', () => {
    expect(actualFacing({})).toBe('user')
  })
})

describe('isCameraSupported', () => {
  it('is true when getUserMedia exists', () => {
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: () => {} } })
    expect(isCameraSupported()).toBe(true)
  })

  it('is false on an insecure page, where mediaDevices is missing', () => {
    vi.stubGlobal('navigator', {})
    expect(isCameraSupported()).toBe(false)
  })
})

describe('describeCameraError', () => {
  const message = (name: string) => describeCameraError(new DOMException('x', name))

  it('explains a blocked camera', () => {
    expect(message('NotAllowedError')).toMatch(/blocked/)
  })

  it('explains a missing camera', () => {
    expect(message('NotFoundError')).toMatch(/No camera/)
  })

  it('explains a camera used by another app', () => {
    expect(message('NotReadableError')).toMatch(/busy/)
  })

  it('explains an insecure page', () => {
    expect(message('SecurityError')).toBe(UNSUPPORTED_MESSAGE)
  })

  it('has a fallback for anything else, including non-errors', () => {
    expect(message('SomethingElse')).toMatch(/could not be opened/)
    expect(describeCameraError(undefined)).toMatch(/could not be opened/)
  })
})
