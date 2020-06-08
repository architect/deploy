let test = require('tape')
let { join } = require('path')
let aws = require('aws-sdk-mock')

let listObjCalls = []
let delObjCalls = []
let filesOnS3 = { Contents: [] }
aws.mock('S3', 'listObjectsV2', (params, callback) => {
  listObjCalls.push(params)
  callback(null, filesOnS3)
})
aws.mock('S3', 'deleteObjects', (params, callback) => {
  delObjCalls.push(params)
  callback(null, { Deleted: params.Delete.Objects })
})

let files = [
  'index.html',
  'something.json',
  'index.js',
]
let localFiles = arr => arr.map(f => join(join(process.cwd(), 'public', f)))
let defaultParams = () => ({
  Bucket: 'a-bucket',
  files: localFiles(files),
  fingerprint: false,
  folder: 'public',
  prefix: undefined,
  region: 'us-west-1',
  staticManifest: {}
})

let filePath = join(process.cwd(), 'src', 'static', 'publish', 's3', 'delete-files')
let sut = require(filePath)

function reset () {
  listObjCalls = []
  delObjCalls = []
  filesOnS3 = { Contents: [] }
}

test('Module is present', t => {
  t.plan(1)
  t.ok(sut, 'S3 file delete module is present')
})

test('Do not prune if there is nothing to prune', t => {
  t.plan(2)

  let params = defaultParams()
  filesOnS3 = { Contents: files.map(Key => ({ Key })) }
  sut(params, err => {
    if (err) t.fail(err)
    t.equal(listObjCalls.length, 1, 'S3.listObjectsV2 called once')
    t.equal(delObjCalls.length, 0, 'S3.deleteObjects not called')
    reset()
  })
})

test('Prune if there is something to prune', t => {
  t.plan(3)

  let params = defaultParams()
  params.files.pop() // Create a pruning opportunity
  filesOnS3 = { Contents: files.map(Key => ({ Key })) }
  sut(params, err => {
    if (err) t.fail(err)
    t.equal(listObjCalls.length, 1, 'S3.listObjectsV2 called once')
    t.equal(delObjCalls.length, 1, 'S3.deleteObjects called once')
    t.equal(delObjCalls[0].Delete.Objects[0].Key, files[files.length - 1], `Pruned correct file: ${files[files.length - 1]}`)
    reset()
  })
})

test('Prune respects prefix setting', t => {
  t.plan(3)

  let params = defaultParams()
  let prefix = 'a-prefix'
  params.prefix = prefix
  params.files.pop() // Create a pruning opportunity
  filesOnS3 = { Contents: files.map(Key => ({ Key: `${prefix}/${Key}` })) }
  sut(params, err => {
    if (err) t.fail(err)
    t.equal(listObjCalls.length, 1, 'S3.listObjectsV2 called once')
    t.equal(delObjCalls.length, 1, 'S3.deleteObjects called once')
    let file = `${prefix}/${files[files.length - 1]}`
    t.equal(delObjCalls[0].Delete.Objects[0].Key, file, `Pruned correct file: ${file}`)
    reset()
  })
})

test('Prune respects fingerprint setting', t => {
  t.plan(3)

  let params = defaultParams()
  params.fingerprint = true
  params.staticManifest = {
    'index.html': 'index-df330f3f12.html',
    'something.json': 'something-df330f3f12.json'
  }
  params.files.pop() // Create a pruning opportunity
  let pruneThis = 'index-df330f3f12.js'
  filesOnS3 = { Contents: [
    { Key: 'index-df330f3f12.html' },
    { Key: 'something-df330f3f12.json' },
    { Key: pruneThis }
  ]}
  sut(params, err => {
    if (err) t.fail(err)
    t.equal(listObjCalls.length, 1, 'S3.listObjectsV2 called once')
    t.equal(delObjCalls.length, 1, 'S3.deleteObjects called once')
    t.equal(delObjCalls[0].Delete.Objects[0].Key, pruneThis, `Pruned correct file: ${pruneThis}`)
    reset()
  })
})

test('Prune respects both prefix & fingerprint settings together', t => {
  t.plan(3)

  let params = defaultParams()
  let prefix = 'a-prefix'
  params.prefix = prefix
  params.fingerprint = true
  params.staticManifest = {
    [`${prefix}/index.html`]: `${prefix}/index-df330f3f12.html`,
    [`${prefix}/something.json`]: `${prefix}/something-df330f3f12.json`
  }
  params.files.pop() // Create a pruning opportunity
  let pruneThis = `${prefix}/index-df330f3f12.js`
  filesOnS3 = { Contents: [
    { Key: `${prefix}/index-df330f3f12.html`, },
    { Key: `${prefix}/something-df330f3f12.json` },
    { Key: pruneThis }
  ]}
  sut(params, err => {
    if (err) t.fail(err)
    t.equal(listObjCalls.length, 1, 'S3.listObjectsV2 called once')
    t.equal(delObjCalls.length, 1, 'S3.deleteObjects called once')
    t.equal(delObjCalls[0].Delete.Objects[0].Key, pruneThis, `Pruned correct file: ${pruneThis}`)
    reset()
  })
})

test('Prune respects both prefix & fingerprint settings together in nested folders', t => {
  t.plan(3)

  let params = defaultParams()
  let prefix = 'a-prefix'
  params.prefix = prefix
  params.files = [
    'index.html',
    'a-folder/something.json',
  ]
  params.fingerprint = true
  params.staticManifest = {
    [`${prefix}/index.html`]: `${prefix}/index-df330f3f12.html`,
    [`${prefix}/a-folder/something.json`]: `${prefix}/a-folder/something-df330f3f12.json`
  }
  let pruneThis = `${prefix}/a-folder/index-df330f3f12.js`
  filesOnS3 = { Contents: [
    { Key: `${prefix}/index-df330f3f12.html`, },
    { Key: `${prefix}/a-folder/something-df330f3f12.json` },
    { Key: pruneThis }
  ]}
  sut(params, err => {
    if (err) t.fail(err)
    t.equal(listObjCalls.length, 1, 'S3.listObjectsV2 called once')
    t.equal(delObjCalls.length, 1, 'S3.deleteObjects called once')
    t.equal(delObjCalls[0].Delete.Objects[0].Key, pruneThis, `Pruned correct file: ${pruneThis}`)
    reset()
  })
})
