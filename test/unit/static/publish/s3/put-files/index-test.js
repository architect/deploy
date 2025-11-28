const { test, before } = require('node:test')
const assert = require('node:assert/strict')
let awsLite = require('@aws-lite/client')
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('fs')
const { tmpdir } = require('os')
let { join, sep, dirname } = require('path')
let crypto = require('crypto')
let { pathToUnix } = require('@architect/utils')
let cwd = process.cwd()
let filePath = join(process.cwd(), 'src', 'static', 'publish', 's3', 'put-files')

function createTmpDir (structure) {
  const tmpDir = mkdtempSync(join(tmpdir(), 'arc-test-'))

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

// Mock put-params by overriding the require cache
let Module = require('module')
let originalRequire = Module.prototype.require
Module.prototype.require = function (id) {
  if (id.includes('put-params')) {
    return ({ Bucket, Key, Body }) => ({
      Bucket, Key, Body,
    })
  }
  return originalRequire.apply(this, arguments)
}

let putParams = require(filePath)

// Restore original require
Module.prototype.require = originalRequire

let aws, tmp
let CacheControl

function createFileData (diff) {
  return {
    'index.html': Buffer.from(`this is index.html + ${diff ? 'diff' : 'no diff'}`),
    'static.json': Buffer.from(`this is static.json + ${diff ? 'diff' : 'no diff'}`),
    'folder/something.json': Buffer.from(`this is something.json + ${diff ? 'diff' : 'no diff'}`),
    'index.js': Buffer.from(`this is index.js + ${diff ? 'diff' : 'no diff'}`),
  }
}
// Benchmark file data to compare against in headObject calls
let fileData = createFileData()
let files = []
let update = () => {}
update.raw = () => {}

let params = () => ({
  aws,
  Bucket: 'a-bucket',
  files,
  fingerprint: false,
  publicDir: 'public',
  prefix: undefined,
  region: 'us-west-1',
  staticManifest: {},
  update,
})

function headObject (params) {
  let hash = crypto.createHash('md5').update(fileData[params.Key]).digest('hex')
  let ETag = `"${hash}"` // AWS double quotes because lol
  return { ETag, CacheControl }
}

function setup (data) {
  CacheControl = undefined
  tmp = createTmpDir(data)
  files = Object.keys(data).map(f => f.replace('/', sep))
  process.chdir(tmp)
}
function reset () {
  awsLite.testing.reset()
  if (tmp) {
    try {
      rmSync(tmp, { recursive: true, force: true })
    }
    catch {
      // Ignore cleanup errors
    }
  }
  process.chdir(cwd)
}

before(async () => {
  assert.ok(putParams, 'S3 file put module is present')

  aws = await awsLite({ region: 'us-west-2', plugins: [ import('@aws-lite/s3') ] })
  awsLite.testing.enable()
  assert.ok(awsLite.testing.isEnabled(), 'AWS client testing enabled')
})

test('Basic publish test', (t, done) => {
  setup(createFileData(true)) // True mutates file contents, causing an upload
  awsLite.testing.mock('S3.HeadObject', headObject)
  awsLite.testing.mock('S3.PutObject', {})

  putParams(params(), (err, uploaded, notModified) => {
    if (err) assert.fail(err)
    let headObjCalls = awsLite.testing.getAllRequests('S3.HeadObject')
    let putObjCalls = awsLite.testing.getAllRequests('S3.PutObject')
    let headCallsAreGood =  (headObjCalls.length === files.length) &&
                            files.every(f => headObjCalls.some(h => h.request.Key === pathToUnix(f)))
    let putCallsAreGood =   (putObjCalls.length === files.length) &&
                            files.every(f => putObjCalls.some(h => h.request.Key === pathToUnix(f)))
    assert.ok(headCallsAreGood, 'S3.HeadObject called once for each file')
    assert.ok(putCallsAreGood, 'S3.PutObject called once for each file')
    assert.strictEqual(notModified, 0, 'Returned correct quantity of skipped files')
    assert.strictEqual(putObjCalls.length, uploaded, 'Returned correct quantity of published files')
    reset()
    done()
  })
})

test('Skip publishing files that have not been updated', (t, done) => {
  setup(createFileData())
  awsLite.testing.mock('S3.HeadObject', headObject)
  awsLite.testing.mock('S3.PutObject', {})

  putParams(params(), (err, uploaded, notModified) => {
    if (err) assert.fail(err)
    let headObjCalls = awsLite.testing.getAllRequests('S3.HeadObject')
    let putObjCalls = awsLite.testing.getAllRequests('S3.PutObject')
    let headCallsAreGood =  (headObjCalls.length === files.length) &&
                            files.every(f => headObjCalls.some(h => h.request.Key === pathToUnix(f)))
    assert.ok(headCallsAreGood, 'S3.HeadObject called once for each file')
    assert.strictEqual(putObjCalls.length, 0, 'S3.PutObject not called on updated files')
    assert.strictEqual(headObjCalls.length, notModified, 'Returned correct quantity of skipped files')
    assert.strictEqual(putObjCalls.length, uploaded, 'Returned correct quantity of published files')
    reset()
    done()
  })
})

test('Re-publish files if cache-control header does not match', (t, done) => {
  setup(createFileData())
  awsLite.testing.mock('S3.HeadObject', headObject)
  awsLite.testing.mock('S3.PutObject', {})

  CacheControl = 'foo'
  putParams({ fingerprint: 'external', ...params() }, (err, uploaded, notModified) => {
    if (err) assert.fail(err)
    let headObjCalls = awsLite.testing.getAllRequests('S3.HeadObject')
    let putObjCalls = awsLite.testing.getAllRequests('S3.PutObject')
    let headCallsAreGood =  (headObjCalls.length === files.length) &&
                            files.every(f => headObjCalls.some(h => h.request.Key === pathToUnix(f)))
    let putCallsAreGood =   (putObjCalls.length === files.length) &&
                            files.every(f => putObjCalls.some(h => h.request.Key === pathToUnix(f)))
    assert.ok(headCallsAreGood, 'S3.HeadObject called once for each file')
    assert.ok(putCallsAreGood, 'S3.PutObject called once for each file')
    assert.strictEqual(notModified, 0, 'Returned correct quantity of skipped files')
    assert.strictEqual(putObjCalls.length, uploaded, 'Returned correct quantity of published files')
    reset()
    done()
  })
})

test('Teardown', () => {
  awsLite.testing.disable()
  assert.ok(!awsLite.testing.isEnabled(), 'Done')
})
