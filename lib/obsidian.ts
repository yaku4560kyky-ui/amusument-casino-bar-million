import 'server-only'

import { unstable_noStore as noStore } from 'next/cache'
import { readdir, readFile, stat, writeFile } from 'fs/promises'
import path from 'path'

function getVaultRoot() {
  if (process.env.OBSIDIAN_VAULT_PATH) {
    return process.env.OBSIDIAN_VAULT_PATH
  }

  return path.join(
    process.env.USERPROFILE ?? '',
    'OneDrive',
    'デスクトップ',
    'million company'
  )
}

function resolveVaultPath(relativePath: string) {
  const vaultRoot = getVaultRoot()
  const resolvedPath = path.resolve(/*turbopackIgnore: true*/ vaultRoot, relativePath)
  const resolvedRoot = path.resolve(/*turbopackIgnore: true*/ vaultRoot)

  if (!resolvedPath.startsWith(resolvedRoot)) {
    throw new Error('Vault path must stay inside the configured Obsidian vault.')
  }

  return resolvedPath
}

export async function readVaultMarkdown(relativePath: string): Promise<string | null> {
  noStore()
  const filePath = resolveVaultPath(relativePath)

  try {
    return await readFile(filePath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }

    throw error
  }
}

export async function readLatestVaultMarkdown(relativeDirectory: string): Promise<string | null> {
  noStore()
  const directoryPath = resolveVaultPath(relativeDirectory)

  try {
    const entries = await readdir(directoryPath, { withFileTypes: true })
    const markdownFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => entry.name)
      .sort((a, b) => b.localeCompare(a, 'ja'))

    for (const fileName of markdownFiles) {
      const content = await readVaultMarkdown(path.join(relativeDirectory, fileName))
      if (content !== null) {
        return content
      }
    }

    return null
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }

    throw error
  }
}

export async function vaultFileExists(relativePath: string): Promise<boolean> {
  noStore()
  try {
    await stat(resolveVaultPath(relativePath))
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false
    }

    throw error
  }
}

export async function writeVaultMarkdown(relativePath: string, content: string): Promise<void> {
  noStore()
  const filePath = resolveVaultPath(relativePath)
  await writeFile(filePath, content, 'utf8')
}

export async function listVaultDirectory(relativeDir: string): Promise<string[]> {
  noStore()
  const dirPath = resolveVaultPath(relativeDir)
  const entries = await readdir(dirPath, { withFileTypes: true })

  return entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .map(entry => entry.name)
}
