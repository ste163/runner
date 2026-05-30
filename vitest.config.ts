// Copyright (c) 2025 TikTok Pte. Ltd.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
import { defineConfig } from 'vitest/config'
import { vitestTestingLibraryPlugin } from '@lynx-js/react/testing-library/plugins'

export default defineConfig({
  plugins: [vitestTestingLibraryPlugin()],
  test: {
    coverage: {
      provider: 'v8',
      skipFull: true,
      reporter: ['text'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/*.spec.tsx',
        'src/**/*.d.ts',
        'src/**/index.tsx',
        'src/**/types.ts',
      ],
    },
  },
})
