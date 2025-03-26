import * as core from '@actions/core'
import * as path from 'path'
import * as yaml from 'js-yaml'
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
    const patternSuffix = core.getInput('pattern-suffix').trim() || '/**'

    core.debug(`Looking for pattern: ${pattern}`)
    core.debug(`Looking for marker file: ${markerFile}`)
    core.debug(`Using pattern suffix: ${patternSuffix}`)

    // Find target directories
    const directories = await findDirectories(
      process.cwd(),
      pattern,
      markerFile
    )
    core.debug(`Found ${directories.length} directories`)

    // Generate filter
    const filter = generateFilter(directories, patternSuffix)
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
 * Generates a YAML filter based on marker file locations.
 *
 * @param markerFiles Array of paths to marker files
 * @param patternSuffix The pattern to append to the directory name
 * @returns YAML filter string
 */
function generateFilter(directories: string[], patternSuffix: string): string {
  const filterObj: Record<string, string[]> = {}

  for (const directory of directories) {
    // Get the relative path from the current working directory
    const relativeDirPath = path.relative(process.cwd(), directory)

    // Use the directory name as the key
    const key = relativeDirPath

    // Set the filter value
    filterObj[key] = [`${relativeDirPath}${patternSuffix}`]
  }

  // Convert to YAML
  return yaml.dump(filterObj)
}
