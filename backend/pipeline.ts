import CloudFormation = require('aws-sdk/clients/cloudformation');
import uuid = require('uuid');
import fs = require('fs');
import path = require('path');

interface CodeCommitEvent {
  version: string;
  id: string;
  'detail-type': string;
  source: string;
  account: string;
  time: string;
  region: string;
  resources: string[];
  detail: {
    event: string;
    repositoryName: string;
    repositoryId: string;
    referenceType: string;
    referenceName: string;
    referenceFullName: string;
    commitId: string;
    coldCommitId?: string;
  };
}

function buildStackName(repository: string, branch: string) {
  return `CICD-Pipeline-${repository}-${branch}`;
}

interface CreatePipelineProps {
  readonly region: string;
  readonly artifactBucket: string;
  readonly repository: string;
  readonly branch: string;
}

export async function createPipeline(props: CreatePipelineProps): Promise<void> {
  const { region, artifactBucket, repository, branch } = props;

  const stackName = buildStackName(repository, branch);
  const changeSetName = `CICD-${uuid.v4()}`;
  const description = `CI/CD pipeline for repo: ${repository}, branch: ${branch}`;
  const templateBody = fs.readFileSync(path.join(__dirname, 'pipeline.yml'), 'utf8');

  const cloudformation = new CloudFormation({
    region
  });

  let createResult;
  try {
    createResult = await cloudformation
      .createChangeSet({
        StackName: stackName,
        ChangeSetName: changeSetName,
        ChangeSetType: 'CREATE',
        Description: description,
        TemplateBody: templateBody,
        Capabilities: ['CAPABILITY_IAM'],
        Parameters: [
          {
            ParameterKey: 'ArtifactBucketName',
            ParameterValue: artifactBucket
          },
          {
            ParameterKey: 'RepositoryName',
            ParameterValue: repository
          },
          {
            ParameterKey: 'BranchName',
            ParameterValue: branch
          }
        ]
      })
      .promise();
  } catch (error) {
    console.error('error', error);
    throw error;
  }
  console.log('create result', createResult);

  let waitResult;
  try {
    waitResult = await cloudformation
      .waitFor('changeSetCreateComplete', {
        StackName: stackName,
        ChangeSetName: changeSetName
      })
      .promise();
  } catch (error) {
    console.error('error', error);
    throw error;
  }
  console.log('wait result', waitResult);

  let executeResult;
  try {
    executeResult = await cloudformation
      .executeChangeSet({
        StackName: stackName,
        ChangeSetName: changeSetName
      })
      .promise();
  } catch (error) {
    console.error('error', error);
    throw error;
  }
  console.log('execute result', executeResult);
}

export async function createPipelineFromCodeCommitEvent(event: CodeCommitEvent): Promise<void> {
  console.log('event', event);

  const { ARTIFACT_BUCKET_NAME } = process.env;

  if (!ARTIFACT_BUCKET_NAME) {
    throw new Error(`Environment variable ARTIFACT_BUCKET_NAME undefined`);
  }

  const { region, detail } = event;
  const { repositoryName, referenceName } = detail;

  return createPipeline({
    region,
    artifactBucket: ARTIFACT_BUCKET_NAME,
    repository: repositoryName,
    branch: referenceName
  });
}

interface DestroyPipelineProps {
  readonly region: string;
  readonly repository: string;
  readonly branch: string;
}

export async function destroyPipeline(props: DestroyPipelineProps): Promise<void> {
  const { region, repository, branch } = props;
  const stackName = buildStackName(repository, branch);

  const cloudformation = new CloudFormation({
    region
  });

  let deleteResult;
  try {
    deleteResult = await cloudformation
      .deleteStack({
        StackName: stackName
      })
      .promise();
  } catch (error) {
    console.error('error', error);
    throw error;
  }
  console.log('delete result', deleteResult);
}

export async function destroyPipelineFromCodeCommitEvent(event: CodeCommitEvent): Promise<void> {
  console.log('event', event);

  const { region, detail } = event;
  const { repositoryName, referenceName } = detail;

  return destroyPipeline({
    region,
    repository: repositoryName,
    branch: referenceName
  });
}
