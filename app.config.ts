// @ts-nocheck
import { defineConfig } from '@lynx-js/rspeedy'
import { pluginQRCode } from '@lynx-js/qrcode-rsbuild-plugin'
import { pluginReactLynx } from '@lynx-js/react-rsbuild-plugin'
import type { AppConfig } from 'sparkling-app-cli'

const lynxConfig = defineConfig({
  source: {
    entry: {
      home: './src/pages/home/index.tsx',
      onboarding: './src/pages/onboarding/index.tsx',
      workout: './src/pages/workout/index.tsx',
    },
  },
  output: {
    assetPrefix: 'asset:///',
    filename: {
      bundle: '[name].lynx.bundle',
    },
  },
  plugins: [
    // TODO: what is this? I don't need QR codes in my app
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
      packageName: 'com.ste163.runner',
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
    home: {
      path: './lynxPages/home',
    },
    onboarding: {
      path: './lynxPages/onboarding',
    },
    workout: {
      path: './lynxPages/workout',
    },
  },
  plugin: [
    [
      'splash-screen',
      {
        backgroundColor: '#000000',
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
