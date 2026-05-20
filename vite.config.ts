import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const shouldUsePagesBase = process.env.GITHUB_ACTIONS === 'true' && Boolean(repositoryName)
const shouldUseElectronBase = process.env.ELECTRON_BUILD === 'true'

export default defineConfig({
  base: shouldUseElectronBase ? './' : shouldUsePagesBase ? `/${repositoryName}/` : '/',
  plugins: [react()],
  server: {
    port: 14723,
  },
})
