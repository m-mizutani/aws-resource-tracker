#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AwsResourceTrackerStack } from '../lib/aws-resource-tracker-stack';

const app = new cdk.App();
new AwsResourceTrackerStack(app, 'AwsResourceTrackerStack');
