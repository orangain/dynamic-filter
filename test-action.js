const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

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

// Test with default inputs
console.log('Testing with default inputs:')
process.chdir('test-repo')
try {
  const defaultOutput = execSync('node ../dist/index.js').toString()
  console.log(defaultOutput)

  // Test with custom inputs
  console.log('\nTesting with custom inputs:')
  process.env['INPUT_MARKER-FILE'] = 'Taskfile.yaml'
  process.env['INPUT_PATTERN-SUFFIX'] = '/*.js'

  const customOutput = execSync('node ../dist/index.js').toString()
  console.log(customOutput)

  // Decode the output
  const filterOutput = customOutput.match(/::set-output name=filter::(.+)/)[1]
  const decodedOutput = decodeURIComponent(filterOutput)
  console.log('\nDecoded filter output:')
  console.log(decodedOutput)
} catch (error) {
  console.error('Error:', error.message)
}
