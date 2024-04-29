let test = require('tape')
let { join } = require('path')

let filePath = join(process.cwd(), 'src', 'static', 'publish', 'filter-files.js')
let sut = require(filePath)

test('Module is present', t => {
  t.plan(1)
  t.ok(sut, 'File filter module is present')
})

test('File filtering', t => {
  t.plan(5)

  let globbed = [
    'public/index.html',
    'public/static.json',
    'public/something.json',
  ]
  let ignore = []

  sut({ globbed, ignore }, (err, filtered) => {
    if (err) t.fail(err)
    t.equal(filtered.length, 2, 'Correct files ignored')
    t.notOk(filtered.includes(globbed[1]), 'static.json ignored')
  })

  let file = 'public/some-file.txt'
  globbed.push(file)
  ignore.push(file)
  sut({ globbed, ignore }, (err, filtered) => {
    if (err) t.fail(err)
    t.ok(globbed.length === 4 && ignore.length === 1, 'New file was passed to files + ignore list')
    t.equal(filtered.length, 2, 'New file was ignored')
    t.notOk(filtered.includes(globbed[1]), 'static.json ignored')
  })
})
