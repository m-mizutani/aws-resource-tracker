#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { Stack } from "../lib/aws-resource-tracker-stack";

const app = new cdk.App();
new Stack(app, "AwsResourceTrackerStack", {
  snsTopicARN: process.env["TRACKER_SNS_TOPIC"]!,
  s3BucketName: process.env["TRACKER_BUCKET_NAME"]!,
  slackToken: process.env["TRACKER_SLACK_TOKEN"]!,
  slackChannel: process.env["TRACKER_SLACK_CHANNEL"]!,
});
