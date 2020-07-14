import { handler } from "../resources/tracker";
const fs = require("fs");

test("Run tracker", (done) => {
  const testData = process.env.TEST_DATA;
  if (testData !== undefined) {
    const testEvent = fs.readFileSync(testData);
    const args = {
      slackToken: process.env.TRACKER_SLACK_TOKEN as string,
      slackChannel: process.env.TRACKER_SLACK_CHANNEL as string,
    };

    handler(JSON.parse(testEvent), args)
      .then((res) => {
        console.log("RESULT:", res);
      })
      .catch((err) => {
        console.log("ERROR:", err);
        throw err;
      })
      .finally(done);
  }
});
