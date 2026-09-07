// Reproducible raster exports of the Popcorn Pal bucket-pal brand mark.
import { chromium } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
const browser = await chromium.launch()
const page = await browser.newPage()
const svg = await readFile(
  new URL('../public/icon.svg', import.meta.url),
  'utf8'
)
for (const [name, size, maskable] of [
  ['pwa-192x192.png', 192, false],
  ['pwa-512x512.png', 512, false],
  ['apple-touch-icon.png', 180, false],
  ['pwa-maskable-512x512.png', 512, true],
]) {
  const result = await page.evaluate(
    async ({ svg, size, maskable }) => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const context = canvas.getContext('2d')
      context.fillStyle = '#14181c'
      context.fillRect(0, 0, size, size)
      const image = new Image()
      image.src = 'data:image/svg+xml;base64,' + btoa(svg)
      await image.decode()
      const padding = maskable ? size * 0.08 : 0
      context.drawImage(
        image,
        padding,
        padding,
        size - padding * 2,
        size - padding * 2
      )
      return canvas.toDataURL('image/png').split(',')[1]
    },
    { svg, size, maskable }
  )
  await writeFile(
    new URL(`../public/${name}`, import.meta.url),
    Buffer.from(result, 'base64')
  )
}
await browser.close()
