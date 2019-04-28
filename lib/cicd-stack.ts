import { Stack, Construct, StackProps } from '@aws-cdk/cdk';
import { EventRule } from '@aws-cdk/aws-events';
import { Function, Runtime, Code, CfnPermission } from '@aws-cdk/aws-lambda';

function repositoryArn(region: string, account: string, repository: string): string {
  return `arn:aws:codecommit:${region}:${account}:${repository}`;
}

interface IMyConstructProps {
  readonly account: string;
  readonly region: string;
  readonly repository: string;
  readonly event: string;
  readonly referenceType: string;
  readonly functionArn: string;
}

class TriggerFunctionOnCodeCommitEvent extends Construct {
  public eventRule: EventRule;
  public permission: CfnPermission;

  constructor(scope: Construct, id: string, props: IMyConstructProps) {
    super(scope, id);

    const { account, region, repository, event, referenceType, functionArn } = props;

    this.eventRule = new EventRule(scope, `${id}-EventRule`, {
      eventPattern: {
        account: [account],
        region: [region],
        source: ['aws.codecommit'],
        resources: [repositoryArn(region, account, repository)],
        detailType: ['CodeCommit Repository State Change'],
        detail: {
          event: [event],
          repositoryName: [repository],
          referenceType: [referenceType]
        }
      },
      targets: [
        {
          asEventRuleTarget: () => {
            return {
              id: `${id}-TargetFunction`,
              arn: functionArn
            };
          }
        }
      ]
    });

    new CfnPermission(scope, `${id}-Permission`, {
      action: 'lambda:InvokeFunction',
      functionName: functionArn,
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
  public readonly createPipeline: Function;
  public readonly triggerPipeline: Function;
  public readonly destroyPipeline: Function;

  public readonly onRefCreate: EventRule;
  public readonly onRefUpdate: EventRule;
  public readonly onRefDelete: EventRule;

  constructor(scope: Construct, id: string, props: CicdStackProps) {
    super(scope, id, props);

    const { account, region, repository } = props;

    const runtime = Runtime.NodeJS810;
    const code = Code.asset('./backend');

    this.createPipeline = new Function(this, 'CreatePipeline', {
      runtime,
      code,
      handler: 'pipeline.create'
    });

    this.triggerPipeline = new Function(this, 'TriggerPipeline', {
      runtime,
      code,
      handler: 'pipeline.trigger'
    });

    this.destroyPipeline = new Function(this, 'DestroyPipeline', {
      runtime,
      code,
      handler: 'pipeline.destroy'
    });

    new TriggerFunctionOnCodeCommitEvent(this, 'CreatePipelineOnBranchCreate', {
      account,
      region,
      repository,
      event: 'referenceCreated',
      referenceType: 'branch',
      functionArn: this.createPipeline.functionArn
    });

    new TriggerFunctionOnCodeCommitEvent(this, 'TriggerPipelineOnBranchUpdate', {
      account,
      region,
      repository,
      event: 'referenceUpdated',
      referenceType: 'branch',
      functionArn: this.triggerPipeline.functionArn
    });

    new TriggerFunctionOnCodeCommitEvent(this, 'DestroyPipelineOnBranchDelete', {
      account,
      region,
      repository,
      event: 'referenceDeleted',
      referenceType: 'branch',
      functionArn: this.destroyPipeline.functionArn
    });
  }
}
