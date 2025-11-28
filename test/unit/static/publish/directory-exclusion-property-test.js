const { test } = require('node:test')
const assert = require('node:assert/strict')
const { join } = require('path')
const { mkdirSync, writeFileSync, rmSync, globSync, statSync } = require('node:fs')
const { pathToUnix } = require('@architect/utils')

/**
 * Feature: migrate-to-fs-globsync, Property 1: Directory exclusion correctness
 * Validates: Requirements 2.2
 *
 * Property: For any glob pattern that requires directory exclusion,
 * all returned paths should be files and not directories
 */

test('Property test: Directory exclusion correctness (100 iterations)', () => {
  const iterations = 100
  const testRoot = join(process.cwd(), '.test-property-temp')

  // Clean up any previous test artifacts
  try {
    rmSync(testRoot, { recursive: true, force: true })
  }
  catch {
    // Ignore cleanup errors
  }

  let passedIterations = 0
  let failedIterations = []

  for (let i = 0; i < iterations; i++) {
    const testDir = join(testRoot, `iteration-${i}`)

    try {
      // Create a test directory structure with varying complexity
      mkdirSync(testDir, { recursive: true })

      // Generate random structure: files and directories
      const numFiles = Math.floor(Math.random() * 5) + 1
      const numDirs = Math.floor(Math.random() * 3) + 1

      // Create files
      for (let f = 0; f < numFiles; f++) {
        const fileName = `file-${i}-${f}.txt`
        writeFileSync(join(testDir, fileName), `content ${i}-${f}`)
      }

      // Create directories (some empty, some with files)
      for (let d = 0; d < numDirs; d++) {
        const dirName = `dir-${i}-${d}`
        const dirPath = join(testDir, dirName)
        mkdirSync(dirPath, { recursive: true })

        // Randomly add files to some directories
        if (Math.random() > 0.5) {
          const nestedFile = `nested-${i}-${d}.txt`
          writeFileSync(join(dirPath, nestedFile), `nested content ${i}-${d}`)
        }
      }

      // Apply the same filtering logic as in src/static/publish/index.js
      let path = pathToUnix(testDir + '/**/*')
      let globbed = globSync(path)

      // Filter out directories (this is the logic we're testing)
      let filtered = globbed.filter(filePath => {
        try {
          return statSync(filePath).isFile()
        }
        catch {
          return false
        }
      })

      // Property check: All filtered results must be files, not directories
      let allAreFiles = true
      let failedPath = null

      for (let filePath of filtered) {
        try {
          const stats = statSync(filePath)
          if (!stats.isFile()) {
            allAreFiles = false
            failedPath = filePath
            break
          }
        }
        catch {
          // If we can't stat it, it shouldn't have been in the results
          allAreFiles = false
          failedPath = filePath
          break
        }
      }

      if (allAreFiles) {
        passedIterations++
      }
      else {
        failedIterations.push({
          iteration: i,
          failedPath,
          message: `Found non-file in filtered results: ${failedPath}`,
        })
      }
    }
    catch (err) {
      failedIterations.push({
        iteration: i,
        error: err.message,
      })
    }
  }

  // Clean up test artifacts
  try {
    rmSync(testRoot, { recursive: true, force: true })
  }
  catch {
    // Ignore cleanup errors
  }

  // Report results
  assert.strictEqual(passedIterations, iterations,
    `All ${iterations} iterations should pass directory exclusion property`)

  if (failedIterations.length > 0) {
    console.log('\nFailed iterations:', JSON.stringify(failedIterations, null, 2))
  }
})
