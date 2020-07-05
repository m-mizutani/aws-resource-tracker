import { handler } from "../resources/tracker";
const fs = require("fs");

test("Run tracker", (done) => {
  const testData = process.env["TEST_DATA"];
  if (testData !== undefined) {
    const testEvent = fs.readFileSync(testData);
    const promise = handler(JSON.parse(testEvent));
    promise.finally(() => {
      done();
    });
  } else {
    done();
  }
});
