import { Stack, Construct, StackProps } from '@aws-cdk/cdk';
import { Bucket, IBucket } from '@aws-cdk/aws-s3';
import { Repository, IRepository } from '@aws-cdk/aws-codecommit';
import {
  Project,
  CodePipelineSource,
  CodePipelineBuildArtifacts,
  LinuxBuildImage,
  ComputeType
} from '@aws-cdk/aws-codebuild';
import { Pipeline, IStage, Artifact } from '@aws-cdk/aws-codepipeline';
import { CodeCommitSourceAction, CodeBuildAction } from '@aws-cdk/aws-codepipeline-actions';

interface PipelineStackProps extends StackProps {
  readonly artifactBucketName: string;
  readonly repositoryName: string;
  readonly branchName: string;
}

export class PipelineStack extends Stack {
  public artifactBucket: IBucket;
  public repository: IRepository;
  public project: Project;
  public pipeline: Pipeline;
  public sourceStage: IStage;
  public sourceOutput: Artifact;
  public buildStage: IStage;
  public buildOutput: Artifact;

  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const { artifactBucketName, repositoryName, branchName } = props;

    this.artifactBucket = Bucket.import(this, 'ArtifactBucket', {
      bucketName: artifactBucketName
    });

    this.repository = Repository.import(this, 'Repository', {
      repositoryName
    });

    this.project = new Project(this, 'Project', {
      source: new CodePipelineSource(),
      artifacts: new CodePipelineBuildArtifacts(),
      buildSpec: 'buildspec.yml',
      environment: {
        buildImage: LinuxBuildImage.UBUNTU_14_04_NODEJS_8_11_0,
        computeType: ComputeType.Small
      }
    });

    this.pipeline = new Pipeline(this, 'Pipeline', {
      artifactBucket: this.artifactBucket,
      restartExecutionOnUpdate: true
    });

    this.sourceStage = this.pipeline.addStage({
      name: 'Source'
    });

    this.sourceOutput = new Artifact('SourceCode');

    this.sourceStage.addAction(
      new CodeCommitSourceAction({
        actionName: 'FetchSource',
        repository: this.repository,
        branch: branchName,
        output: this.sourceOutput
      })
    );

    this.buildStage = this.pipeline.addStage({
      name: 'Build'
    });

    this.buildOutput = new Artifact('Dist');

    this.buildStage.addAction(
      new CodeBuildAction({
        actionName: 'BuildProject',
        input: this.sourceOutput,
        project: this.project,
        output: this.buildOutput
      })
    );
  }
}
