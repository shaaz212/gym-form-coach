import { describe, expect, it } from 'vitest'
import { createRollingMean, fpsFromInterval } from './stats.ts'

describe('createRollingMean', () => {
  it('is 0 before anything is added', () => {
    const m = createRollingMean(3)
    expect(m.mean).toBe(0)
    expect(m.count).toBe(0)
  })

  it('averages everything while the window is not full', () => {
    const m = createRollingMean(3)
    m.add(10)
    m.add(20)
    expect(m.mean).toBe(15)
    expect(m.count).toBe(2)
  })

  it('drops the oldest value once the window is full', () => {
    const m = createRollingMean(3)
    ;[1, 2, 3].forEach((v) => m.add(v))
    expect(m.mean).toBe(2)
    m.add(10) // replaces 1 -> [10, 2, 3]
    expect(m.mean).toBe(5)
    m.add(20) // replaces 2 -> [10, 20, 3]
    expect(m.mean).toBe(11)
    expect(m.count).toBe(3)
  })
})

describe('fpsFromInterval', () => {
  it('converts a frame interval in ms to frames per second', () => {
    expect(fpsFromInterval(50)).toBe(20)
    expect(fpsFromInterval(1000 / 30)).toBeCloseTo(30)
  })

  it('is 0 when there is no interval yet', () => {
    expect(fpsFromInterval(0)).toBe(0)
  })
})
