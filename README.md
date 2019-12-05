# Unleash Proxy Client for the browser (js)

This is a tiny Unleash Client SDK you can use together with the 
[Unleash Hosted Proxy](https://www.unleash-hosted.com/articles/the-unleash-proxy). 
This makes it super simple to use Unleash-hosted from any single page app. 

This client expect `fetch` to be available. If you need to support older
browsers you should probably use the [fetch polyfill](https://github.com/github/fetch). 


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
 // somehting with variant blue...
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


## How to use the client via CDN.

```html
<html>
<head>
    <script src="https://unpkg.com/unleash-proxy-client@latest/build/main.min.js" type="text/javascript"></script>
    <script type="text/javascript">
        var config = {url: 'https://app.unleash-hosted.com/demo/proxy', clientKey: 'proxy-123', appName: 'web'};
        var client = new unleash.UnleashClient(config);
        clinet.updateContext({userId: '1233'})

        client.on('update', () => {
            console.log(client.isEnabled('proxy.demo'));
        });
        client.start();
    </script>
</head>
</html>
```