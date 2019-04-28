#!/usr/bin/env node

import { destroyPipeline } from '../backend/pipeline';

destroyPipeline({
  region: 'us-east-1',
  repository: 'my-repo',
  branch: 'master'
})
  .then(() => {
    console.log('Success!');
    process.exit(0);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
