const { test, after } = require('node:test')
const assert = require('node:assert/strict')
const awsLite = require('@aws-lite/client')
const { join } = require('path')
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('fs')
const { tmpdir } = require('os')
const _inventory = require('@architect/inventory')
const { updater } = require('@architect/utils')

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
        // Ensure parent directory exists for files
        const dir = dirname(path)
        mkdirSync(dir, { recursive: true })
        writeFileSync(path, value || '')
      }
    }
  }

  createStructure(tmpDir, structure)
  return tmpDir
}

after(() => {
  tmpDirs.forEach(dir => {
    try {
      rmSync(dir, { recursive: true, force: true })
    }
    catch {
      // Ignore cleanup errors
    }
  })
})

let inventory
let params
let putted
let deleted

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
const originalLoad = Module._load
Module._load = function (request, parent) {
  if (request === './s3/put-files' && parent.filename.includes('src/static/publish/index.js')) {
    return putFiles
  }
  if (request === './s3/delete-files' && parent.filename.includes('src/static/publish/index.js')) {
    return deleteFiles
  }
  return originalLoad.apply(this, arguments)
}

const sut = require(join(process.cwd(), 'src', 'static', 'publish', 'index.js'))

let aws
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
  awsLite.testing.mock('S3.HeadObject', '')
  awsLite.testing.mock('S3.PutObject', '')
  awsLite.testing.mock('S3.ListObjectsV2', '')
  awsLite.testing.mock('S3.DeleteObjects', '')
}

test('Set up env', async () => {
  assert.ok(sut, 'S3 publish module is present')

  aws = await awsLite({ region: 'us-west-2', plugins: [ import('@aws-lite/s3') ] })
  awsLite.testing.enable()
  assert.ok(awsLite.testing.isEnabled(), 'AWS client testing enabled')

  let cwd = createTmpDir({
    'app.arc': arc,
    public: {
      'index.html':     content,
      'something.json': content,
      'index.js':       content,
    },
  })
  inventory = await _inventory({ cwd })
  assert.ok(inventory, 'Got inventory obj')
})

test('Static asset publishing', (t, done) => {
  setup()
  sut(params, err => {
    if (err) assert.fail(err)
    assert.strictEqual(putted.files.length, 3, 'Passed files to be published')
    assert.strictEqual(putted.fingerprint, null, 'Passed fingerprint unmutated')
    assert.ok(putted.publicDir, 'Passed publicDir')
    assert.strictEqual(putted.prefix, undefined, 'Passed prefix unmutated')
    assert.strictEqual(putted.region, params.region, 'Passed region unmutated')
    assert.deepStrictEqual(putted.staticManifest, {}, 'Passed empty staticManifest by default')
    assert.ok(!deleted, 'No files pruned')
    done()
  })
})

test(`Static asset deletion (deployAction is 'all')`, (t, done) => {
  setup()
  let params = defaultParams()
  params.prune = true
  params.deployAction = 'all'
  sut(params, err => {
    if (err) assert.fail(err)
    assert.strictEqual(deleted.Bucket, params.Bucket, 'Passed bucket unmutated')
    assert.strictEqual(deleted.files.length, 3, 'Passed files to be published')
    assert.strictEqual(deleted.fingerprint, null, 'Passed fingerprint unmutated')
    assert.strictEqual(deleted.folder, params.folder, 'Passed folder unmutated')
    assert.strictEqual(deleted.prefix, undefined, 'Passed prefix unmutated')
    assert.strictEqual(deleted.region, params.region, 'Passed region setting unmutated')
    assert.deepStrictEqual(deleted.staticManifest, {}, 'Passed empty staticManifest by default')
    done()
  })
})

test(`Static asset deletion (deployAction is 'delete')`, (t, done) => {
  setup()
  let params = defaultParams()
  params.prune = true
  params.deployAction = 'delete'
  sut(params, err => {
    if (err) assert.fail(err)
    assert.strictEqual(deleted.Bucket, params.Bucket, 'Passed bucket unmutated')
    assert.strictEqual(deleted.files.length, 3, 'Passed files to be published')
    assert.strictEqual(deleted.fingerprint, null, 'Passed fingerprint unmutated')
    assert.strictEqual(deleted.folder, params.folder, 'Passed folder unmutated')
    assert.strictEqual(deleted.prefix, undefined, 'Passed prefix unmutated')
    assert.strictEqual(deleted.region, params.region, 'Passed region setting unmutated')
    assert.deepStrictEqual(deleted.staticManifest, {}, 'Passed empty staticManifest by default')
    done()
  })
})

test('Teardown', () => {
  awsLite.testing.disable()
  assert.ok(!awsLite.testing.isEnabled(), 'Done')
})
