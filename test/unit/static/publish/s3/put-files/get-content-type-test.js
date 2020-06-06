let test = require('tape')
let { join } = require('path')

let filePath = join(process.cwd(), 'src', 'static', 'publish', 's3', 'put-files', 'get-content-type.js')
let sut = require(filePath)

test('Module is present', t => {
  t.plan(1)
  t.ok(sut, 'Content type module is present')
})

test('Content types', t => {
  t.plan(6)

  // Not intended to be thorough, but just checking a handful of important ones to make sure things are good
  let type = sut('index.html')
  t.equal(type, 'text/html', `Got correct mime type for html: ${type}`)

  type = sut('something.json')
  t.equal(type, 'application/json', `Got correct mime type for json: ${type}`)

  type = sut('lol.gif')
  t.equal(type, 'image/gif', `Got correct mime type for image: ${type}`)

  type = sut('index.tsx')
  t.equal(type, 'text/tsx', `Got correct mime type for tsx file: ${type}`)

  type = sut('index.ts')
  t.equal(type, 'text/typescript', `Got correct mime type for ts file: ${type}`)

  type = sut('file')
  t.equal(type, 'application/octet-stream', `Got default for unknown file type: ${type}`)
})
