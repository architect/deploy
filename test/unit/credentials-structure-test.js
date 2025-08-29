let test = require('tape')
let awsLite = require('@aws-lite/client')
let inventory = require('@architect/inventory')
let deploy = require('../../')

test('Set up env', async t => {
  t.plan(1)
  awsLite.testing.enable()
  t.ok(awsLite.testing.isEnabled(), 'AWS client testing enabled')
})

test('deploy.sam credentials accepted', async t => {
  t.plan(1)

  // Mock all the AWS service calls that deploy.sam might make
  awsLite.testing.mock('S3.HeadBucket', {})
  awsLite.testing.mock('S3.CreateBucket', {})
  awsLite.testing.mock('S3.PutObject', {})
  awsLite.testing.mock('SSM.GetParametersByPath', { Parameters: [] })
  awsLite.testing.mock('SSM.PutParameter', {})
  awsLite.testing.mock('CloudFormation.DescribeStacks', { Stacks: [] })
  awsLite.testing.mock('CloudFormation.CreateStack', { StackId: 'test-stack' })

  // Create a test inventory
  let inv = await inventory({
    rawArc: '@app\ntest-app\n@http\nget /',
    deployStage: 'staging',
  })

  // Test: Call deploy.sam with STS credentials
  try {
    await deploy.sam({
      credentials: {
        accessKeyId: 'ASIATEST123456789',
        secretAccessKey: 'testSecretKey123456789',
        sessionToken: 'testSessionToken123456789',
      },
      inventory: inv,
      isDryRun: true,
      region: 'us-west-2',
    })
    t.pass('Deploy accepts credentials')
  }
  catch (err) {
    // Check if this is the specific credential rejection error
    if (err.message.includes('You must supply AWS credentials')) {
      t.fail('Deploy rejects credentials')
    }
    else {
      // Some other error occurred after credentials were accepted
      t.pass('Deploy accepts credentials')
    }
  }
})

test('Teardown', t => {
  t.plan(1)
  awsLite.testing.disable()
  awsLite.testing.reset()
  t.notOk(awsLite.testing.isEnabled(), 'AWS client testing disabled')
})
