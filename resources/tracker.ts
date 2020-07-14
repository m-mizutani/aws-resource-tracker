import { S3EventRecord } from "aws-lambda";
import { S3 } from "aws-sdk";

import { gunzipSync } from "zlib";
import { WebClient } from "@slack/web-api";

// exports.main = handler;
interface arguments {
  slackToken: string;
  slackChannel: string;
}

exports.main = async (event: any, context: any) => {
  const args = {
    slackToken: process.env.SLACK_TOKEN!,
    slackChannel: process.env.SLACK_CHANNEL!,
  };
  return handler(event, args);
};

interface cloudTrailRecord {
  eventVersion: string;
  eventTime: string;
  eventSource: string;
  eventName: string;
  awsRegion: string;
  requestID: string;
  eventID: string;
  eventType: string;
  recipientAccountId: string;

  errorCode?: string;
  errorMessage?: string;

  sourceIPAddress?: string;
  userIdentity?: any;
  userAgent?: string;
  requestParameters?: any;
  responseElements?: any;
}

export async function handler(event: any, args: arguments) {
  console.log("event:", JSON.stringify(event));
  const s3 = new S3();

  const s3Records = event.Records.map((record: any) => {
    const ev = JSON.parse(record.body as string);
    const msg = JSON.parse(ev.Message as string);
    return msg.Records;
  }).reduce((p: any, c: any) => {
    return p.concat(c);
  }) as Array<S3EventRecord>;

  const s3proc = s3Records.map((rec) => {
    return s3
      .getObject({
        Bucket: rec.s3.bucket.name,
        Key: rec.s3.object.key,
      })
      .promise();
  });

  const results = await Promise.all(s3proc);

  const logs = results
    .map((data) => {
      const raw = gunzipSync(data.Body as Buffer);
      const trail = JSON.parse(raw.toString());
      return trail.Records;
    })
    .reduce((p, c) => {
      return (p || []).concat(c);
    })
    .filter(filterEvent);

  const slackClient = new WebClient(args.slackToken);
  const slackProc = logs.map((log: cloudTrailRecord) => {
    console.log("log:", log);
    return slackClient.chat.postMessage({
      text: "Event: " + log.eventName,
      channel: args.slackChannel,
      attachments: [
        {
          fields: [
            { title: "Time", value: log.eventTime, short: true },
            { title: "Region", value: log.awsRegion, short: true },
            { title: "User", value: log.userIdentity.arn },
            { title: "SrouceIPAddress", value: log.sourceIPAddress },
            { title: "UserAgent", value: log.userAgent },
            { title: "ErrorMessage", value: log.errorMessage },
            {
              title: "requestParameters",
              value: JSON.stringify(log.requestParameters),
            },
          ],
        },
      ],
    });
  });
  console.log(slackProc);
  const slackResults = await Promise.all(slackProc);
  console.log("slack results:", JSON.stringify(slackResults));
  return "ok";
}

function filterEvent(log: cloudTrailRecord): boolean {
  const eventMap: { [key: string]: Array<string> } = {
    "ec2.amazonaws.com": ["RunInstances", "TerminateInstances"],
    "dynamodb.amazonaws.com": ["CreateTable", "DeleteTable"],
    "cloudformation.amazonaws.com": ["CreateStack", "DeleteStack"],
    "rds.amazonaws.com": ["CreateDBInstance", "DeleteDBInstance"],
    "acm.amazonaws.com": [
      "ExportCertificate",
      "ImportCertificate",
      "RenewCertificate",
      "DeleteCertificate",
    ],
    "vpc.amazonaws.com": [
      "CreateRoute",
      "DeleteRoute",
      "CreateSubnet",
      "DeleteSubnet",
    ],
  };

  const eventList = eventMap[log.eventSource];
  if (eventList === undefined) {
    return false;
  }

  if (eventList.indexOf(log.eventName) < 0) {
    return false;
  }

  if (log.sourceIPAddress === "autoscaling.amazonaws.com") {
    return false;
  }

  return true;
}
