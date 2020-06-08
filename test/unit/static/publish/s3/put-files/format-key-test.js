let test = require('tape')
let { join } = require('path')

let filePath = join(process.cwd(), 'src', 'static', 'publish', 's3', 'put-files', 'format-key.js')
let sut = require(filePath)

let defaultParams = () => ({
  file: 'index.html',
  fingerprint: false,
  publicDir: 'public',
  prefix: undefined,
  staticManifest: {}
})

test('Module is present', t => {
  t.plan(1)
  t.ok(sut, 'Publish module is present')
})

test('Key pathing', t => {
  t.plan(2)

  let params = defaultParams()
  params.file = 'public/index.html'
  let Key = sut(params)
  t.equal(Key, 'index.html', 'Removed static folder from file path')

  params = defaultParams()
  params.file = '/public/index.html'
  Key = sut(params)
  t.equal(Key, 'index.html', 'Removed leading slash from file path')
})

test('Fingerprint key', t => {
  t.plan(2)

  let params = defaultParams()
  params.file = 'static.json'
  params.fingerprint = true
  params.staticManifest = {
    'index.html': 'index-a1b2c.html'
  }
  let Key = sut(params)
  t.equal(Key, 'static.json', 'Did not fingerprint static.json')

  params = defaultParams()
  params.fingerprint = true
  params.staticManifest = {
    'index.html': 'index-a1b2c.html'
  }
  Key = sut(params)
  t.equal(Key, 'index-a1b2c.html', 'Fingerprinted filename')
})

test('Prefix key', t => {
  t.plan(2)

  let params = defaultParams()
  params.prefix = 'some-folder'
  let Key = sut(params)
  t.equal(Key, 'some-folder/index.html', 'Prepended prefix to filename')

  params = defaultParams()
  params.prefix = 'some-folder'
  params.fingerprint = true
  params.staticManifest = {
    'index.html': 'index-a1b2c.html'
  }
  Key = sut(params)
  t.equal(Key, 'some-folder/index-a1b2c.html', `Prepended prefix to fingerprinted filename" ${Key}`)
})
