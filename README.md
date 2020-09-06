# benzene-ws-client

Super ligt

> This package is only experimental and not tested.

Only works with `@benzene/ws` for now.

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
| reconnectionAttempts | Number of attempts to try reconnect on disconnection. Set to `0` to disable | `0` (disabled) |
| genId | A function to generate unique subscription ids. Default to incremental ids. | `undefined` |


