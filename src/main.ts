import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'

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
    let markerFile = core.getInput('marker-file').trim()
    if (!markerFile) {
      markerFile = core.getInput('marker_file').trim() || 'Taskfile.yaml'
    }

    let patternSuffix = core.getInput('pattern-suffix').trim()
    if (!patternSuffix) {
      patternSuffix = core.getInput('pattern_suffix').trim() || '/**'
    }

    core.debug(`Looking for marker file: ${markerFile}`)
    core.debug(`Using pattern suffix: ${patternSuffix}`)
    core.info(`Using pattern suffix: ${patternSuffix}`)

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
 * Recursively finds all marker files in the repository.
 *
 * @param rootDir The root directory to start searching from
 * @param markerFile The name of the marker file to look for
 * @returns Array of paths to marker files
 */
function findMarkerFiles(rootDir: string, markerFile: string): string[] {
  const results: string[] = []

  // Skip node_modules and .git directories
  if (rootDir.includes('node_modules') || rootDir.includes('.git')) {
    return results
  }

  try {
    const files = fs.readdirSync(rootDir)

    for (const file of files) {
      const filePath = path.join(rootDir, file)
      const stat = fs.statSync(filePath)

      if (stat.isDirectory()) {
        // Recursively search subdirectories
        results.push(...findMarkerFiles(filePath, markerFile))
      } else if (file === markerFile) {
        // Found a marker file
        results.push(filePath)
      }
    }
  } catch (error) {
    core.warning(`Error reading directory ${rootDir}: ${error}`)
  }

  return results
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
