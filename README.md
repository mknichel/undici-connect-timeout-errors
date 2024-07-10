# Undici `ConnectTimeoutError` tests

This repository tests Undici for situations that lead to `UND_ERR_CONNECT_TIMEOUT` errors.

This error can be reproduced by blocking the event loop for at least 10 seconds (the default Undici `connectTimeout`) after starting a `fetch` request.

To reproduce, run:

```sh
pnpm test
```

To see debug information, you can use `NODE_DEBUG` options such as `NODE_DEBUG=*`.

This results in a log that looks like:

```
Starting test!
 - Using undici for fetch
 - Undici connectTimeout is set to the default of 10000 ms
--------------------
Starting fetch to http://www.example.org/?_=0
FETCH 99062: connecting to www.example.org using http:undefined
NET 99062: createConnection [
  {
    highWaterMark: 65536,
    path: undefined,
    localAddress: null,
    port: 80,
    host: 'www.example.org'
  },
  null,
  [Symbol(normalizedArgs)]: true
]
NET 99062: pipe false undefined
NET 99062: connect: find host www.example.org
NET 99062: connect: dns options { family: undefined, hints: 1024 }
NET 99062: connect: autodetecting
TIMER 99062: no 10000 list was found in insert, creating a new one
Started long running task
Long running task took 12907 ms
TIMER 99062: process timer lists 13136
TIMER 99062: timeout callback 10000
TIMER 99062: 10000 list empty
NET 99062: connect/multiple: only one address found, switching back to single connection
NET 99062: connect: attempting to connect to 93.184.215.14:80 (addressType: 4)
NET 99062: destroy
NET 99062: close
NET 99062: close handle
FETCH 99062: connection to www.example.org using http:undefined errored - Connect Timeout Error
FETCH 99062: request to GET http://www.example.org//?_=0 errored - Connect Timeout Error
TypeError: fetch failed
    at fetch (/Users/mknichel/code/tmp/undici-connect-timeout-errors/node_modules/.pnpm/undici@6.19.2/node_modules/undici/index.js:112:13)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at fetchExample (/Users/mknichel/code/tmp/undici-connect-timeout-errors/index.ts:21:20)
    at main (/Users/mknichel/code/tmp/undici-connect-timeout-errors/index.ts:66:3) {
  [cause]: ConnectTimeoutError: Connect Timeout Error
      at onConnectTimeout (/Users/mknichel/code/tmp/undici-connect-timeout-errors/node_modules/.pnpm/undici@6.19.2/node_modules/undici/lib/core/connect.js:190:24)
      at /Users/mknichel/code/tmp/undici-connect-timeout-errors/node_modules/.pnpm/undici@6.19.2/node_modules/undici/lib/core/connect.js:133:46
      at Immediate._onImmediate (/Users/mknichel/code/tmp/undici-connect-timeout-errors/node_modules/.pnpm/undici@6.19.2/node_modules/undici/lib/core/connect.js:174:9)
      at process.processImmediate (node:internal/timers:478:21) {
    code: 'UND_ERR_CONNECT_TIMEOUT'
  }
}
```

It looks like what is happening is:

1. A new connection is created but the attempt to connect is delayed until another round of the event loop. `lookup` has to make a call to `GetAddrInfoReq` which causes the `emitLookup` callback to be async and take place on the next event loop.
2. A task takes place that takes a long time.
3. The `onConnectTimeout` timer is run because the previous task took longer than the timeout. This calls `setImmediate` to destroy the socket.
4. The `lookup` callback (`emitLookup` in `node:net`) is run. The connection attempt begins (`internalConnect` is called) but that is also asynchronous, so it won't finish in this round of the event loop.
5. The `setImmediate` function is run, destroying the socket.
6. The error is thrown.

## Making this pass

`node-fetch` does not exhibit this problem:

```sh
pnpm test -- --node-fetch
```

The default Undici connect timeout can also be increased to be longer than the blocked event loop:

```sh
pnpm test -- --connect-timeout-ms 30000
```
