let test = require('tape')
let options = require('../../src/options')

test('should return three dirty option varieties', t => {
  t.plan(3)
  t.ok(options(['arc', 'deploy', 'dirty', 'staging']).isDirty, '"dirty" param sets isDirty')
  t.ok(options(['arc', 'deploy', '--dirty', 'staging']).isDirty, '"--dirty" param sets isDirty')
  t.ok(options(['arc', 'deploy', '-d', 'staging']).isDirty, '"-d" param sets isDirty')
})

test('should return dryrun option', t => {
  t.plan(1)
  t.ok(options(['arc', 'deploy', '--dry-run', 'staging']).isDryRun, '"--dry-run" param sets isDryRun')
})

test('should return three production option varieties', t => {
  t.plan(3)
  t.ok(options(['arc', 'deploy', 'production']).production, '"production" param sets production')
  t.ok(options(['arc', 'deploy', '--production']).production, '"--production" param sets production')
  t.ok(options(['arc', 'deploy', '-p']).production, '"-p" param sets production')
})

test('should return any directories under `src/` specified via `srcDirs`', t => {
  t.plan(1)
  let dirs = options(['arc', 'deploy', 'src']).srcDirs
  t.ok(dirs.includes('src'),  'able to identify local "src" dir')
})
