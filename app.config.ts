// @ts-nocheck
import { defineConfig } from '@lynx-js/rspeedy'
import { pluginQRCode } from '@lynx-js/qrcode-rsbuild-plugin'
import { pluginReactLynx } from '@lynx-js/react-rsbuild-plugin'
import type { AppConfig } from 'sparkling-app-cli'

const lynxConfig = defineConfig({
  source: {
    entry: {
      main: './src/pages/main/index.tsx',
      onboarding: './src/pages/onboarding/index.tsx',
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
        // We use `?fullscreen=true` to open the page in LynxExplorer in full screen mode
        return `${url}?fullscreen=true`
      },
    }),
    pluginReactLynx(),
  ],
})

const config: AppConfig = {
  lynxConfig,
  appName: 'runner',
  platform: {
    android: {
      packageName: 'com.example.sparkling.go',
    },
  },
  dev: {
    port: 3000,
  },
  paths: {
    androidAssets: 'android/app/src/main/assets',
  },
  appIcon: './resource/app_icon.png',
  router: {
    main: {
      path: './lynxPages/main',
    },
    onboarding: {
      path: './lynxPages/onboarding',
    },
    second: {
      path: './lynxPages/second',
    },
  },
  plugin: [
    [
      'splash-screen',
      {
        backgroundColor: '#232323',
        image: './resource/app_icon.png',
        dark: {
          image: './resource/app_icon.png',
          backgroundColor: '#000000',
        },
        imageWidth: 200,
      },
    ],
  ],
}

export default config
