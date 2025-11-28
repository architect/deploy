#!/usr/bin/env node
// Cross-platform script to run tests with environment variables
process.env.AWS_ACCESS_KEY_ID = 'blah'
process.env.AWS_SECRET_ACCESS_KEY = 'blah'

const { spawn } = require('child_process')
const { readdirSync, statSync } = require('fs')
const { join } = require('path')
const args = process.argv.slice(2)

// Simple glob expansion for **/*-test.js pattern
function expandGlob (pattern) {
  if (!pattern.includes('*')) {
    return [ pattern ]
  }

  // Handle test/unit/**/*-test.js pattern
  const match = pattern.match(/^(.+?)\/\*\*\/\*(.+)$/)
  if (match) {
    const baseDir = match[1]
    const suffix = match[2]
    const files = []

    function walk (dir) {
      try {
        const entries = readdirSync(dir)
        for (const entry of entries) {
          const fullPath = join(dir, entry)
          try {
            const stat = statSync(fullPath)
            if (stat.isDirectory()) {
              walk(fullPath)
            }
            else if (entry.endsWith(suffix)) {
              files.push(fullPath)
            }
          }
          catch {
            // Skip files we can't stat
          }
        }
      }
      catch {
        // Skip directories we can't read
      }
    }

    walk(baseDir)
    return files
  }

  return [ pattern ]
}

// Expand any glob patterns in args
const expandedArgs = []
for (const arg of args) {
  if (arg.includes('*')) {
    expandedArgs.push(...expandGlob(arg))
  }
  else {
    expandedArgs.push(arg)
  }
}

const child = spawn('node', expandedArgs, {
  stdio: 'inherit',
  shell: false,
})

child.on('exit', (code) => {
  process.exit(code || 0)
})
