import { Stack, Construct, StackProps } from '@aws-cdk/cdk';
import { PolicyStatement } from '@aws-cdk/aws-iam';
import { Bucket } from '@aws-cdk/aws-s3';
import { EventRule } from '@aws-cdk/aws-events';
import { Function, Runtime, Code, CfnPermission } from '@aws-cdk/aws-lambda';

function repositoryArn(region: string, account: string, repository: string): string {
  return `arn:aws:codecommit:${region}:${account}:${repository}`;
}

interface ICommitActionProps {
  readonly repoAccount: string;
  readonly repoRegion: string;
  readonly repoName: string;
  readonly commitEvent: 'referenceCreated' | 'referenceUpdated' | 'referenceDeleted';
  readonly commitRefType: 'branch' | 'tag';
  readonly invokeFunctionArn: string;
}

/*
 * Invokes a lambda function on a commit event
 */
class CommitAction extends Construct {
  public eventRule: EventRule;
  public permission: CfnPermission;

  constructor(scope: Construct, id: string, props: ICommitActionProps) {
    super(scope, id);

    const {
      repoAccount,
      repoRegion,
      repoName,
      commitEvent,
      commitRefType,
      invokeFunctionArn
    } = props;

    this.eventRule = new EventRule(scope, `${id}-EventRule`, {
      eventPattern: {
        account: [repoAccount],
        region: [repoRegion],
        source: ['aws.codecommit'],
        resources: [repositoryArn(repoRegion, repoAccount, repoName)],
        detailType: ['CodeCommit Repository State Change'],
        detail: {
          event: [commitEvent],
          repositoryName: [repoName],
          referenceType: [commitRefType]
        }
      },
      targets: [
        {
          asEventRuleTarget: () => {
            return {
              id: `${id}-TargetFunction`,
              arn: invokeFunctionArn
            };
          }
        }
      ]
    });

    new CfnPermission(scope, `${id}-Permission`, {
      action: 'lambda:InvokeFunction',
      functionName: invokeFunctionArn,
      principal: 'events.amazonaws.com',
      sourceArn: this.eventRule.ruleArn
    });
  }
}

interface CicdStackProps extends StackProps {
  readonly account: string;
  readonly region: string;
  readonly repository: string;
}

export class CicdStack extends Stack {
  public readonly artifactBucket: Bucket;
  public readonly createPipeline: Function;
  public readonly destroyPipeline: Function;
  public readonly onRefCreate: EventRule;
  public readonly onRefDelete: EventRule;

  constructor(scope: Construct, id: string, props: CicdStackProps) {
    super(scope, id, props);

    const { account, region, repository } = props;

    const runtime = Runtime.NodeJS810;
    const code = Code.asset('./backend');

    this.artifactBucket = new Bucket(this, 'ArtifactBucket', {
      versioned: true
    });

    this.createPipeline = new Function(this, 'CreatePipeline', {
      runtime,
      code,
      handler: 'pipeline.createPipelineFromCodeCommitEvent',
      environment: {
        ARTIFACT_BUCKET_NAME: this.artifactBucket.bucketName
      },
      timeout: 300
    });

    this.destroyPipeline = new Function(this, 'DestroyPipeline', {
      runtime,
      code,
      handler: 'pipeline.destroyPipelineFromCodeCommitEvent',
      timeout: 60
    });

    const permissionToManagePipelines = new PolicyStatement()
      .addAllResources()
      .addActions('cloudformation:*', 'iam:*', 'events:*', 'codebuild:*', 'codepipeline:*');
    this.createPipeline.addToRolePolicy(permissionToManagePipelines);
    this.destroyPipeline.addToRolePolicy(permissionToManagePipelines);

    new CommitAction(this, 'CreatePipelineOnBranchCreate', {
      repoAccount: account,
      repoRegion: region,
      repoName: repository,
      commitEvent: 'referenceCreated',
      commitRefType: 'branch',
      invokeFunctionArn: this.createPipeline.functionArn
    });

    new CommitAction(this, 'DestroyPipelineOnBranchDelete', {
      repoAccount: account,
      repoRegion: region,
      repoName: repository,
      commitEvent: 'referenceDeleted',
      commitRefType: 'branch',
      invokeFunctionArn: this.destroyPipeline.functionArn
    });
  }
}
