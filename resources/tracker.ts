import * as lambda from "aws-lambda";
import * as aws from "aws-sdk";

import * as zlib from "zlib";

exports.main = handler;
/*
exports.main = async (event: any, context: any) => {
  try {
    handler(event, context);
  } catch (error) {
    var body = error.stack || JSON.stringify(error, null, 2);
    console.log("ERROR:", body);
    throw error;
  }
};
*/

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

export async function handler(event: any) {
  console.log("event:", JSON.stringify(event));
  const s3 = new aws.S3();

  const s3Records = event.Records.map((record: any) => {
    const ev = JSON.parse(record.body as string);
    const msg = JSON.parse(ev.Message as string);
    return msg.Records;
  }).reduce((p: any, c: any) => {
    return p.concat(c);
  }) as Array<lambda.S3EventRecord>;

  const promises = s3Records.map((rec) => {
    return s3
      .getObject({
        Bucket: rec.s3.bucket.name,
        Key: rec.s3.object.key,
      })
      .promise();
  });

  return Promise.all(promises).then((results) => {
    const logs = results
      .map((data) => {
        if (!data.Body) {
          throw Error("No body data");
        }

        const raw = zlib.gunzipSync(data.Body as Buffer);
        const trail = JSON.parse(raw.toString());
        return trail.Records;
      })
      .reduce((p, c) => {
        return p.concat(c);
      });

    console.log("trail", JSON.stringify(logs));
  });
}
