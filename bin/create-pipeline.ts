#!/usr/bin/env node

import { createPipeline } from '../backend/pipeline';

const repository = process.argv[2];
const branch = process.argv[3];

if (!repository) {
  console.error('repository required');
  process.exit(1);
}

if (!branch) {
  console.error('branch required');
  process.exit(1);
}

createPipeline({
  region: 'us-east-1',
  artifactBucket: 'cicd-artifacts-temp',
  repository,
  branch
})
  .then(() => {
    console.log('Success!');
    process.exit(0);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
