# Unleash Proxy Client for the browser (js)

This is a tiny Unleash Client SDK you can use together with the 
[Unleash Proxy](https://docs.getunleash.io/sdks/unleash-proxy). 
This makes it super simple to use Unleash from any single page app. 

This client expect `fetch` to be available. If you need to support older
browsers you should probably use the [fetch polyfill](https://github.com/github/fetch). 

## Framworks supported

This package is not tied to any framework, but can be used together most popular frameworks, examples:

- No framework
- [React](https://reactjs.org/) - [example](https://github.com/unleash-hosted/unleash-proxy-client-js/tree/master/examples/react-app)
- [React Native](https://reactnative.dev/) 
- [Angular JS](https://angularjs.org/)
- [Vue.js])(https://vuejs.org/)
- ...and probably your favorite! 

## How to use the client as a module.


**Step 1: Install**
```js
npm install unleash-proxy-client --save
```

**Step 2: Initialize the SDK**
You need to have a Unleash-hosted instance, and the proxy need to be enabled. In addition you will need a proxy-specific `clientKey` in order to connect  to the Unleash-hosted Proxy.
```js
import { UnleashClient } from 'unleash-proxy-client';

const unleash = new UnleashClient({
    url: 'https://eu.unleash-hosted.com/hosted/proxy',
    clientKey: 'your-proxy-key',
    appName: 'my-webapp'
});

// Used to set the context fields, shared with the Unleash Proxy
unleash.updateContext({userId: '1233'});

// Start the background polling
unleash.start();
```

**Step 3: Check if feature toggle is enabled**
```js
unleash.isEnabled('proxy.demo');
```


**Step 4: Get toggle variant**
```js
const variant = unleash.getVariant('proxy.demo');
if(variant.name === 'blue') {
 // something with variant blue...
}
```

**Listen for updates via the EventEmitter**
The client is also an event emitter. This means that your code can subscribe to updates from the client. 
This is a neat way to update a single page app when toggle state updates. 

```js
unleash.on('update', () => {
    const myToggle = unleash.isEnabled('proxy.demo');
    //do something useful
});
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