let { join } = require('path')
let { writeFileSync } = require('fs')
let crypto = require('crypto')
let series = require('run-series')
let upload = require('./upload')

// SAM to CloudFormation resource property types pulled from:
// https://github.com/aws/aws-cli/blob/develop/awscli/customizations/cloudformation/artifact_exporter.py
let resourceTypes = {
  // Core cases
  'AWS::Serverless::Function':  'CodeUri',
  'AWS::Lambda::Function':      'Code',

  // The following resource types are currently not implemented. This may affect custom plugins.
  // Let us know if you need to support any of these resource types!
  // 'AWS::ApiGateway::RestApi':                  'BodyS3Location',
  // 'AWS::AppSync::GraphQLSchema':               'DefinitionS3Location',
  // 'AWS::CloudFormation::Stack':                'TemplateURL',
  // 'AWS::CodeCommit::Repository':               'Code.S3',
  // 'AWS::ElasticBeanstalk::ApplicationVersion': 'SourceBundle',
  // 'AWS::Glue::Job':                            'Command.ScriptLocation',
  // 'AWS::Lambda::LayerVersion':                 'Content',
  // 'AWS::Serverless::Api':                      'DefinitionUri',
  // 'AWS::Serverless::Application':              'Location',
  // 'AWS::Serverless::LayerVersion':             'ContentUri',
  // 'AWS::Serverless::StateMachine':             'DefinitionUri',
  // 'AWS::StepFunctions::StateMachine':          'DefinitionS3Location',
  // 'AWS::AppSync::FunctionConfiguration':       'RequestMappingTemplateS3Location' | 'ResponseMappingTemplateS3Location',
  // 'AWS::AppSync::Resolver':                    'RequestMappingTemplateS3Location' | 'ResponseMappingTemplateS3Location',
  // 'AWS::ServerlessRepo::Application':          'ReadmeUrl' | 'LicenseUrl',
}

/**
 * Compile the project into into a single stack with the following AWS::Cloudformation sam.yaml file
 * Then publish to S3 as necessary
 */
module.exports = function beforeDeploy (params, callback) {
  let { aws, bucket, debug, eject, isDryRun, inventory, sam, update } = params
  let templateKey

  function writeSAM () {
    update.status('Writing CloudFormation template (sam.json)')
    let path = join(inventory.inv._project.cwd, 'sam.json')
    writeFileSync(path, JSON.stringify(sam, null, 2))
  }

  if (isDryRun || eject) {
    writeSAM()
    update.status('Skipping CloudFormation deployment')
    return callback(null, 'dry-run')
  }

  update.start('Generating CloudFormation deployment')

  // Walk the resources looking for relevant resources to patch, then upload them
  let ops = Object.keys(sam.Resources).map(name => {
    return function (callback) {
      let type = sam.Resources[name].Type
      if (resourceTypes[type]) {
        let prop = resourceTypes[type]
        let folder = sam.Resources[name].Properties[prop]
        upload({ aws, bucket, folder }, (err, key) => {
          if (err) callback(err)
          else {
            sam.Resources[name].Properties[prop] = `s3://${bucket}/${key}`
            callback()
          }
        })
      }
      else callback()
    }
  })

  // Finally: publish the template
  ops.push(callback => {
    let body = JSON.stringify(sam) // Keep this as tight as possible: don't add indentation
    templateKey = crypto.createHash('sha256').update(body).digest('hex') + '-template.json'
    aws.s3.PutObject({
      Bucket: bucket,
      Key: templateKey,
      Body: body,
    })
      .then(() => callback())
      .catch(callback)
  })

  series(ops, err => {
    if (err) callback(err)
    else {
      if (debug) writeSAM()
      callback(null, templateKey)
    }
  })
}
