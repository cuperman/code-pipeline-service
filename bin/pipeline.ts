#!/usr/bin/env node
import 'source-map-support/register';
import { App } from '@aws-cdk/cdk';
import { PipelineStack } from '../infrastructure/lib/pipeline-stack';

const app = new App();
new PipelineStack(app, 'PipelineStack');
