import nodeFetch from "node-fetch";
import { Agent, fetch as undiciFetch, setGlobalDispatcher } from "undici";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const argv = yargs(hideBin(process.argv))
  .options({
    nodeFetch: { type: "boolean", default: false },
    connectTimeoutMs: { type: "number" },
  })
  .parseSync();

if (argv.connectTimeoutMs) {
  setGlobalDispatcher(new Agent({ connectTimeout: argv.connectTimeoutMs }));
}

async function fetchExample(i: number): Promise<void> {
  const fetch = argv.nodeFetch ? nodeFetch : undiciFetch;
  const url = `http://www.example.org/?_=${i}`;
  console.log(`Starting fetch to ${url}`);
  const response = await fetch(url);
  console.log(`Response ${url}: ${response.status}`);
}

function longRunningTask(): number {
  console.log("Started long running task");
  const start = Date.now();
  let n = 0;
  for (let j = 0; j < 2000000000; j++) {
    n += Math.random();
  }
  const end = Date.now();
  console.log(`Long running task took ${end - start} ms`);
  return n;
}

async function main(): Promise<void> {
  console.log("Starting test!");
  console.log(` - Using ${argv.nodeFetch ? "node-fetch" : "undici"} for fetch`);
  if (!argv.nodeFetch) {
    if (argv.connectTimeoutMs) {
      console.log(
        ` - Undici connectTimeout is set to ${argv.connectTimeoutMs} ms`
      );
    } else {
      console.log(` - Undici connectTimeout is set to the default of 10000 ms`);
    }
  }
  console.log("--------------------");

  // This test works by creating a connection with Undici and then blocking the event loop
  // for at least 10 seconds, the default `connectTimeout` for Undici. This will trigger
  // a `UND_ERR_CONNECT_TIMEOUT` error.
  const fetchPromise = fetchExample(0);
  Promise.resolve().then(() => {
    console.log("Promise.resolve()");
  });
  setImmediate(() => {
    console.log("setImmediate()");
  });
  longRunningTask();
  // These approaches will also yield the same effect.
  //   promises.push(
  //     // Functions passed to promise constructors execute immediately.
  //     new Promise((resolve) => {
  //       resolve(longRunningTask());
  //     })
  //   );
  //   setTimeout(() => {
  //     longRunningTask();
  //   }, 0);
  await fetchPromise;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
