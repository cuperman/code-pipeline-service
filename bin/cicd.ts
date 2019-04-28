#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/cdk');
import { CicdStack } from '../lib/cicd-stack';

const app = new cdk.App();
new CicdStack(app, 'CicdExample', {
  account: '588611805875',
  region: 'us-east-1',
  repository: 'my-repo'
});
