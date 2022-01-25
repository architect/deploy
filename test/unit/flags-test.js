let test = require('tape')
let flags = require('../../src/cli/flags')
let argv
let args = s => process.argv = [ 'fake-env', 'fake-file', ...s.split(' ').filter(Boolean) ]

test('Set up env', t => {
  t.plan(1)
  argv = process.argv
  t.ok(flags, 'Flags module is present')
})

test('Direct deploys', t => {
  t.plan(2)

  args('--direct')
  t.ok(flags().isDirect, '"--direct" flag sets isDirect')

  args('--dirty')
  t.ok(flags().isDirect, '"--dirty" flag sets isDirect')
})

test('Direct deploy source dirs', t => {
  t.plan(6)
  let dirA = 'src', dirB = 'test'

  args(dirA)
  t.notOk(flags().srcDirs, 'Specifying a source dir without the direct flag does nothing')

  args(`--direct src`)
  t.deepEqual(flags().srcDirs, [ dirA ], 'Specifying a real dir with the --direct flag returns srcDirs')

  args(`--dirty src`)
  t.deepEqual(flags().srcDirs, [ dirA ], 'Specifying a real dir with the --dirty flag returns srcDirs')

  args(`--direct idk`)
  t.deepEqual(flags().srcDirs, [], 'Specifying a missing dir with the --direct flag returns an empty array')

  args(`--direct src --direct test`)
  t.deepEqual(flags().srcDirs, [ dirA, dirB ], 'Specifying real dirs with --direct flags returns multiple srcDirs')

  args(`--direct src test`)
  t.deepEqual(flags().srcDirs, [ dirA, dirB ], 'Specifying real dirs with --direct flag returns multiple srcDirs')
})

test('Dry-run option', t => {
  t.plan(1)

  args('--dry-run')
  t.ok(flags().isDryRun, '"--dry-run" flag sets isDryRun')
})

test('Production deploys', t => {
  t.plan(2)

  args('--production')
  t.ok(flags().production, '"--production" flag sets production')

  args('-p')
  t.ok(flags().production, '"-p" flag sets production')
})

test('Inventory deployStage (super important!)', t => {
  t.plan(3)

  args('')
  t.equal(flags().deployStage, 'staging', 'No flags default deployStage to staging')

  args('--production')
  t.equal(flags().deployStage, 'production', '"--production" flag sets deployStage to production')

  args('-p')
  t.equal(flags().deployStage, 'production', '"-p" flag sets deployStage to production')
})

test('Static asset deploys', t => {
  t.plan(2)

  args('--static')
  t.ok(flags().isStatic, '"--static" flag sets isStatic')

  args('-s')
  t.ok(flags().isStatic, '"-s" flag sets isStatic')
})

test('Hydration enabled / disabled', t => {
  t.plan(2)

  args('--no-hydrate')
  t.equal(flags().shouldHydrate, false, '"--no-hydrate" flag sets shouldHydrate to false')

  args('')
  t.equal(flags().shouldHydrate, true, 'Lack of "--no-hydrate" flag sets shouldHydrate to true')
})

test('Tags', t => {
  t.plan(6)
  let tagA = 'foo', tagB = 'bar'

  args(`--tag ${tagA}`)
  t.deepEqual(flags().tags, [ tagA ], '"--tag" flag returns a tag')

  args(`--tag ${tagA} --tag ${tagB}`)
  t.deepEqual(flags().tags, [ tagA, tagB ], '"--tag" flags returns multiple tags')

  args(`--tags ${tagA}`)
  t.deepEqual(flags().tags, [ tagA ], '"--tags" flag returns a tag')

  args(`--tags ${tagA} --tags ${tagB}`)
  t.deepEqual(flags().tags, [ tagA, tagB ], '"--tags" flags returns multiple tags')

  args(`-t ${tagA}`)
  t.deepEqual(flags().tags, [ tagA ], '"-t" flag returns a tag')

  args(`-t ${tagA} -t ${tagB}`)
  t.deepEqual(flags().tags, [ tagA, tagB ], '"-t" flags returns multiple tags')
})

test('Teardown', t => {
  t.plan(1)
  process.argv = argv
  t.pass('Done!')
})
