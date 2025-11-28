const { test, after } = require('node:test')
const assert = require('node:assert/strict')
const { join } = require('path')
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('fs')
const { tmpdir } = require('os')
const inventory = require('@architect/inventory')
const { updater } = require('@architect/utils')

let tmpDirs = []

function createTmpDir (structure) {
  const tmpDir = mkdtempSync(join(tmpdir(), 'arc-test-'))
  tmpDirs.push(tmpDir)
  const { dirname } = require('path')

  function createStructure (base, obj) {
    for (const [ key, value ] of Object.entries(obj)) {
      const path = join(base, key)
      if (typeof value === 'object' && value !== null && !Buffer.isBuffer(value)) {
        mkdirSync(path, { recursive: true })
        createStructure(path, value)
      }
      else {
        // Ensure parent directory exists for files
        const dir = dirname(path)
        mkdirSync(dir, { recursive: true })
        writeFileSync(path, value || '')
      }
    }
  }

  createStructure(tmpDir, structure)
  return tmpDir
}

after(() => {
  tmpDirs.forEach(dir => {
    try {
      rmSync(dir, { recursive: true, force: true })
    }
    catch {
      // Ignore cleanup errors
    }
  })
})

let published
function publish (params, callback) {
  published = params
  callback(null, params)
}

// Mock the publish module using Module._load interception
const Module = require('module')
const originalLoad = Module._load
Module._load = function (request, parent) {
  if (request === './publish' && parent.filename.includes('src/static/index.js')) {
    return publish
  }
  return originalLoad.apply(this, arguments)
}

const staticDeployMod = require(join(process.cwd(), 'src', 'static', 'index.js'))

let defaultParams = () => ({
  bucket: 'a-bucket',
  isDryRun: false,
  name: 'an-app',
  production: false,
  region: 'us-west-1',
  stackname: undefined,
  update: updater('Deploy'),
  verbose: undefined,
  // `@static` settings
  prefix: undefined,
  prune: false,
})
let params = defaultParams()

function setup () {
  published = undefined
}
function reset () {
  params = defaultParams()
}

function staticDeploy (cwd, callback) {
  inventory({ cwd }, function (err, result) {
    if (err) callback(err)
    else {
      params.inventory = result
      staticDeployMod(params, err => {
        reset()
        callback(err)
      })
    }
  })
}

/**
 * Notes:
 * - Also, it'd be nice to test the CloudFormation stackname code path
 */
test('Set up env', () => {
  assert.ok(staticDeployMod, 'Static asset deployment module is present')
})

test(`Skip static deploy if @static isn't defined`, (t, done) => {
  setup()
  let arc = '@app\n an-app'
  let cwd = createTmpDir({ 'app.arc': arc })
  staticDeploy(cwd, err => {
    if (err) assert.fail(err)
    assert.ok(!published, 'Publish not called')
    done()
  })
})

test(`Static deploy exits gracefully if @http is defined, but public/ folder is not present`, (t, done) => {
  setup()
  let arc = '@app\n an-app\n @http'
  let cwd = createTmpDir({ 'app.arc': arc })
  staticDeploy(cwd, err => {
    if (err) assert.fail(err)
    assert.ok(!published, 'Publish not called')
    done()
  })
})

test(`Publish static deploy if @static is defined`, (t, done) => {
  setup()
  let arc = '@app\n an-app\n @static'
  let cwd = createTmpDir({
    'app.arc': arc,
    'public': {},
  })
  staticDeploy(cwd, err => {
    if (err) assert.fail(err)
    assert.strictEqual(published.Bucket, params.bucket, 'Bucket is unchanged')
    assert.strictEqual(published.prefix, null, 'Prefix set to null by default')
    assert.strictEqual(published.prune, null, 'Prune set to null by default')
    assert.strictEqual(published.region, params.region, 'Region is unchaged')
    done()
  })
})

test(`Publish static deploy if @http is defined and public/ folder is present`, (t, done) => {
  setup()
  let arc = '@app\n an-app\n @http'
  let cwd = createTmpDir({ 'app.arc': arc, 'public': {} })
  staticDeploy(cwd, err => {
    if (err) assert.fail(err)
    assert.ok(published, 'Publish was called')
    done()
  })
})

test(`Respect prune param`, (t, done) => {
  setup()
  let arc = '@app\n an-app\n @static'
  let cwd = createTmpDir({ 'app.arc': arc, 'public': {} })
  params.prune = true
  staticDeploy(cwd, err => {
    if (err) assert.fail(err)
    assert.ok(published.prune, 'Prune is unchaged')
    done()
  })
})

test(`Respect prune setting in project manifest`, (t, done) => {
  setup()
  let arc = '@app\n an-app\n @static\n prune true'
  let cwd = createTmpDir({ 'app.arc': arc, 'public': {} })
  staticDeploy(cwd, err => {
    if (err) assert.fail(err)
    assert.ok(published.prune, 'Prune is enabled')
    done()
  })
})

test(`Respect prefix param`, (t, done) => {
  setup()
  let arc = '@app\n an-app\n @static'
  let cwd = createTmpDir({ 'app.arc': arc, 'public': {} })
  params.prefix = 'some-prefix'
  staticDeploy(cwd, err => {
    if (err) assert.fail(err)
    assert.strictEqual(published.prefix, 'some-prefix', 'Prefix is unchanged')
    done()
  })
})

test(`Respect prefix setting in project manifest`, (t, done) => {
  setup()
  let arc = '@app\n an-app\n @static\n prefix some-prefix'
  let cwd = createTmpDir({ 'app.arc': arc, 'public': {} })
  staticDeploy(cwd, err => {
    if (err) assert.fail(err)
    assert.strictEqual(published.prefix, 'some-prefix', 'Got correct prefix setting')
    done()
  })
})

test('Teardown', () => {
  reset()
  assert.ok(true, 'Done')
})
