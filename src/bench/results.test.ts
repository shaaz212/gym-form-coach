import { describe, expect, it } from 'vitest'
import { type BenchResult, formatResultsTable, maxFps, resultCells } from './results.ts'

const row: BenchResult = {
  model: 'lite',
  delegate: 'GPU',
  source: 'camera (user)',
  loadMs: 812.4,
  detectMs: 12.5,
  fps: 29.6,
  tracking: 96.4,
  visibility: 0.876,
}

describe('maxFps', () => {
  it('is the frames per second the model could reach', () => {
    expect(maxFps(20)).toBe(50)
  })

  it('is 0 when nothing was measured', () => {
    expect(maxFps(0)).toBe(0)
  })
})

describe('resultCells', () => {
  it('rounds each number for reading', () => {
    expect(resultCells(row)).toEqual([
      'lite',
      'GPU',
      'camera (user)',
      '812',
      '12.5',
      '80',
      '30',
      '96%',
      '0.88',
    ])
  })
})

describe('formatResultsTable', () => {
  it('writes a markdown table with a header, a divider and one line per result', () => {
    const lines = formatResultsTable([row, { ...row, model: 'full' }]).split('\n')
    expect(lines).toHaveLength(4)
    expect(lines[0]).toBe(
      '| Model | Delegate | Source | Load (ms) | Detect (ms) | Max FPS | Live FPS | Tracking | Visibility |',
    )
    expect(lines[1]).toBe('| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    expect(lines[2]).toBe('| lite | GPU | camera (user) | 812 | 12.5 | 80 | 30 | 96% | 0.88 |')
    expect(lines[3]).toContain('| full |')
  })
})
