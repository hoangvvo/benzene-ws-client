# benzene-ws-client

[![npm](https://badgen.net/npm/v/@benzene/worker)](https://www.npmjs.com/package/@benzene/worker)
[![minizipped](https://badgen.net/bundlephobia/minzip/benzene-ws-client)](https://bundlephobia.com/result?p=benzene-ws-client)

> This package is only experimental and not tested. Only works with `@benzene/ws` for now.

The *tiny* client for the [modified GraphQL over WebSocket Protocol](https://github.com/hoangvvo/benzene/blob/main/packages/ws/PROTOCOL.md).

## Install

```bash
yarn add benzene-ws-client
```

## Usage

```js
import { SubscriptionClient } from 'benzene-ws-client';

const subscriptionClient = new SubscriptionClient('wss://localhost/graphql', options);
```

#### urql

```js
import { Client, defaultExchanges, subscriptionExchange } from 'urql';

const client = new Client({
  url: '/graphql',
  exchanges: [
    ...defaultExchanges,
    subscriptionExchange({
      forwardSubscription(operation) {
        return subscriptionClient.request(operation);
      },
    }),
  ],
});
```

#### @apollo/client

```js
import { WebSocketLink } from "@apollo/client/link/ws";

const link = new WebSocketLink(subscriptionClient);
```

## Options

| option | description | default |
| --- | --- | --- |
| reconnectionAttempts | Number of attempts to try reconnect on disconnection. | `0` (disabled) |
| genId | A function to generate unique subscription ids. Default to incremental ids. | `undefined` |
