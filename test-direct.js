import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'

// Create test directory structure if it doesn't exist
if (!fs.existsSync('test-repo')) {
  fs.mkdirSync('test-repo')
  fs.mkdirSync('test-repo/foo')
  fs.mkdirSync('test-repo/bar')
  fs.mkdirSync('test-repo/baz')
  fs.mkdirSync('test-repo/baz/child')

  // Create marker files
  fs.writeFileSync('test-repo/foo/Taskfile.yaml', '')
  fs.writeFileSync('test-repo/bar/Taskfile.yaml', '')
  fs.writeFileSync('test-repo/baz/child/Taskfile.yaml', '')
}

// Function to find marker files
function findMarkerFiles(rootDir, markerFile) {
  const results = []

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
    console.warn(`Error reading directory ${rootDir}: ${error}`)
  }

  return results
}

// Function to generate filter
function generateFilter(markerFiles, patternSuffix) {
  const filterObj = {}

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

// Test with default inputs
console.log('Testing with default inputs:')
const markerFiles = findMarkerFiles('test-repo', 'Taskfile.yaml')
console.log(`Found ${markerFiles.length} marker files`)
const filter = generateFilter(markerFiles, '/**')
console.log('Generated filter:')
console.log(filter)

// Test with custom inputs
console.log('\nTesting with custom inputs:')
const customFilter = generateFilter(markerFiles, '/*.js')
console.log('Generated filter with custom pattern suffix:')
console.log(customFilter)
