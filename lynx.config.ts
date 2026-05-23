// @ts-nocheck
import { defineConfig } from '@lynx-js/rspeedy'
import { pluginQRCode } from '@lynx-js/qrcode-rsbuild-plugin'
import { pluginReactLynx } from '@lynx-js/react-rsbuild-plugin'

export default defineConfig({
  source: {
    entry: {
      main: './src/pages/main/index.tsx',
      second: './src/pages/second/index.tsx',
    },
  },
  output: {
    assetPrefix: 'asset:///',
    filename: {
      bundle: '[name].lynx.bundle',
    },
  },
  plugins: [
    pluginQRCode({
      schema(url: string): string {
        return `${url}?fullscreen=true`
      },
    }),
    pluginReactLynx(),
  ],
})
