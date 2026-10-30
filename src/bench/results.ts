export interface BenchResult {
  model: string
  delegate: string
  source: string
  loadMs: number
  detectMs: number
  fps: number
  tracking: number // percent of frames with a pose found
  visibility: number // 0 to 1, average over the 33 points
}

export const RESULT_COLUMNS = [
  'Model',
  'Delegate',
  'Source',
  'Load (ms)',
  'Detect (ms)',
  'Max FPS',
  'Live FPS',
  'Tracking',
  'Visibility',
]

// What the model could do if the camera were faster than its own frame rate.
export const maxFps = (detectMs: number): number => (detectMs > 0 ? 1000 / detectMs : 0)

export const resultCells = (r: BenchResult): string[] => [
  r.model,
  r.delegate,
  r.source,
  r.loadMs.toFixed(0),
  r.detectMs.toFixed(1),
  maxFps(r.detectMs).toFixed(0),
  r.fps.toFixed(0),
  `${r.tracking.toFixed(0)}%`,
  r.visibility.toFixed(2),
]

export function formatResultsTable(rows: BenchResult[]): string {
  const line = (cells: string[]) => `| ${cells.join(' | ')} |`
  return [
    line(RESULT_COLUMNS),
    line(RESULT_COLUMNS.map(() => '---')),
    ...rows.map((r) => line(resultCells(r))),
  ].join('\n')
}
