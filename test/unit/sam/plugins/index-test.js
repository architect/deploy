const { test } = require('node:test')
const assert = require('node:assert/strict')
const plugins = require('../../../../src/sam/plugins')

function one (params) {
  const { cloudformation } = params
  cloudformation.Resources['OneSNS'] = {
    Type: 'AWS::SNS',
  }
  return cloudformation
}
function two (params) {
  const { cloudformation } = params
  cloudformation.Resources['TwoSQS'] = {
    Type: 'AWS::SQS',
  }
  return cloudformation
}
one._type = two._type = 'plugin'

const inventory = {
  inv: {
    _project: { arc: [] },
    plugins: {
      _methods: { deploy: {
        start: [ one, two ],
      } },
    },
  },
}

const fakeCfn = {
  Resources: [],
}

test('deploy.start should be able to modify CloudFormation', (t, done) => {
  const cloudformation = JSON.parse(JSON.stringify(fakeCfn))
  plugins.start({ inventory, cloudformation, stage: 'staging' }, (err, result) => {
    if (err) {
      console.error(err)
      assert.fail(err)
    }
    else {
      assert.ok(result.Resources.OneSNS, 'first plugin added a resource')
      assert.ok(result.Resources.TwoSQS, 'second plugin added a resource')
      done()
    }
  })
})
