import { createHook } from "node:async_hooks";
import { format } from "node:util";
import { writeFileSync } from "node:fs";

const asyncHook = createHook({ init, destroy });
function debug(...args) {
  writeFileSync(1, `${format(...args)}\n`, { flag: "a" });
}
const TIMED_TYPES = ["Timeout", "Immediate", "PROMISE", "Microtask"];
const timers = new Map();
const resources = new Map();

function init(id, type, _, resource) {
  if (!TIMED_TYPES.includes(type)) {
    return;
  }
  // debug(`Init ${type} ${id}`);
  if (!timers.has(id)) {
    timers.set(id, process.hrtime());
    resources.set(id, resource);
  }
}

function destroy(id) {
  if (timers.has(id)) {
    const start = timers.get(id);
    const resource = resources.get(id);
    const elapsedTimes = process.hrtime(start);
    const elapsedTime =
      (elapsedTimes[0] * 1000000000 + elapsedTimes[1]) / 1000000;
    if (elapsedTime > 1000) {
      //debug(resource);
      //debug(`*** ${id} (${String(resource)}) took ${elapsedTime} ms`);
    }
    timers.delete(id);
  }
}
asyncHook.enable();
