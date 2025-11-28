const { test, before } = require('node:test')
const assert = require('node:assert/strict')
const flags = require('../../src/cli/flags')
let argv
const args = s => process.argv = [ 'fake-env', 'fake-file', ...s.split(' ').filter(Boolean) ]

before(() => {
  argv = process.argv
})

test('Direct deploys', () => {
  args('--direct')
  assert.ok(flags().isDirect, '"--direct" flag sets isDirect')

  args('--dirty')
  assert.ok(flags().isDirect, '"--dirty" flag sets isDirect')
})

test('Direct deploy source dirs', () => {
  let dirA = 'src', dirB = 'test'

  args(dirA)
  assert.ok(!flags().srcDirs, 'Specifying a source dir without the direct flag does nothing')

  args(`--direct src`)
  assert.deepStrictEqual(flags().srcDirs, [ dirA ], 'Specifying a real dir with the --direct flag returns srcDirs')

  args(`--dirty src`)
  assert.deepStrictEqual(flags().srcDirs, [ dirA ], 'Specifying a real dir with the --dirty flag returns srcDirs')

  args(`--direct idk`)
  assert.deepStrictEqual(flags().srcDirs, [], 'Specifying a missing dir with the --direct flag returns an empty array')

  args(`--direct src --direct test`)
  assert.deepStrictEqual(flags().srcDirs, [ dirA, dirB ], 'Specifying real dirs with --direct flags returns multiple srcDirs')

  args(`--direct src test`)
  assert.deepStrictEqual(flags().srcDirs, [ dirA, dirB ], 'Specifying real dirs with --direct flag returns multiple srcDirs')
})

test('Dry-run / eject option', () => {
  args('--dry-run')
  assert.ok(flags().isDryRun, '"--dry-run" flag sets isDryRun')

  args('--eject')
  assert.ok(flags().isDryRun, '"eject" flag sets isDryRun')
  assert.ok(flags().eject, '"eject" flag sets eject')
})

test('Production deploys', () => {
  args('--production')
  assert.ok(flags().production, '"--production" flag sets production')

  args('-p')
  assert.ok(flags().production, '"-p" flag sets production')
})

test('Inventory deployStage (super important!)', () => {
  args('')
  assert.strictEqual(flags().deployStage, 'staging', 'No flags default deployStage to staging')

  args('--production')
  assert.strictEqual(flags().deployStage, 'production', '"--production" flag sets deployStage to production')

  args('-p')
  assert.strictEqual(flags().deployStage, 'production', '"-p" flag sets deployStage to production')
})

test('Static asset deploys', () => {
  args('--static')
  assert.ok(flags().isStatic, '"--static" flag sets isStatic')

  args('-s')
  assert.ok(flags().isStatic, '"-s" flag sets isStatic')
})

test('Hydration enabled / disabled', () => {
  args('--no-hydrate')
  assert.strictEqual(flags().shouldHydrate, false, '"--no-hydrate" flag sets shouldHydrate to false')

  args('')
  assert.strictEqual(flags().shouldHydrate, true, 'Lack of "--no-hydrate" flag sets shouldHydrate to true')
})

test('Tags', () => {
  let tagA = 'foo', tagB = 'bar'

  args(``)
  assert.deepStrictEqual(flags().tags, [], 'Lack of "--tag" flag returns an empty array')

  args(`--tag ${tagA}`)
  assert.deepStrictEqual(flags().tags, [ tagA ], '"--tag" flag returns a tag')

  args(`--tag ${tagA} --tag ${tagB}`)
  assert.deepStrictEqual(flags().tags, [ tagA, tagB ], '"--tag" flags returns multiple tags')

  args(`--tags ${tagA}`)
  assert.deepStrictEqual(flags().tags, [ tagA ], '"--tags" flag returns a tag')

  args(`--tags ${tagA} --tags ${tagB}`)
  assert.deepStrictEqual(flags().tags, [ tagA, tagB ], '"--tags" flags returns multiple tags')

  args(`-t ${tagA}`)
  assert.deepStrictEqual(flags().tags, [ tagA ], '"-t" flag returns a tag')

  args(`-t ${tagA} -t ${tagB}`)
  assert.deepStrictEqual(flags().tags, [ tagA, tagB ], '"-t" flags returns multiple tags')
})

test('Teardown', () => {
  process.argv = argv
  assert.ok(true, 'Done!')
})
