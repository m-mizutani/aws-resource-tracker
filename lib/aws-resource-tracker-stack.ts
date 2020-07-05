import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as sns from "@aws-cdk/aws-sns";
import * as sqs from "@aws-cdk/aws-sqs";
import * as iam from "@aws-cdk/aws-iam";
import { SqsEventSource } from "@aws-cdk/aws-lambda-event-sources";
import { SqsSubscription } from "@aws-cdk/aws-sns-subscriptions";
import { Role, ServicePrincipal } from "@aws-cdk/aws-iam";

export interface Arguments {
  snsTopicARN: string;
  s3BucketName?: string;
  iamRoleARN?: string;
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

    const iamRole = setupIAMRole(this, args);

    const topic = sns.Topic.fromTopicArn(this, "s3Event", args.snsTopicARN);
    topic.addSubscription(new SqsSubscription(s3EventQueue));

    const resourcePath = lambda.Code.asset("./resources");
    new lambda.Function(this, "tracker", {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: "tracker.main",
      code: resourcePath,
      role: iamRole,
      timeout: cdk.Duration.seconds(300),
      memorySize: 1024,
      events: [new SqsEventSource(s3EventQueue, { batchSize: 1 })],
    });
  }
}

function setupIAMRole(scope: Stack, args: Arguments): iam.IRole {
  if (args.iamRoleARN !== undefined) {
    return iam.Role.fromRoleArn(scope, "LambdaRole", args.iamRoleARN, {
      mutable: false,
    });
  } else if (args.s3BucketName !== undefined) {
    const iamRole = new Role(scope, "LambdaRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
    });
    const s3Prefix = "arn:aws:s3:::";
    iamRole.addToPolicy(
      new iam.PolicyStatement({
        resources: [
          s3Prefix + args.s3BucketName,
          s3Prefix + args.s3BucketName + "/*",
        ],
        actions: ["s3:GetObject", "s3:ListBucket"],
      })
    );
    return iamRole;
  } else {
    throw Error("iamRole or s3Bucket parameter is required");
  }
}
