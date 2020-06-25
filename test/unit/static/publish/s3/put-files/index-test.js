let test = require('tape')
let proxyquire = require('proxyquire')
let { join } = require('path')
let aws = require('aws-sdk')
let awsMock = require('aws-sdk-mock')
let crypto = require('crypto')
let mockFs

let headObjCalls = []
let putObjCalls = []
awsMock.mock('S3', 'headObject', (params, callback) => {
  headObjCalls.push(params)
  let hash = crypto.createHash('md5').update(fileData[params.Key]).digest("hex")
  let ETag = `"${hash}"`
  callback(null, { ETag })
})
awsMock.mock('S3', 'putObject', (params, callback) => {
  putObjCalls.push(params)
  callback()
})

function createFileData (diff) {
  return {
    'index.html': Buffer.from(`this is index.html + ${diff ? 'diff' : 'no diff'}`),
    'static.json': Buffer.from(`this is static.json + ${diff ? 'diff' : 'no diff'}`),
    'something.json': Buffer.from(`this is something.json + ${diff ? 'diff' : 'no diff'}`),
    'index.js': Buffer.from(`this is index.js + ${diff ? 'diff' : 'no diff'}`),
  }
}
// Benchmark file data to compare against in headObject calls
let fileData = createFileData()
let files = Object.keys(fileData)

let s3 = new aws.S3()
let params = {
  Bucket: 'a-bucket',
  files,
  fingerprint: false,
  publicDir: 'public',
  prefix: undefined,
  region: 'us-west-1',
  s3,
  staticManifest: {}
}

let putParams = ({ Bucket, Key }) => ({
  Bucket, Key
})

let filePath = join(process.cwd(), 'src', 'static', 'publish', 's3', 'put-files')
let sut = proxyquire(filePath, {
  './put-params': putParams
})

function setup (data) {
  mockFs(data)
}

function reset () {
  headObjCalls = []
  putObjCalls = []
  mockFs.restore()
}

test('Module is present', t => {
  t.plan(1)
  t.ok(sut, 'S3 file put module is present')

  // Set up mock-fs here outside global scope or it may blow up aws-sdk
  // eslint-disable-next-line
  mockFs = require('mock-fs')
})

test('Basic publish test', t => {
  t.plan(4)
  setup(createFileData(true)) // True mutates file contents, causing an upload

  sut(params, (err, uploaded, notModified) => {
    if (err) t.fail(err)
    let headCallsAreGood =  (headObjCalls.length === files.length) &&
                            files.every(f => headObjCalls.some(h => h.Key === f))
    let putCallsAreGood =   (putObjCalls.length === files.length) &&
                            files.every(f => putObjCalls.some(h => h.Key === f))
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

  sut(params, (err, uploaded, notModified) => {
    if (err) t.fail(err)
    let headCallsAreGood =  (headObjCalls.length === files.length) &&
                            files.every(f => headObjCalls.some(h => h.Key === f))
    t.ok(headCallsAreGood, 'S3.headObject called once for each file')
    t.equal(putObjCalls.length, 0, 'S3.putObject not called on updated files')
    t.equal(headObjCalls.length, notModified, 'Returned correct quantity of skipped files')
    t.equal(putObjCalls.length, uploaded, 'Returned correct quantity of published files')
    reset()
  })
})

test('Teardown', t => {
  t.plan(1)
  awsMock.restore()
  t.pass('Done')
})
