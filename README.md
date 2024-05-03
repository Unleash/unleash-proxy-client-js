# Unleash Proxy Client for the browser (JS)

The JavaScript proxy client is a tiny Unleash client written in JavaScript without any external dependencies (except from browser APIs). This client stores toggles relevant for the current user in `localStorage` and synchronizes with Unleash (the [Unleash front-end API](https://docs.getunleash.io/reference/front-end-api) _or_ the [Unleash proxy](https://docs.getunleash.io/reference/unleash-proxy)) in the background. Because toggles are stored in the user's browser, the client can use them to bootstrap itself the next time the user visits the same web page.

This client expect `fetch` to be available. If you need to support older
browsers you should probably use the [fetch polyfill](https://github.com/github/fetch). 

## Frameworks supported

This package is not tied to any framework, but can be used together most popular frameworks, examples:

- [Unleash React SDK](https://docs.getunleash.io/sdks/proxy-react)
- [React](https://reactjs.org/)
- [React Native](https://reactnative.dev/) 
- [Angular JS](https://angularjs.org/)
- [Vue.js](https://vuejs.org/)
- ...and probably your favorite! 

## How to use the client

### Step 1: Installation

```js
npm install unleash-proxy-client
```

### Step 2: Initialize the SDK

---

💡 **TIP**: As a client-side SDK, this SDK requires you to connect to either an Unleash proxy or to the Unleash front-end API. Refer to the [connection options section](#connection-options) for more information.

---

Configure the client according to your needs. The following example provides only the required options. Refer to [the section on available options](#available-options) for the full list.

```js
import { UnleashClient } from 'unleash-proxy-client';

const unleash = new UnleashClient({
    url: 'https://<your-unleash-instance>/api/frontend',
    clientKey: '<your-client-side-token>',
    appName: 'my-webapp',
});

// Start the background polling
unleash.start();
```

#### Connection options

To connect this SDK to your Unleash instance's [front-end API](https://docs.getunleash.io/reference/front-end-api), use the URL to your Unleash instance's front-end API (`<unleash-url>/api/frontend`) as the `url` parameter. For the `clientKey` parameter, use a `FRONTEND` token generated from your Unleash instance. Refer to the [_how to create API tokens_](https://docs.getunleash.io/how-to/how-to-create-api-tokens) guide for the necessary steps.

To connect this SDK to the [Unleash proxy](https://docs.getunleash.io/reference/unleash-proxy), use the proxy's URL and a [proxy client key](https://docs.getunleash.io/reference/api-tokens-and-client-keys#proxy-client-keys). The [_configuration_ section of the Unleash proxy docs](https://docs.getunleash.io/reference/unleash-proxy#configuration) contains more info on how to configure client keys for your proxy.

### Step 3: Let the client synchronize

You should wait for the client's `ready` or `initialized` events before you start working with it. Before it's ready, the client might not report the correct state for your features.

```js
unleash.on('ready', () => {
    if (unleash.isEnabled('proxy.demo')) {
        console.log('proxy.demo is enabled');
    } else {
        console.log('proxy.demo is disabled');
    }
});
```

The difference between the events is described in the [section on available events](#available-events).

### Step 4: Check feature toggle states

Once the client is ready, you can start checking features in your application. Use the `isEnabled` method to check the state of any feature you want:

```js
unleash.isEnabled('proxy.demo');
```

You can use the `getVariant` method to get the variant of an **enabled feature that has variants**. If the feature is disabled or if it has no variants, then you will get back the [**disabled variant**](https://docs.getunleash.io/reference/feature-toggle-variants#the-disabled-variant)

```js
const variant = unleash.getVariant('proxy.demo');
if (variant.name === 'blue') {
    // something with variant blue...
}
```

#### Updating the Unleash context

The [Unleash context](https://docs.getunleash.io/reference/unleash-context) is used to evaluate features against attributes of a the current user. To update and configure the Unleash context in this SDK, use the `updateContext`, `setContextField` and `removeContextField` methods.

The context you set in your app will be passed along to the Unleash proxy or the front-end API as query parameters for feature evaluation.

The `updateContext` method will replace the entire
(mutable part) of the Unleash context with the data that you pass in.

The `setContextField` method only acts on the property that you choose. It does not affect any other properties of the Unleash context.

```js
unleash.updateContext({ userId: '1233' });

unleash.setContextField('userId', '4141');
```

The `removeContextField` method only acts on the property that you choose. It does not affect any other properties of the Unleash context.

```js
unleash.updateContext({ userId: '1233', sessionId: 'sessionNotAffected' });

unleash.removeContextField('userId');
```

### Available options

The Unleash SDK takes the following options:

| option            | required | default | description                                                                                                                                      |
|-------------------|----------|---------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| url               | yes | n/a | The Unleash Proxy URL to connect to. E.g.: `https://examples.com/proxy`                                                                         |
| clientKey         | yes | n/a | The Unleash Proxy Secret to be used                                                                                                             | 
| appName           | yes | n/a | The name of the application using this SDK. Will be used as part of the metrics sent to Unleash Proxy. Will also be part of the Unleash Context. | 
| refreshInterval   | no | `30` | How often, in seconds, the SDK should check for updated toggle configuration. If set to 0 will disable checking for updates                 |
| disableRefresh    | no | `false` | If set to true, the client will not check for updated toggle configuration                                                                |
| metricsInterval   | no | `60` | How often, in seconds, the SDK should send usage metrics back to Unleash Proxy                                                              | 
| disableMetrics    | no | `false` | Set this option to `true` if you want to disable usage metrics                                                                           |
| storageProvider   | no | `LocalStorageProvider` in browser, `InMemoryStorageProvider` otherwise | Allows you to inject a custom storeProvider                                                                              |
| fetch             | no | `window.fetch` or global `fetch` | Allows you to override the fetch implementation to use. Useful in Node.js environments where you can inject `node-fetch`                    | 
| bootstrap         | no | `[]` | Allows you to bootstrap the cached feature toggle configuration.                                                                               | 
| bootstrapOverride | no| `true` | Should the bootstrap automatically override cached data in the local-storage. Will only be used if bootstrap is not an empty array.     | 
| headerName        | no| `Authorization` | Which header the SDK should use to authorize with Unleash / Unleash Proxy. The header will be given the `clientKey` as its value. |
| customHeaders     | no| `{}` | Additional headers to use when making HTTP requests to the Unleash proxy. In case of name collisions with the default headers, the `customHeaders` value will be used if it is not `null` or `undefined`. `customHeaders` values that are `null` or `undefined` will be ignored. |
| impressionDataAll | no| `false` | Allows you to trigger "impression" events for **all** `getToggle` and `getVariant` invocations. This is particularly useful for "disabled" feature toggles that are not visible to frontend SDKs. |
| environment | no | `default` | Sets the `environment` option of the [Unleash context](https://docs.getunleash.io/reference/unleash-context). This does **not** affect the SDK's [Unleash environment](https://docs.getunleash.io/reference/environments). |
| togglesStorageTTL   | no | `0` | How much time, in seconds, the toggles are considered valid and should not be fetched again. If set to 0 will disable checking for expiration and considered always expired                 |

### Listen for updates via the EventEmitter

The client is also an event emitter. This means that your code can subscribe to updates from the client. 
This is a neat way to update a single page app when toggle state updates. 

```js
unleash.on('update', () => {
    const myToggle = unleash.isEnabled('proxy.demo');
    //do something useful
});
```

#### Available events:

- **error** - emitted when an error occurs on init, or when fetch function fails, or when fetch receives a non-ok response object. The error object is sent as payload.
- **initialized** - emitted after the SDK has read local cached data in the storageProvider. 
- **ready** - emitted after the SDK has successfully started and performed the initial fetch towards the Unleash Proxy. 
- **update** - emitted every time the Unleash Proxy return a new feature toggle configuration. The SDK will emit this event as part of the initial fetch from the SDK.  
- **recovered** - emitted when the SDK has recovered from an error. This event will only be emitted if the SDK has previously emitted an error.
- **sent** - emitted when the SDK has successfully sent metrics to Unleash.

> PS! Please remember that you should always register your event listeners before your call `unleash.start()`. If you register them after you have started the SDK you risk loosing important events. 

### SessionId - Important note!

You may provide a custom session id via the "context". If you do not provide a sessionId this SDK will create a random session id, which will also be stored in the provided storage (local storage). By always having a consistent sessionId available ensures that even "anonymous" users will get a consistent experience when feature toggles is evaluated, in combination with a gradual (percentage based) rollout. 

### Stop the SDK
You can stop the Unleash client by calling the `stop` method. Once the client has been stopped, it will no longer check for updates or send metrics to the server.

A stopped client _can_ be restarted.

```js
unleash.stop()
```

### Custom store

This SDK can work with React Native storage [@react-native-async-storage/async-storage](https://react-native-async-storage.github.io/async-storage/) or [react-native-shared-preferences](https://github.com/sriraman/react-native-shared-preferences) and many more to backup feature toggles locally. This is useful for bootstrapping the SDK the next time the user comes back to your application. 

You can provide your own storage implementation. 

Examples: 

```typescript
import SharedPreferences from 'react-native-shared-preferences';
import { UnleashClient } from 'unleash-proxy-client';

const unleash = new UnleashClient({
    url: 'https://eu.unleash-hosted.com/hosted/proxy',
    clientKey: 'your-proxy-key',
    appName: 'my-webapp',
    storageProvider: {
      save: (name: string, data: any) => SharedPreferences.setItem(name, data),
      get: (name: string) => SharedPreferences.getItem(name, (val) => val)
    },
});
```

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UnleashClient } from 'unleash-proxy-client';

const PREFIX = 'unleash:repository';

const unleash = new UnleashClient({
    url: 'https://eu.unleash-hosted.com/hosted/proxy',
    clientKey: 'your-proxy-key',
    appName: 'my-webapp',
    storageProvider: {
       save: (name: string, data: any) => {
        const repo = JSON.stringify(data);
        const key = `${PREFIX}:${name}`;
        return AsyncStorage.setItem(key, repo);
      },
      get: (name: string) => {
        const key = `${PREFIX}:${name}`;
        const data = await AsyncStorage.getItem(key);
        return data ? JSON.parse(data) : undefined;
      }
    },
});
```
## How to use in node.js

This SDK can also be used in node.js applications (from v1.4.0). Please note that you will need to provide a valid "fetch" implementation. Only ECMAScript modules is exported from this package.

```js
import fetch from 'node-fetch';
import { UnleashClient, InMemoryStorageProvider } from 'unleash-proxy-client';

const unleash = new UnleashClient({
  url: 'https://app.unleash-hosted.com/demo/proxy',
  clientKey: 'proxy-123',
  appName: 'nodejs-proxy',
  storageProvider: new InMemoryStorageProvider(),
  fetch,
});

await unleash.start();
const isEnabled = unleash.isEnabled('proxy.demo');
console.log(isEnabled);
```
*index.mjs*

## How to use the client via CDN.

```html
<html>
<head>
    <script src="https://unpkg.com/unleash-proxy-client@latest/build/main.min.js" type="text/javascript"></script>
    <script type="text/javascript">
        var config = {url: 'https://app.unleash-hosted.com/demo/proxy', clientKey: 'proxy-123', appName: 'web'};
        var client = new unleash.UnleashClient(config);
        client.updateContext({userId: '1233'})

        client.on('update', () => {
            console.log(client.isEnabled('proxy.demo'));
        });
        client.start();
    </script>
</head>
</html>
```
## Bootstrap
Now it is possible to bootstrap the SDK with your own feature toggle configuration when you don't want to make an API call.  

This is also useful if you require the toggles to be in a certain state immediately after initializing the SDK.

### How to use it ?
Add a `bootstrap` attribute when create a new `UnleashClient`.  
There's also a `bootstrapOverride` attribute which is by default is `true`.

```js
import { UnleashClient } from 'unleash-proxy-client';

const unleash = new UnleashClient({
  url: 'https://app.unleash-hosted.com/demo/proxy',
  clientKey: 'proxy-123',
  appName: 'nodejs-proxy',
  bootstrap: [{
	"enabled": true,
	"name": "demoApp.step4",
	"variant": {
		"enabled": true,
		"name": "blue",
		"feature_enabled": true,
	}
  }],
  bootstrapOverride: false
});
```
**NOTES: ⚠️**
If `bootstrapOverride` is `true` (by default), any local cached data will be overridden with the bootstrap specified.   
If `bootstrapOverride` is `false` any local cached data will not be overridden unless the local cache is empty.
