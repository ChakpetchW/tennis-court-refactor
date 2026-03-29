import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const sourceDir = resolve(rootDir, 'public', 'api')
const targetDir = resolve(rootDir, 'dist', 'api')

const copyApiFiles = async () => {
  await mkdir(targetDir, { recursive: true })
  const entries = await readdir(sourceDir, { withFileTypes: true })

  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.php'))
      .map((entry) =>
        copyFile(resolve(sourceDir, entry.name), resolve(targetDir, entry.name)),
      ),
  )

  console.log(`Copied PHP API files from ${sourceDir} to ${targetDir}`)
}

copyApiFiles().catch((error) => {
  console.error('Failed to copy API files to dist:', error)
  process.exit(1)
})
