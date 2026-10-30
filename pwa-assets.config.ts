import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// The logo is a full dark square, so the padded icons must fill with the same
// colour instead of the preset's white.
const resizeOptions = { fit: 'contain', background: '#0f172a' } as const

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions },
    apple: { ...minimal2023Preset.apple, resizeOptions },
  },
  images: ['public/favicon.svg'],
})
