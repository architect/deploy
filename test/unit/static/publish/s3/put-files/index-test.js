let test = require('tape')
let proxyquire = require('proxyquire')
let { join } = require('path')
let aws = require('aws-sdk-mock')

let headObjCalls = []
let putObjCalls = []
let head = {}
aws.mock('S3', 'headObject', (params, callback) => {
  headObjCalls.push(params)
  callback(null, head)
})
aws.mock('S3', 'putObject', (params, callback) => {
  putObjCalls.push(params)
  callback()
})

let files = [
  'index.html',
  'static.json',
  'something.json',
  'index.js',
]
let params = {
  Bucket: 'a-bucket',
  files,
  fingerprint: false,
  publicDir: 'public',
  prefix: undefined,
  region: 'us-west-1',
  staticManifest: {}
}

let lstat = new Date()
let lstatSync = () => lstat

let putParams = ({ Bucket, Key }) => ({
  Bucket, Key
})

let filePath = join(process.cwd(), 'src', 'static', 'publish', 's3', 'put-files')
let sut = proxyquire(filePath, {
  fs: { lstatSync },
  './put-params': putParams
})

function reset () {
  headObjCalls = []
  putObjCalls = []
  head = {}
}

test('Module is present', t => {
  t.plan(1)
  t.ok(sut, 'S3 file put module is present')
})

test('Basic publish test', t => {
  t.plan(4)

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

  head = { LastModified: lstat++ }

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
  aws.restore('S3')
  t.pass('Done')
})
