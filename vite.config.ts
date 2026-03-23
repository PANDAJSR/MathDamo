import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const shouldUsePagesBase = process.env.GITHUB_ACTIONS === 'true' && Boolean(repositoryName)

export default defineConfig({
  base: shouldUsePagesBase ? `/${repositoryName}/` : '/',
  plugins: [react()],
})
