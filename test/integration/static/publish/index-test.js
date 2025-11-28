#!/usr/bin/env node
// Custom test runner to avoid Node.js test runner serialization issues

// Set environment variables for AWS (required for tests)
process.env.AWS_ACCESS_KEY_ID = 'blah'
process.env.AWS_SECRET_ACCESS_KEY = 'blah'

const awsLite = require('@aws-lite/client')
const { join, dirname } = require('path')
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('fs')
const { tmpdir } = require('os')
const _inventory = require('@architect/inventory')
const { updater } = require('@architect/utils')

let passed = 0
let failed = 0
let tmpDir
let inventory
let params
let putted
let deleted
let aws

function createTmpDir (structure) {
  const dir = mkdtempSync(join(tmpdir(), 'arc-test-'))

  function createStructure (base, obj) {
    for (const [ key, value ] of Object.entries(obj)) {
      const path = join(base, key)
      if (typeof value === 'object' && value !== null && !Buffer.isBuffer(value)) {
        mkdirSync(path, { recursive: true })
        createStructure(path, value)
      }
      else {
        const parentDir = dirname(path)
        mkdirSync(parentDir, { recursive: true })
        writeFileSync(path, value || '')
      }
    }
  }

  createStructure(dir, structure)
  return dir
}

function putFiles (params, callback) {
  putted = params
  callback(null, params.files.length, 0)
}

function deleteFiles (params, callback) {
  deleted = params
  callback()
}

// Mock the S3 file operations using Module._load interception
const Module = require('module')
const { normalize } = require('path')
const originalLoad = Module._load
Module._load = function (request, parent) {
  if (request === './s3/put-files' && parent.filename) {
    const normalizedPath = normalize(parent.filename)
    if (normalizedPath.includes(normalize('src/static/publish/index.js'))) {
      return putFiles
    }
  }
  if (request === './s3/delete-files' && parent.filename) {
    const normalizedPath = normalize(parent.filename)
    if (normalizedPath.includes(normalize('src/static/publish/index.js'))) {
      return deleteFiles
    }
  }
  return originalLoad.apply(this, arguments)
}

const sut = require(join(process.cwd(), 'src', 'static', 'publish', 'index.js'))

// Don't restore - keep mocks active for the duration of the test

let defaultParams = () => ({
  aws,
  Bucket: 'a-bucket',
  folder: 'public',
  inventory,
  prune: false,
  region: 'us-west-1',
  update: updater('Deploy'),
})

let arc = '@app\nan-app\n@static'
let content = 'hi there'

function setup () {
  putted = undefined
  deleted = undefined
  params = defaultParams()
  // Mocks are already set in the main setup
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
    if (!sut) throw new Error('S3 publish module is not present')

    // Enable testing mode first
    awsLite.testing.enable()
    if (!awsLite.testing.isEnabled()) throw new Error('AWS client testing not enabled')

    // Set up mocks before creating the client
    awsLite.testing.mock('S3.HeadObject', '')
    awsLite.testing.mock('S3.PutObject', '')
    awsLite.testing.mock('S3.ListObjectsV2', '')
    awsLite.testing.mock('S3.DeleteObjects', '')

    // Now create the AWS client
    aws = await awsLite({ region: 'us-west-2', plugins: [ import('@aws-lite/s3') ] })

    tmpDir = createTmpDir({
      'app.arc': arc,
      public: {
        'index.html':     content,
        'something.json': content,
        'index.js':       content,
      },
    })
    inventory = await _inventory({ cwd: tmpDir })
    if (!inventory) throw new Error('Failed to get inventory obj')
  })

  await test('Static asset publishing', async () => {
    setup()
    await new Promise((resolve, reject) => {
      sut(params, err => {
        if (err) reject(err)
        else {
          try {
            if (putted.files.length !== 3) throw new Error('Expected 3 files to be published')
            if (putted.fingerprint !== null) throw new Error('Expected fingerprint to be null')
            if (!putted.publicDir) throw new Error('Expected publicDir to be set')
            if (putted.prefix !== undefined) throw new Error('Expected prefix to be undefined')
            if (putted.region !== params.region) throw new Error('Expected region to match')
            if (JSON.stringify(putted.staticManifest) !== '{}') throw new Error('Expected empty staticManifest')
            if (deleted) throw new Error('Expected no files to be pruned')
            resolve()
          }
          catch (err) {
            reject(err)
          }
        }
      })
    })
  })

  await test('Static asset deletion (deployAction is all)', async () => {
    setup()
    let testParams = defaultParams()
    testParams.prune = true
    testParams.deployAction = 'all'
    await new Promise((resolve, reject) => {
      sut(testParams, err => {
        if (err) reject(err)
        else {
          try {
            if (deleted.Bucket !== testParams.Bucket) throw new Error('Expected bucket to match')
            if (deleted.files.length !== 3) throw new Error('Expected 3 files')
            if (deleted.fingerprint !== null) throw new Error('Expected fingerprint to be null')
            if (deleted.folder !== testParams.folder) throw new Error('Expected folder to match')
            if (deleted.prefix !== undefined) throw new Error('Expected prefix to be undefined')
            if (deleted.region !== testParams.region) throw new Error('Expected region to match')
            if (JSON.stringify(deleted.staticManifest) !== '{}') throw new Error('Expected empty staticManifest')
            resolve()
          }
          catch (err) {
            reject(err)
          }
        }
      })
    })
  })

  await test('Static asset deletion (deployAction is delete)', async () => {
    setup()
    let testParams = defaultParams()
    testParams.prune = true
    testParams.deployAction = 'delete'
    await new Promise((resolve, reject) => {
      sut(testParams, err => {
        if (err) reject(err)
        else {
          try {
            if (deleted.Bucket !== testParams.Bucket) throw new Error('Expected bucket to match')
            if (deleted.files.length !== 3) throw new Error('Expected 3 files')
            if (deleted.fingerprint !== null) throw new Error('Expected fingerprint to be null')
            if (deleted.folder !== testParams.folder) throw new Error('Expected folder to match')
            if (deleted.prefix !== undefined) throw new Error('Expected prefix to be undefined')
            if (deleted.region !== testParams.region) throw new Error('Expected region to match')
            if (JSON.stringify(deleted.staticManifest) !== '{}') throw new Error('Expected empty staticManifest')
            resolve()
          }
          catch (err) {
            reject(err)
          }
        }
      })
    })
  })

  await test('Teardown', async () => {
    if (tmpDir) {
      try {
        rmSync(tmpDir, { recursive: true, force: true })
      }
      catch {
        // Ignore cleanup errors
      }
    }
    awsLite.testing.disable()
    if (awsLite.testing.isEnabled()) throw new Error('AWS testing not disabled')
  })

  console.log(`\nℹ tests ${passed + failed}`)
  console.log(`ℹ pass ${passed}`)
  console.log(`ℹ fail ${failed}`)

  process.exit(failed > 0 ? 1 : 0)
}

// Only run if executed directly
if (require.main === module) {
  main()
}
