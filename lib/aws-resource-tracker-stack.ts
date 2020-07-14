import * as cdk from "@aws-cdk/core";
// import * as lambda from "@aws-cdk/aws-lambda";
import * as sns from "@aws-cdk/aws-sns";
import * as sqs from "@aws-cdk/aws-sqs";
import * as iam from "@aws-cdk/aws-iam";
import * as s3 from "@aws-cdk/aws-s3";
import { SqsEventSource } from "@aws-cdk/aws-lambda-event-sources";
import { SqsSubscription } from "@aws-cdk/aws-sns-subscriptions";
import { NodejsFunction } from "@aws-cdk/aws-lambda-nodejs";

export interface Arguments {
  snsTopicARN: string;
  s3BucketName?: string;
  iamRoleARN?: string;
  slackToken: string;
  slackChannel: string;
}

export class Stack extends cdk.Stack {
  constructor(
    scope: cdk.Construct,
    id: string,
    args: Arguments,
    props?: cdk.StackProps
  ) {
    super(scope, id, props);

    const s3EventQueue = new sqs.Queue(this, "s3EventQueue", {
      visibilityTimeout: cdk.Duration.seconds(300),
    });

    const topic = sns.Topic.fromTopicArn(this, "s3Event", args.snsTopicARN);
    topic.addSubscription(new SqsSubscription(s3EventQueue));

    const role =
      args.iamRoleARN !== undefined
        ? iam.Role.fromRoleArn(this, "Lambda", args.iamRoleARN, {
            mutable: false,
          })
        : undefined;

    const tracker = new NodejsFunction(this, "tracker", {
      entry: "resources/tracker.ts",
      handler: "main",
      timeout: cdk.Duration.seconds(300),
      role: role,
      memorySize: 1024,
      events: [new SqsEventSource(s3EventQueue, { batchSize: 1 })],
      environment: {
        SLACK_TOKEN: args.slackToken,
        SLACK_CHANNEL: args.slackChannel,
      },
    });

    if (role === undefined) {
      const bucket = s3.Bucket.fromBucketAttributes(this, "ImportedBucket", {
        bucketArn: "arn:aws:s3:::" + args.s3BucketName,
      });
      bucket.grantRead(tracker);
    }
  }
}
