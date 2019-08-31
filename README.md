# Unleash Proxy Client for the browser (js)

This is a client that your can use in the browser together with the 
unleash-proxy, available for unleash-hosted customers. 


## How to use as a module. 


**Step 1: Install**
```js
npm install unleash-proxy-client --save
```

**Step 2: Initialize**
```js
import { UnleashClient } from 'unleash-proxy-client';

const unleash = new UnleashClient({url: 'https://eu.unleash-hosted.com/hosted/api', clientKey: 'your-proxy-key'});
unleash.updateContext({userId: '1233'});
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