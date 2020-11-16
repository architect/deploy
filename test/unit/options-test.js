let test = require('tape')
let options = require('../../src/options')

test('should return isDirect option', t => {
  t.plan(3)
  t.ok(options([ 'arc', 'deploy', 'direct', 'staging' ]).isDirect, '"direct" param sets isDirect')
  t.ok(options([ 'arc', 'deploy', '--direct', 'staging' ]).isDirect, '"--direct" param sets isDirect')
  t.ok(options([ 'arc', 'deploy', '-d', 'staging' ]).isDirect, '"-d" param sets isDirect')
})

test('should return isDryRun option', t => {
  t.plan(1)
  t.ok(options([ 'arc', 'deploy', '--dry-run', 'staging' ]).isDryRun, '"--dry-run" param sets isDryRun')
})

test('should return production option', t => {
  t.plan(3)
  t.ok(options([ 'arc', 'deploy', 'production' ]).production, '"production" param sets production')
  t.ok(options([ 'arc', 'deploy', '--production' ]).production, '"--production" param sets production')
  t.ok(options([ 'arc', 'deploy', '-p' ]).production, '"-p" param sets production')
})

test('should return isStatic option', t => {
  t.plan(3)
  t.ok(options([ 'arc', 'deploy', 'static' ]).isStatic, '"static" param sets isStatic')
  t.ok(options([ 'arc', 'deploy', '--static' ]).isStatic, '"--static" param sets isStatic')
  t.ok(options([ 'arc', 'deploy', '-s' ]).isStatic, '"-s" param sets isStatic')
})

test('should return apiType', t => {
  t.plan(1)
  t.equal(options([ 'arc', 'deploy', '--apigateway', 'http' ]).apiType, 'http', '"--apigatewa" param sets isStatic')
})

test('should return tags', t => {
  t.plan(6)
  let tag = 'foo=bar'
  t.ok(options([ 'arc', 'deploy', 'tags', tag ]).tags.includes(tag), '"tags" param sets tags')
  t.ok(options([ 'arc', 'deploy', '--tags', tag ]).tags.includes(tag), '"--tags" param sets tags')
  t.ok(options([ 'arc', 'deploy', '-t', tag ]).tags.includes(tag), '"-t" param sets tags')
  t.equal(options([ 'arc', 'deploy', '-t', tag, tag ]).tags.length, 2, 'tags param can set multiple tags')

  let sideEffects = options([ 'arc', 'deploy', '--static', 'tags', tag, '--name', 'yo' ])
  t.ok(sideEffects.tags.includes(tag), `tags works with other flags`)
  t.equal(sideEffects.name, 'yo', `tags doesn't introduce side effects`)
})

test('should return any directories under `src/` specified via `srcDirs`', t => {
  t.plan(1)
  let dirs = options([ 'arc', 'deploy', 'src' ]).srcDirs
  t.ok(dirs.includes('src'), 'able to identify local "src" dir')
})
