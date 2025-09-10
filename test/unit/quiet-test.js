let test = require('tape')
let proxyquire = require('proxyquire')
let awsLite = require('@aws-lite/client')
let inventory = require('@architect/inventory')

// Store original stdout.write to capture output
let originalWrite = process.stdout.write
let capturedOutput = []

function captureOutput () {
  capturedOutput = []
  process.stdout.write = function (chunk, encoding, callback) {
    if (typeof chunk === 'string') {
      capturedOutput.push(chunk.trim())
    }
    if (callback) callback()
    return true
  }
}

function restoreOutput () {
  process.stdout.write = originalWrite
}

function getOutputCount () {
  return capturedOutput.length
}

function getOutputContent () {
  return capturedOutput.join('\n')
}

// Mock AWS client
let mockAwsLite = () => {
  return Promise.resolve({
    cloudformation: {
      DescribeStacks: () => Promise.reject({ message: 'Stack does not exist', statusCode: 400 }),
      DescribeStackResources: () => Promise.resolve({ StackResources: [] }),
    },
    s3: {
      HeadBucket: () => Promise.resolve({ statusCode: 200 }),
      ListBuckets: () => Promise.resolve({ Buckets: [ { Name: 'test-bucket' } ] }),
      PutObject: () => Promise.resolve({ ETag: '"mock-etag"' }),
    },
  })
}

// Track all updater instances
let originalUpdater = require('@architect/utils').updater
let updaterCalls = []

let mockUpdater = (name, options = {}) => {
  updaterCalls.push({ name, options })
  return originalUpdater(name, options)
}

// Mock fs.writeFileSync to prevent sam.json creation
let mocked00Before = proxyquire('../../src/sam/00-before', {
  'fs': {
    ...require('fs'),
    writeFileSync: () => { }, // No-op during tests
  },
})

let mockSam = proxyquire('../../src/sam', {
  './00-before': mocked00Before,
})

let deploy = proxyquire('../../', {
  '@aws-lite/client': mockAwsLite,
  './src/sam': mockSam,
  '@architect/utils': {
    ...require('@architect/utils'),
    updater: mockUpdater,
  },
})

test('Set up env', async t => {
  t.plan(1)
  awsLite.testing.enable()
  t.ok(awsLite.testing.isEnabled(), 'AWS client testing enabled')
})

test('deploy.sam with quiet=false shows output', async t => {
  t.plan(2)
  let inv = await inventory({
    rawArc: '@app\ntest-app\n@static',
    deployStage: 'staging',
  })

  captureOutput()

  await deploy.sam({
    inventory: inv,
    isDryRun: true,
    region: 'us-west-2',
    shouldHydrate: false,
    quiet: false, // Explicitly not quiet
  })

  restoreOutput()

  let outputCount = getOutputCount()
  let outputContent = getOutputContent()

  t.ok(outputCount > 0, `Non-quiet mode shows output (${outputCount} messages)`)
  t.ok(outputContent.includes('Deploy'), `Output contains deploy messages: ${outputContent.substring(0, 100)}...`)
})

test('deploy.sam with quiet=true suppresses updater output', async t => {
  t.plan(2)

  let inv = await inventory({
    rawArc: '@app\ntest-app\n@static',
    deployStage: 'staging',
  })

  // Test quiet=false (normal mode)
  captureOutput()
  await deploy.sam({
    inventory: inv,
    isDryRun: true,
    region: 'us-west-2',
    shouldHydrate: false,
    quiet: false,
  })
  restoreOutput()
  let normalCount = getOutputCount()

  // Test quiet=true
  captureOutput()
  await deploy.sam({
    inventory: inv,
    isDryRun: true,
    region: 'us-west-2',
    shouldHydrate: false,
    quiet: true,
  })
  restoreOutput()
  let quietCount = getOutputCount()

  t.ok(normalCount > 8, `Normal mode has substantial output (${normalCount} messages)`)
  t.ok(quietCount < 3, `Quiet mode suppresses most output (${quietCount} messages, was ${normalCount})`)
})

test('deploy.sam with default (no quiet param) shows output', async t => {
  t.plan(2)
  let inv = await inventory({
    rawArc: '@app\ntest-app\n@static',
    deployStage: 'staging',
  })

  captureOutput()

  await deploy.sam({
    inventory: inv,
    isDryRun: true,
    region: 'us-west-2',
    shouldHydrate: false,
    // No quiet parameter - should default to showing output
  })

  restoreOutput()

  let outputCount = getOutputCount()
  let outputContent = getOutputContent()

  t.ok(outputCount > 0, `Default mode shows output (${outputCount} messages)`)
  t.ok(outputContent.includes('Deploy'), `Output contains deploy messages`)
})

test('deploy.direct with quiet=true suppresses updater output', async t => {
  t.plan(2)

  let inv = await inventory({
    rawArc: '@app\ntest-app\n@http\nget /',
    deployStage: 'staging',
  })

  captureOutput()
  await deploy.direct({
    inventory: inv,
    isDryRun: true,
    region: 'us-west-2',
    shouldHydrate: false,
    quiet: false,
    srcDirs: [ 'src/http/get-index' ],
  })

  restoreOutput()
  let normalCount = getOutputCount()

  captureOutput()
  await deploy.direct({
    inventory: inv,
    isDryRun: true,
    region: 'us-west-2',
    shouldHydrate: false,
    quiet: true,
    srcDirs: [ 'src/http/get-index' ],
  })
  restoreOutput()
  let quietCount = getOutputCount()

  t.ok(normalCount > 5, `Normal mode has substantial output (${normalCount} messages)`)
  t.equal(quietCount, 0, `Quiet mode completely suppresses output (${quietCount} messages, was ${normalCount})`)
})

test('deploy.direct with quiet=false shows output', async t => {
  t.plan(2)
  let inv = await inventory({
    rawArc: '@app\ntest-app\n@http\nget /',
    deployStage: 'staging',
  })

  captureOutput()

  await deploy.direct({
    inventory: inv,
    isDryRun: true,
    region: 'us-west-2',
    shouldHydrate: false,
    quiet: false, // Explicitly not quiet
    srcDirs: [ 'src/http/get-index' ],
  })

  restoreOutput()

  let outputCount = getOutputCount()
  let outputContent = getOutputContent()

  t.ok(outputCount > 0, `Non-quiet mode shows output (${outputCount} messages)`)
  t.ok(outputContent.includes('Deploy'), `Output contains deploy messages: ${outputContent.substring(0, 100)}...`)
})

test('Teardown', t => {
  t.plan(1)
  awsLite.testing.disable()
  awsLite.testing.reset()
  t.notOk(awsLite.testing.isEnabled(), 'AWS client testing disabled')
})
