import * as core from '@actions/core'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { execSync } from 'child_process'

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
    const markerFile = core.getInput('marker-file').trim()
    const patternSuffix = core.getInput('pattern-suffix').trim() || '/**'

    core.debug(`Looking for marker file: ${markerFile}`)
    core.debug(`Using pattern suffix: ${patternSuffix}`)

    // Find all marker files
    const markerFiles = findMarkerFiles(process.cwd(), markerFile)
    core.debug(`Found ${markerFiles.length} marker files`)

    // Generate filter
    const filter = generateFilter(markerFiles, patternSuffix)
    core.debug(`Generated filter: ${filter}`)

    // Set output
    core.setOutput('filter', filter)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

/**
 * Finds all marker files in the repository using git ls-files.
 *
 * @param rootDir The root directory to start searching from
 * @param markerFile The name of the marker file to look for
 * @returns Array of paths to marker files
 */
function findMarkerFiles(rootDir: string, markerFile: string): string[] {
  try {
    // Use git ls-files to get all files in the repository
    const command = `git ls-files --full-name -- "*/${markerFile}"`
    const output = execSync(command, { cwd: rootDir }).toString().trim()

    // If no files found, return empty array
    if (!output) {
      return []
    }

    // Split the output by newline and convert to absolute paths
    const files = output.split('\n').map((file) => path.join(rootDir, file))

    core.debug(`Found marker files: ${files.join(', ')}`)
    return files
  } catch (error) {
    core.warning(`Error finding marker files: ${error}`)
    return []
  }
}

/**
 * Generates a YAML filter based on marker file locations.
 *
 * @param markerFiles Array of paths to marker files
 * @param patternSuffix The pattern to append to the directory name
 * @returns YAML filter string
 */
function generateFilter(markerFiles: string[], patternSuffix: string): string {
  const filterObj: Record<string, string[]> = {}

  for (const file of markerFiles) {
    // Get the directory containing the marker file
    const dirPath = path.dirname(file)

    // Skip if it's the root directory
    if (dirPath === '.' || dirPath === process.cwd()) continue

    // Get the relative path from the current working directory
    const relativeDirPath = path.relative(process.cwd(), dirPath)

    // Use the directory name as the key
    const key = relativeDirPath

    // Set the filter value
    filterObj[key] = [`${relativeDirPath}${patternSuffix}`]
  }

  // Convert to YAML
  return yaml.dump(filterObj)
}
