let test = require('tape')
let { join } = require('path')
let mockFs = require('mock-fs')

let filePath = join(process.cwd(), 'src', 'static', 'publish', 's3', 'put-files', 'put-params.js')
let sut = require(filePath)

test('Module is present', t => {
  t.plan(1)
  t.ok(sut, 'S3 put params module is present')
})

test('S3 put params', t => {
  t.plan(9)

  let html = 'public/index.html'
  let json = 'public/something.json'
  let file = 'public/index.js'
  let content = 'hi there'
  mockFs({
    [html]: Buffer.from(content),
    [json]: Buffer.from(content),
    [file]: Buffer.from(content),
  })

  let Bucket = 'some-bucket'
  let params = {
    Bucket,
    Key: 'index.html',
    file: html
  }

  // Basic params
  let result = sut(params)
  t.equal(result.ACL, 'public-read', 'File is set to public-read ACL')
  t.equal(result.Bucket, Bucket, 'Bucket is unchanged')
  t.equal(result.Key, 'index.html', 'Key is unchanged')
  t.equal(result.ContentType, 'text/html', 'Content type properly set')
  t.equal(result.Body.toString(), content, 'File body is present')

  // Ensure anti-caching of HTML + JSON
  let antiCache = 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0'
  t.equal(result.CacheControl, antiCache, `HTML file is anti-cached: ${antiCache}`)

  params.Key = 'something.json'
  params.file = json
  result = sut(params)
  t.equal(result.ContentType, 'application/json', 'Content type properly set')
  t.equal(result.CacheControl, antiCache, `JSON file is anti-cached: ${antiCache}`)

  // Long-lived caching for fingerprinted files
  params.Key = 'index.js'
  params.file = file
  params.fingerprint = true
  result = sut(params)
  t.equal(result.CacheControl, 'max-age=315360000', `Fingerprinted file has long-lived cache: ${result.CacheControl}`)

  mockFs.restore()
})
