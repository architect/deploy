const { test } = require('node:test')
const assert = require('node:assert/strict')
const { join } = require('path')
const { brotliDecompressSync, gunzipSync } = require('zlib')

let filePath = join(process.cwd(), 'src', 'static', 'publish', 's3', 'put-files', 'put-params.js')
let sut = require(filePath)

test('Module is present', () => {
  assert.ok(sut, 'S3 put params module is present')
})

test('S3 put params', () => {
  let html = 'public/index.html'
  let json = 'public/something.json'
  let file = 'public/index.js'
  let Body = Buffer.from('hi there')
  let result

  let Bucket = 'some-bucket'
  let params = {
    Bucket,
    Key: 'index.html',
    Body,
    file: html,
    inventory: { inv: { aws: { apigateway: 'http' } } },
  }

  // Basic params
  result = sut(params)
  assert.strictEqual(result.Bucket, Bucket, 'Bucket is unchanged')
  assert.strictEqual(result.Key, 'index.html', 'Key is unchanged')
  assert.strictEqual(result.ContentType, 'text/html', 'Content type properly set')
  assert.ok(!result.ContentEncoding, 'Content encoding not set')
  assert.strictEqual(result.Body.toString(), Body.toString(), 'File body is present (and uncompressed)')

  // brotli compression (by default)
  params.inventory.inv.static = { compression: true }
  result = sut(params)
  assert.strictEqual(result.Bucket, Bucket, 'Bucket is unchanged')
  assert.strictEqual(result.Key, 'index.html', 'Key is unchanged')
  assert.strictEqual(result.ContentType, 'text/html', 'Content type properly set')
  assert.strictEqual(result.ContentEncoding, 'br', 'Content encoding')
  assert.strictEqual(brotliDecompressSync(result.Body).toString(), Body.toString(), 'File body is present (and brotli compressed)')

  // brotli compression (explicit)
  params.inventory.inv.static = { compression: 'br' }
  result = sut(params)
  assert.strictEqual(result.Bucket, Bucket, 'Bucket is unchanged')
  assert.strictEqual(result.Key, 'index.html', 'Key is unchanged')
  assert.strictEqual(result.ContentType, 'text/html', 'Content type properly set')
  assert.strictEqual(result.ContentEncoding, 'br', 'Content encoding')
  assert.strictEqual(brotliDecompressSync(result.Body).toString(), Body.toString(), 'File body is present (and brotli compressed)')

  // gzip compression
  params.inventory.inv.static = { compression: 'gzip' }
  result = sut(params)
  assert.strictEqual(result.Bucket, Bucket, 'Bucket is unchanged')
  assert.strictEqual(result.Key, 'index.html', 'Key is unchanged')
  assert.strictEqual(result.ContentType, 'text/html', 'Content type properly set')
  assert.strictEqual(result.ContentEncoding, 'gzip', 'Content encoding')
  assert.strictEqual(gunzipSync(result.Body).toString(), Body.toString(), 'File body is present (and gzip compressed)')

  // Reset inventory
  delete params.inventory.inv.static

  // Ensure anti-caching of HTML + JSON
  let antiCache = 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0'
  assert.strictEqual(result.CacheControl, antiCache, `HTML file is anti-cached: ${antiCache}`)

  params.Key = 'something.json'
  params.file = json
  result = sut(params)
  assert.strictEqual(result.ContentType, 'application/json', 'Content type properly set')
  assert.strictEqual(result.CacheControl, antiCache, `JSON file is anti-cached: ${antiCache}`)

  // Long-lived caching for fingerprinted files
  params.Key = 'index.js'
  params.file = file
  params.fingerprint = true
  result = sut(params)
  assert.strictEqual(result.CacheControl, 'max-age=315360000', `Fingerprinted file has long-lived cache: ${result.CacheControl}`)
})
