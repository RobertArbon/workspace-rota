import { defineConfig, loadEnv } from 'vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    resolve: {
      alias: {
        '../../../generated/prisma': path.resolve(__dirname, 'generated/prisma/client.ts'),
      },
    },
    test: {
      environment: 'node',
      include: ['src/lib/db/__tests__/**/*.test.ts'],
      testTimeout: 15000,
      env,
      pool: 'forks',
      poolOptions: {
        forks: {
          singleFork: true,
        },
      },
    },
  }
})
