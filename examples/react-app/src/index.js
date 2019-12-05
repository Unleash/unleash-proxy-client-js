import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import { UnleashClient } from 'unleash-proxy-client';

const unleash = new UnleashClient({
    url: 'https://app.unleash-hosted.com/demo/proxy',
    clientKey: 'proxy-123',
    refreshInterval: 2,
    appName: 'react-app'
});
unleash.updateContext({userId: '1233'});
unleash.start();

ReactDOM.render(<App unleash={unleash} />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
