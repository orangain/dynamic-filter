import * as core from '@actions/core'
import * as path from 'path'
import { glob } from 'glob'
import { existsSync } from 'node:fs'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    // Get inputs
    // GitHub Actions automatically converts hyphens to underscores in input names
    // So we need to check both formats
    const pattern = ensureDirectoryPattern(core.getInput('pattern'))
    const markerFile = core.getInput('if-exists')
    const template =
      core.getInput('template') ||
      `{dir}:
- {dir}/**`

    core.debug(`Looking for pattern: ${pattern}`)
    core.debug(`Looking for marker file: ${markerFile}`)
    core.debug(`Using template: ${template}`)

    // Find target directories
    const directories = await findDirectories(
      process.cwd(),
      pattern,
      markerFile
    )
    core.debug(`Found ${directories.length} directories`)

    // Generate filter
    const filter = generateFilter(directories, template)
    core.debug(`Generated filter: ${filter}`)

    // Set output
    core.setOutput('filter', filter)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

function ensureDirectoryPattern(pattern: string) {
  if (pattern.endsWith('/')) {
    return pattern
  }
  return `${pattern}/`
}

async function findDirectories(
  workingDir: string,
  pattern: string,
  markerFile: string
): Promise<string[]> {
  function isTarget(directory: string): boolean {
    if (directory === '.' || directory === process.cwd()) return false
    if (markerFile === '') return true
    return existsSync(path.join(workingDir, directory, markerFile))
  }

  const dirs = (await glob(pattern, { cwd: workingDir })).filter(isTarget)
  dirs.sort()
  return dirs
}

/**
 * Generates a YAML filter based on the given directories and template.
 *
 * @param directories Array of paths to directories
 * @param template The template to use for each directory
 * @returns YAML filter string
 */
function generateFilter(directories: string[], template: string): string {
  return directories
    .map((directory) => {
      const relativeDirPath = path.relative(process.cwd(), directory)
      return template.replaceAll('{dir}', relativeDirPath) + '\n'
    })
    .join('')
}
