// import { UnleashClient } from 'unleash-proxy-client';
import { UnleashClient } from '../build/cjs/index.js';

const client = new UnleashClient({
    url: 'https://app.unleash-hosted.com/demo/api/frontend',
    clientKey:
        'demo-app:dev.bf8d2a449a025d1715a28f218dd66a40ef4dcc97b661398f7e05ba67',
    refreshInterval: 3,
    appName: 'js-client-example',
});
client.on('ready', () => {
    console.log('ready');
});
client.on('error', (e) => {
    console.error('error', e);
});
client.updateContext({ userId: '123' });
client.start();

setInterval(() => {
    console.log({ enabled: client.isEnabled('demoApp.step1') });
}, 3_000);
