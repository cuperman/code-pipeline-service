# CI/CD

Automatically create code pipelines for every branch in a list of repositories.  Run builds per commit and store artifacts.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template

## Build & Deploy

```bash
npm run build

cdk synth --app ./bin/cicd.js
cdk diff --app ./bin/cicd.js
cdk deploy --app ./bin/cicd.js

cdk synth --app ./bin/pipeline.js
cdk diff --app ./bin/pipeline.js
cdk deploy --app ./bin/pipeline.js
```

## Strategy

* On Project Add => Create Repo Ref Listener
* On Project Remove => Destroy Repo Ref Listener and all Pipelines

* On Ref Create => Create Pipeline
* On Ref Update => Create Pipeline if one does not already exist
* On Ref Delete => Destroy Pipeline
