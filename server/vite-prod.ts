import { createServer } from 'vite'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function createProductionServer() {
  const app = express()
  
  // Serve static files from dist/public
  app.use(express.static(path.resolve(__dirname, '../dist/public')))
  
  // For any other route, serve the index.html
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../dist/public/index.html'))
  })
  
  return app
}