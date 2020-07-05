import {
  expect as expectCDK,
  matchTemplate,
  MatchStyle,
} from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";
import * as AwsResourceTracker from "../lib/aws-resource-tracker-stack";

test("Empty Stack", () => {
  const app = new cdk.App();
  // WHEN
  const stack = new AwsResourceTracker.Stack(app, "MyTestStack", {
    snsTopicARN: "arn:aws:sns:ap-northeast-1:12345678900000:test-topic",
    iamRoleARN: "arn:aws:iam::12345678900000:role/LambdaTest",
  });
  // THEN
  /*
  expectCDK(stack).to(
    matchTemplate(
      {
        Resources: {},
      },
      MatchStyle.EXACT
    )
  );
  */
});
