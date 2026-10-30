// Average of the last `size` values added.
export interface RollingMean {
  add(value: number): void
  readonly mean: number
  readonly count: number
}

export function createRollingMean(size: number): RollingMean {
  const values: number[] = []
  let oldest = 0
  return {
    add(value) {
      if (values.length < size) {
        values.push(value)
      } else {
        values[oldest] = value
        oldest = (oldest + 1) % size
      }
    },
    get mean() {
      return values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length
    },
    get count() {
      return values.length
    },
  }
}

export const fpsFromInterval = (intervalMs: number): number =>
  intervalMs > 0 ? 1000 / intervalMs : 0
