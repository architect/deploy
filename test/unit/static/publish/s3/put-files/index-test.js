let test = require('tape')
let awsLite = require('@aws-lite/client')
let mockTmp = require('mock-tmp')
let proxyquire = require('proxyquire')
let { join, sep } = require('path')
let crypto = require('crypto')
let { pathToUnix } = require('@architect/utils')
let cwd = process.cwd()
let filePath = join(process.cwd(), 'src', 'static', 'publish', 's3', 'put-files')
let putParams = proxyquire(filePath, {
  './put-params': ({ Bucket, Key, Body }) => ({
    Bucket, Key, Body,
  }),
})

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
  tmp = mockTmp(data)
  files = Object.keys(data).map(f => f.replace('/', sep))
  process.chdir(tmp)
}
function reset () {
  awsLite.testing.reset()
  mockTmp.reset()
  process.chdir(cwd)
}

test('Set up env', async t => {
  t.plan(2)
  t.ok(putParams, 'S3 file put module is present')

  aws = await awsLite({ region: 'us-west-2', plugins: [ import('@aws-lite/s3') ] })
  awsLite.testing.enable()
  t.ok(awsLite.testing.isEnabled(), 'AWS client testing enabled')
})

test('Basic publish test', t => {
  t.plan(4)
  setup(createFileData(true)) // True mutates file contents, causing an upload
  awsLite.testing.mock('S3.HeadObject', headObject)
  awsLite.testing.mock('S3.PutObject', {})

  putParams(params(), (err, uploaded, notModified) => {
    if (err) t.fail(err)
    let headObjCalls = awsLite.testing.getAllRequests('S3.HeadObject')
    let putObjCalls = awsLite.testing.getAllRequests('S3.PutObject')
    let headCallsAreGood =  (headObjCalls.length === files.length) &&
                            files.every(f => headObjCalls.some(h => h.request.Key === pathToUnix(f)))
    let putCallsAreGood =   (putObjCalls.length === files.length) &&
                            files.every(f => putObjCalls.some(h => h.request.Key === pathToUnix(f)))
    t.ok(headCallsAreGood, 'S3.HeadObject called once for each file')
    t.ok(putCallsAreGood, 'S3.PutObject called once for each file')
    t.equal(notModified, 0, 'Returned correct quantity of skipped files')
    t.equal(putObjCalls.length, uploaded, 'Returned correct quantity of published files')
    reset()
  })
})

test('Skip publishing files that have not been updated', t => {
  t.plan(4)
  setup(createFileData())
  awsLite.testing.mock('S3.HeadObject', headObject)
  awsLite.testing.mock('S3.PutObject', {})

  putParams(params(), (err, uploaded, notModified) => {
    if (err) t.fail(err)
    let headObjCalls = awsLite.testing.getAllRequests('S3.HeadObject')
    let putObjCalls = awsLite.testing.getAllRequests('S3.PutObject')
    let headCallsAreGood =  (headObjCalls.length === files.length) &&
                            files.every(f => headObjCalls.some(h => h.request.Key === pathToUnix(f)))
    t.ok(headCallsAreGood, 'S3.HeadObject called once for each file')
    t.equal(putObjCalls.length, 0, 'S3.PutObject not called on updated files')
    t.equal(headObjCalls.length, notModified, 'Returned correct quantity of skipped files')
    t.equal(putObjCalls.length, uploaded, 'Returned correct quantity of published files')
    reset()
  })
})

test('Re-publish files if cache-control header does not match', t => {
  t.plan(4)
  setup(createFileData())
  awsLite.testing.mock('S3.HeadObject', headObject)
  awsLite.testing.mock('S3.PutObject', {})

  CacheControl = 'foo'
  putParams({ fingerprint: 'external', ...params() }, (err, uploaded, notModified) => {
    if (err) t.fail(err)
    let headObjCalls = awsLite.testing.getAllRequests('S3.HeadObject')
    let putObjCalls = awsLite.testing.getAllRequests('S3.PutObject')
    let headCallsAreGood =  (headObjCalls.length === files.length) &&
                            files.every(f => headObjCalls.some(h => h.request.Key === pathToUnix(f)))
    let putCallsAreGood =   (putObjCalls.length === files.length) &&
                            files.every(f => putObjCalls.some(h => h.request.Key === pathToUnix(f)))
    t.ok(headCallsAreGood, 'S3.HeadObject called once for each file')
    t.ok(putCallsAreGood, 'S3.PutObject called once for each file')
    t.equal(notModified, 0, 'Returned correct quantity of skipped files')
    t.equal(putObjCalls.length, uploaded, 'Returned correct quantity of published files')
    reset()
  })
})

test('Teardown', t => {
  t.plan(1)
  awsLite.testing.disable()
  t.notOk(awsLite.testing.isEnabled(), 'Done')
})
