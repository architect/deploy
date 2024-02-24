// https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-describing-stacks.html
let processingStates = [
  'CREATE_IN_PROGRESS',
  'UPDATE_IN_PROGRESS',
]

let successStates = [
  'CREATE_COMPLETE',
  'UPDATE_COMPLETE_CLEANUP_IN_PROGRESS',
  'UPDATE_COMPLETE',
]

let failStates = [
  'CREATE_FAILED',
  'ROLLBACK_COMPLETE',
  'ROLLBACK_FAILED',
  'ROLLBACK_IN_PROGRESS',
  'UPDATE_FAILED',
  'UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS',
  'UPDATE_ROLLBACK_COMPLETE',
  'UPDATE_ROLLBACK_FAILED',
  'UPDATE_ROLLBACK_IN_PROGRESS',
]

// Other statuses:
// 'DELETE_COMPLETE', 'DELETE_FAILED', 'DELETE_IN_PROGRESS', 'IMPORT_COMPLETE', 'IMPORT_IN_PROGRESS', 'IMPORT_ROLLBACK_COMPLETE', 'IMPORT_ROLLBACK_FAILED', 'IMPORT_ROLLBACK_IN_PROGRESS', 'REVIEW_IN_PROGRESS'

module.exports = function deploy (params, callback) {
  let { aws, bucket, debug, fast, region, stackname: StackName, update, tags, template } = params
  update.done('Generated CloudFormation deployment')
  update.start('Deploying & building infrastructure...')

  let TemplateURL = `https://${bucket}.s3.${region}.amazonaws.com/${template}`

  let stack = {
    StackName,
    TemplateURL,
    Capabilities: [ 'CAPABILITY_IAM', 'CAPABILITY_AUTO_EXPAND' ],
  }
  if (tags.length) {
    stack.Tags = tags.map(str => {
      let bits = str.split('=')
      return {
        Key: bits[0],
        Value: bits[1],
      }
    })
  }

  aws.cloudformation.DescribeStacks({ StackName })
    // Stack exists, let's go!
    .then(() => {
      aws.cloudformation.UpdateStack(stack)
        .then(checkStatus)
        .catch(callback)
    })
    // First deploy, yay!
    .catch(() => {
      aws.cloudformation.CreateStack(stack)
        .then(checkStatus)
        .catch(callback)
    })

  let checks = 0
  let start = Date.now()
  let tenMins = 1000 * 60 * 10
  let timeout = start + tenMins
  function checkStatus () {
    if (fast) {
      update.status('Deploying in fast mode! Please refer to the CloudFormation console for deployment status')
      return callback()
    }

    checks++
    if (Date.now() > timeout) {
      update.error(`Deployment timed out after 10 minutes; check stack ${StackName} status in AWS console`)
      let err = new Error(`Deployment failed`)
      callback(err)
    }

    aws.cloudformation.DescribeStacks({ StackName })
      .then(result => {
        let { StackStatus } = result.Stacks[0]
        if (debug) {
          update.status(`Current status: ${StackStatus} (check ${checks})`)
        }

        /**/ if (processingStates.includes(StackStatus)) {
          setTimeout(checkStatus, 1000)
        }
        else if (successStates.includes(StackStatus)) {
          callback()
        }
        else if (failStates.includes(StackStatus)) {
          update.error(`Bad deployment state found: ${StackStatus}`)
          let err = new Error(`Deployment failed`)
          callback(err)
        }
        else {
          update.error(`Unknown deployment state: ${StackStatus}`)
          let err = new Error(`Deployment failed`)
          callback(err)
        }
      })
      .catch(err => {
        update.error('Failed to check deployment status')
        callback(err)
      })
  }
}
