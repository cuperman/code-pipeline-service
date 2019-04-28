#!/usr/bin/env node
import 'source-map-support/register';
import { App } from '@aws-cdk/cdk';
import { PipelineStack } from '../lib/pipeline-stack';

const app = new App();
new PipelineStack(app, 'MyPipelineStack', {
  artifactBucketName: 'cicd-artifacts-temp',
  repositoryName: 'my-repo',
  branchName: 'master'
});
