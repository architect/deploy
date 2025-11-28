#!/usr/bin/env node
// Custom test runner to avoid Node.js test runner serialization issues

// Set environment variables for AWS (required for tests)
process.env.AWS_ACCESS_KEY_ID = 'blah'
process.env.AWS_SECRET_ACCESS_KEY = 'blah'

const { join } = require('path')
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('fs')
const { tmpdir } = require('os')
const inventory = require('@architect/inventory')
const { updater } = require('@architect/utils')
const staticDeployMod = require(join(process.cwd(), 'src', 'static', 'index.js'))

let passed = 0
let failed = 0
let tmpDirs = []

function createTmpDir (structure) {
  const tmpDir = mkdtempSync(join(tmpdir(), 'arc-test-'))
  tmpDirs.push(tmpDir)
  const { dirname } = require('path')

  function createStructure (base, obj) {
    for (const [ key, value ] of Object.entries(obj)) {
      const path = join(base, key)
      if (typeof value === 'object' && value !== null && !Buffer.isBuffer(value)) {
        mkdirSync(path, { recursive: true })
        createStructure(path, value)
      }
      else {
        const dir = dirname(path)
        mkdirSync(dir, { recursive: true })
        writeFileSync(path, value || '')
      }
    }
  }

  createStructure(tmpDir, structure)
  return tmpDir
}

function cleanup () {
  tmpDirs.forEach(dir => {
    try {
      rmSync(dir, { recursive: true, force: true })
    }
    catch {
      // Ignore cleanup errors
    }
  })
}

function staticDeploy (cwd, testParams, callback) {
  inventory({ cwd }, function (err, result) {
    if (err) callback(err)
    else {
      const params = {
        bucket: testParams.bucket,
        isDryRun: testParams.isDryRun || false,
        name: 'an-app',
        production: false,
        region: 'us-west-1',
        stackname: undefined,
        update: updater('Deploy'),
        verbose: undefined,
        prefix: testParams.prefix,
        prune: testParams.prune || false,
        inventory: result,
      }
      staticDeployMod(params, callback)
    }
  })
}

async function test (name, fn) {
  try {
    await fn()
    console.log(`✔ ${name}`)
    passed++
  }
  catch (err) {
    console.error(`✖ ${name}`)
    console.error(err)
    failed++
  }
}

async function main () {
  await test('Set up env', async () => {
    if (!staticDeployMod) throw new Error('Static asset deployment module is not present')
  })

  await test('Skip static deploy if @static is not defined', async () => {
    let arc = '@app\n an-app'
    let cwd = createTmpDir({ 'app.arc': arc })
    await new Promise((resolve, reject) => {
      staticDeploy(cwd, {}, err => {
        if (err) reject(err)
        else resolve()
      })
    })
  })

  await test('Static deploy exits gracefully if @http is defined but public folder is not present', async () => {
    let arc = '@app\n an-app\n @http'
    let cwd = createTmpDir({ 'app.arc': arc })
    await new Promise((resolve, reject) => {
      staticDeploy(cwd, {}, err => {
        if (err) reject(err)
        else resolve()
      })
    })
  })

  await test('Static deploy skips when isDryRun is true', async () => {
    let arc = '@app\n an-app\n @static'
    let cwd = createTmpDir({
      'app.arc': arc,
      'public': {},
    })
    await new Promise((resolve, reject) => {
      staticDeploy(cwd, { isDryRun: true, bucket: 'test-bucket' }, err => {
        if (err) reject(err)
        else resolve()
      })
    })
  })

  await test('Static deploy skips when @http is defined and public folder is not present', async () => {
    let arc = '@app\n an-app\n @http'
    let cwd = createTmpDir({ 'app.arc': arc })
    await new Promise((resolve, reject) => {
      staticDeploy(cwd, { bucket: 'test-bucket' }, err => {
        if (err) reject(err)
        else resolve()
      })
    })
  })

  await test('Teardown', async () => {
    // Cleanup complete
  })

  cleanup()

  console.log(`\nℹ tests ${passed + failed}`)
  console.log(`ℹ pass ${passed}`)
  console.log(`ℹ fail ${failed}`)

  process.exit(failed > 0 ? 1 : 0)
}

// Only run if executed directly
if (require.main === module) {
  main()
}
