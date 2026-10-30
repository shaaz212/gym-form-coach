import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

export type ModelSize = 'lite' | 'full' | 'heavy'
export type Delegate = 'GPU' | 'CPU'

const base = import.meta.env.BASE_URL

// The heavy model is 29 MB, over Cloudflare Pages' 25 MiB file limit, so it is not
// shipped with the app. The speed test loads it straight from Google's model storage.
const HEAVY_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task'

const modelUrl = (size: ModelSize): string =>
  size === 'heavy' ? HEAVY_URL : `${base}models/pose_landmarker_${size}.task`

let fileset: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>> | undefined

export async function createLandmarker(size: ModelSize, delegate: Delegate): Promise<PoseLandmarker> {
  fileset ??= await FilesetResolver.forVisionTasks(`${base}wasm`)
  return PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: modelUrl(size), delegate },
    runningMode: 'VIDEO',
    numPoses: 1,
  })
}
