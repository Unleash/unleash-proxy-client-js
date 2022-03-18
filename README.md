# Unleash Proxy Client for the browser (JS)

This is a tiny Unleash Client SDK you can use together with the 
[Unleash Proxy](https://docs.getunleash.io/sdks/unleash-proxy). 
This makes it super simple to use Unleash from any single page app. 

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

## How to use the client as a module

**Step 1: Unleash Proxy**

Before you can use this Unleash SDK you need set up a Unleash Proxy instance. [Read more about the Unleash Proxy](https://docs.getunleash.io/sdks/unleash-proxy).


**Step 2: Install**

```js
npm install unleash-proxy-client --save
```

**Step 3: Initialize the SDK**

You need to have a Unleash-hosted instance, and the proxy need to be enabled. In addition you will need a proxy-specific `clientKey` in order to connect  to the Unleash-hosted Proxy.

```js
import { UnleashClient } from 'unleash-proxy-client';

// See all options in separate section.
const unleash = new UnleashClient({
    url: 'https://eu.unleash-hosted.com/hosted/proxy',
    clientKey: 'your-proxy-key',
    appName: 'my-webapp'
});
```

**Step 4: Listen for when the client is ready**

You shouldn't start working with the client immediately. It's recommended to wait for `ready` or `initialized` event:

```js
unleash.on('ready', () => {
  if (unleash.isEnabled('proxy.demo')) {
    console.log('proxy.demo is enabled');
  } else {
    console.log('proxy.demo is disabled');
  }
})
```

The difference between the events is [explained below](#available-events).

**Step 5: Start polling the Unleash Proxy**

```js
// Used to set the context fields, shared with the Unleash Proxy. This 
// method will replace the entire (mutable part) of the Unleash Context.
unleash.updateContext({userId: '1233'});

// Used to update a single field on the Unleash Context.
unleash.setContextField('userId', '4141');

// Send the initial fetch towards the Unleash Proxy and starts the background polling
unleash.start();
```

**Step 6: Get toggle variant**

```js
const variant = unleash.getVariant('proxy.demo');
if(variant.name === 'blue') {
 // something with variant blue...
}
```

### Available options

The Unleash SDK takes the following options:

| option            | required | default | description                                                                                                                                      |
|-------------------|----------|---------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| url               | yes | n/a | The Unleash Proxy URL to connect to. E.g.: `https://examples.com/proxy`                                                                         |
| clientKey         | yes | n/a | The Unleash Proxy Secret to be used                                                                                                             | 
| appName           | yes | n/a | The name of the application using this SDK. Will be used as part of the metrics sent to Unleash Proxy. Will also be part of the Unleash Context. | 
| refreshInterval   | no | 30 | How often, in seconds, the SDK should check for updated toggle configuration. If set to 0 will disable checking for updates                 |
| disableRefresh    | no | false | If set to true, the client will not check for updated toggle configuration                                                                |
| metricsInterval   | no | 60 | How often, in seconds, the SDK should send usage metrics back to Unleash Proxy                                                              | 
| disableMetrics    | no | false | Set this option to `true` if you want to disable usage metrics                                                                           |
| storageProvider   | no | `LocalStorageProvider` | Allows you to inject a custom storeProvider                                                                              |
| environment       | no | 'default' | Identify the current environment. Will be part of the Unleash Context                                                                   | 
| fetch             | no | window.fetch | Allows you to override the fetch implementation to use. Useful in Node.js environments where you can inject `node-fetch`                    | 
| bootstrap         | no | `[]` | Allows you to bootstrap the cached feature toggle configuration.                                                                               | 
| bootstrapOverride | no| `true` | Should the boostrap automatically override cached data in the local-storage. Will only be used if boostrap is not an empty array.     | 
| headerName        | no| `Authorization` | Provides possiblity to specify custom header that is passed to Unleash / Unleash Proxy with the `clientKey` | 


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

- **error** - emitted when an error occurs on init, or when fetch function fails. The error object is sent as payload.
- **initialized** - emitted after the SDK has read local cached data in the storageProvider. 
- **ready** - emitted after the SDK has successfully started and performed the initial fetch towards the Unleash Proxy. 
- **update** - emitted every time the Unleash Proxy return a new feature toggle configuration. The SDK will emit this event as part of the initial fetch from the SDK.  

> PS! Please remember that you should always register your event listeners before your call `unleash.start()`. If you register them after you have started the SDK you risk loosing important events. 

### SessionId - Important note!

You may provide a custom session id via the "context". If you do not provide a sessionId this SDK will create a random session id, which will also be stored in the provided storage (local storage). By always having a consistent sessionId available ensures that even "anonymous" users will get a consistent experience when feature toggles is evaluated, in combination with a gradual (percentage based) rollout. 

### Stop the SDK
You can stop the Unleash client by calling the `stop` method. Once the client has been stopped, it will no longer check for updates or send metrics to the server.

```js
unleash.stop()
```

### Custom store

This SDK will use [@react-native-async-storage/async-storage](https://react-native-async-storage.github.io/async-storage/) to backup feature toggles locally. This is useful for bootstrapping the SDK the next time the user comes back to your application. 

You can provide your own storage implementation. 

Example: 

```js

import SharedPreferences from 'react-native-shared-preferences';
import { UnleashClient } from 'unleash-proxy-client';

const unleash = new UnleashClient({
    url: 'https://eu.unleash-hosted.com/hosted/proxy',
    clientKey: 'your-proxy-key',
    appName: 'my-webapp',
	storage: {
		save: (name: string, data: any) => SharedPreferences.setItem(name, data),
		get: (name: string) => SharedPreferences.getItem(name, (val) => val)
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
		"name": "blue"
	}
  }],
  bootstrapOverride: false
});
```
**NOTES: ⚠️**
If `bootstrapOverride` is `true` (by default), any local cached data will be overrided with the bootstrap specified.   
If `bootstrapOverride` is `false` any local cached data will not be overrided unless the local cache is empty.
