let test = require('tape')
let mockFs = require('mock-fs')
let proxyquire = require('proxyquire')
let { join, sep } = require('path')
require('aws-sdk/lib/maintenance_mode_message').suppress = true
let aws = require('aws-sdk')
let awsMock = require('aws-sdk-mock')
let crypto = require('crypto')
let { pathToUnix } = require('@architect/utils')

let headObjCalls = []
let putObjCalls = []
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
let files = Object.keys(fileData).map(f => f.replace('/', sep))
let update = () => {}
update.raw = () => {}

let params = {
  Bucket: 'a-bucket',
  files,
  fingerprint: false,
  publicDir: 'public',
  prefix: undefined,
  region: 'us-west-1',
  staticManifest: {},
  update,
}

let _putParams = ({ Bucket, Key, Body }) => ({
  Bucket, Key, Body,
})

let filePath = join(process.cwd(), 'src', 'static', 'publish', 's3', 'put-files')
let putParams = proxyquire(filePath, {
  './put-params': _putParams
})

function setup (data) {
  headObjCalls = []
  putObjCalls = []
  CacheControl = undefined
  mockFs(data)
}

function reset () {
  mockFs.restore()
}

test('Set up env', t => {
  t.plan(1)
  t.ok(putParams, 'S3 file put module is present')

  awsMock.mock('S3', 'headObject', (params, callback) => {
    headObjCalls.push(params)
    let hash = crypto.createHash('md5').update(fileData[params.Key]).digest('hex')
    let ETag = `"${hash}"` // AWS double quotes because lol
    callback(null, { ETag, CacheControl })
  })
  awsMock.mock('S3', 'putObject', (params, callback) => {
    putObjCalls.push(params)
    callback()
  })
  params.s3 = new aws.S3()
})

test('Basic publish test', t => {
  t.plan(4)
  setup(createFileData(true)) // True mutates file contents, causing an upload

  putParams(params, (err, uploaded, notModified) => {
    reset() // Must be reset before any tape tests are resolved because mock-fs#201
    if (err) t.fail(err)
    let headCallsAreGood =  (headObjCalls.length === files.length) &&
                            files.every(f => headObjCalls.some(h => h.Key === pathToUnix(f)))
    let putCallsAreGood =   (putObjCalls.length === files.length) &&
                            files.every(f => putObjCalls.some(h => h.Key === pathToUnix(f)))
    t.ok(headCallsAreGood, 'S3.headObject called once for each file')
    t.ok(putCallsAreGood, 'S3.putObject called once for each file')
    t.equal(notModified, 0, 'Returned correct quantity of skipped files')
    t.equal(putObjCalls.length, uploaded, 'Returned correct quantity of published files')
    reset()
  })
})

test('Skip publishing files that have not been updated', t => {
  t.plan(4)
  setup(createFileData())

  putParams(params, (err, uploaded, notModified) => {
    reset() // Must be reset before any tape tests are resolved because mock-fs#201
    if (err) t.fail(err)
    let headCallsAreGood =  (headObjCalls.length === files.length) &&
                            files.every(f => headObjCalls.some(h => h.Key === pathToUnix(f)))
    t.ok(headCallsAreGood, 'S3.headObject called once for each file')
    t.equal(putObjCalls.length, 0, 'S3.putObject not called on updated files')
    t.equal(headObjCalls.length, notModified, 'Returned correct quantity of skipped files')
    t.equal(putObjCalls.length, uploaded, 'Returned correct quantity of published files')
    reset()
  })
})

test('Re-publish files if cache-control header does not match', t => {
  t.plan(4)
  setup(createFileData())

  CacheControl = 'foo'
  putParams({ fingerprint: 'external', ...params }, (err, uploaded, notModified) => {
    reset() // Must be reset before any tape tests are resolved because mock-fs#201
    if (err) t.fail(err)
    let headCallsAreGood =  (headObjCalls.length === files.length) &&
                            files.every(f => headObjCalls.some(h => h.Key === pathToUnix(f)))
    let putCallsAreGood =   (putObjCalls.length === files.length) &&
                            files.every(f => putObjCalls.some(h => h.Key === pathToUnix(f)))
    t.ok(headCallsAreGood, 'S3.headObject called once for each file')
    t.ok(putCallsAreGood, 'S3.putObject called once for each file')
    t.equal(notModified, 0, 'Returned correct quantity of skipped files')
    t.equal(putObjCalls.length, uploaded, 'Returned correct quantity of published files')
  })
})

test('Teardown', t => {
  t.plan(1)
  awsMock.restore()
  reset()
  t.pass('Done')
})
