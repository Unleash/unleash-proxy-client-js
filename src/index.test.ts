import { FetchMock } from 'jest-fetch-mock';
import * as data from '../tests/example-data.json'; 
import IStorageProvider from './storage-provider';
import { EVENTS, IConfig, IMutableContext, UnleashClient } from './index';

jest.useFakeTimers();

const fetchMock = fetch as FetchMock;

afterEach(() => {
    fetchMock.resetMocks();
    jest.clearAllTimers();
});

test('Should initialize unleash-client', () => {
    const config: IConfig = { url: 'http://localhost/test', clientKey: '12', appName: 'web' };
    const client = new UnleashClient(config);
    expect(config.url).toBe('http://localhost/test');
});

test('Should perform an initial fetch', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(data));
    const config: IConfig = { url: 'http://localhost/test', clientKey: '12', appName: 'web' };
    const client = new UnleashClient(config);
    await client.start();
    const isEnabled = client.isEnabled('simpleToggle');
    client.stop();
    expect(isEnabled).toBe(true);
});

test('Should have correct variant', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(data));
    const config: IConfig = { url: 'http://localhost/test', clientKey: '12', appName: 'web' };
    const client = new UnleashClient(config);
    await client.start();
    const variant = client.getVariant('variantToggle');
    const payload = variant.payload || {type: 'undef', value: ''};
    client.stop();
    expect(variant.name).toBe('green');
    expect(payload.type).toBe('string');
    expect(payload.value).toBe('some-text');
});

test('Should handle error and return false for isEnabled', async () => {
    jest.spyOn(global.console, 'error').mockImplementation(() => jest.fn());
    fetchMock.mockReject();
    class Store implements IStorageProvider {
        public async save(name: string, data: any) {
            return Promise.resolve();
        }
    
        public async get(name: string) {
            return Promise.resolve([]);
        }
    }
    const storageProvider = new Store 
    const config: IConfig = { url: 'http://localhost/test', clientKey: '12', appName: 'web', storageProvider };
    const client = new UnleashClient(config);
    await client.start();
    const isEnabled = client.isEnabled('simpleToggle');
    client.stop();
    expect(isEnabled).toBe(false);
});

test('Should read session id form localStorage', async () => {
    const sessionId = '123';
    fetchMock.mockReject();
    class Store implements IStorageProvider {
        public async save(name: string, data: any) {
            return Promise.resolve();
        }
    
        public async get(name: string) {
            if(name === 'sessionId') {
                return sessionId;
            } else {
                return Promise.resolve([]);
            }
        }
    }
    const storageProvider = new Store 
    const config: IConfig = { url: 'http://localhost/test', clientKey: '12', appName: 'web', storageProvider };
    const client = new UnleashClient(config);
    await client.start();
    const context = client.getContext();
    expect(context.sessionId).toBe(sessionId);
});

test('Should read toggles form localStorage', async () => {
    jest.spyOn(global.console, 'error').mockImplementation(() => jest.fn());
    const toggles = [{
        "name": "featureToggleBackup",
        "enabled": true,
        "variant": {
            "name": "disabled",
            "enabled": false
        }
    }];
    fetchMock.mockReject();
    class Store implements IStorageProvider {
        public async save(name: string, data: any) {
            return Promise.resolve();
        }
    
        public async get(name: string) {
            if(name === 'repo') {
                return toggles;
            } else {
                return Promise.resolve(undefined);
            }
        }
    }
    const storageProvider = new Store();
    const config: IConfig = { url: 'http://localhost/test', clientKey: '12', appName: 'web', storageProvider };
    const client = new UnleashClient(config);
    await client.start();
    expect(client.isEnabled('featureToggleBackup')).toBe(true);
    expect(client.isEnabled('featureUnknown')).toBe(false);
});

test('Should publish ready when initial fetch completed', (done) => {
    fetchMock.mockResponseOnce(JSON.stringify(data));
    const config: IConfig = { url: 'http://localhost/test', clientKey: '12', appName: 'web' };
    const client = new UnleashClient(config);
    client.start();
    client.on(EVENTS.READY, () => {
        const isEnabled = client.isEnabled('simpleToggle');
        client.stop();
        expect(isEnabled).toBe(true);
        done();
    });
});

test('Should publish update when state changes after refreshInterval', async () => {
    expect.assertions(1);
    fetchMock.mockResponses(
        [JSON.stringify(data), { status: 200 }],
        [JSON.stringify(data), { status: 200 }],
    );
    const config: IConfig = { url: 'http://localhost/test', clientKey: '12', refreshInterval: 1, appName: 'web' };
    const client = new UnleashClient(config);

    let counts = 0;
    client.on(EVENTS.UPDATE, () => {
        counts++;
        if (counts === 2) {
            expect(fetchMock.mock.calls.length).toEqual(2);
            client.stop();
        }
    });

    await client.start();

    jest.advanceTimersByTime(1001);
});

test('Should include etag in second request', async () => {
    const etag = '123a';
    fetchMock.mockResponses(
        [JSON.stringify(data), { status: 200, headers: { ETag: etag} }],
        [JSON.stringify(data), { status: 304, headers: { ETag: etag} }],
    );
    const config: IConfig = { url: 'http://localhost/test', clientKey: '12', refreshInterval: 1, appName: 'web' };
    const client = new UnleashClient(config);

    await client.start();

    jest.advanceTimersByTime(1001);

    expect(fetchMock.mock.calls[0][1].headers['If-None-Match']).toEqual('');
    expect(fetchMock.mock.calls[1][1].headers['If-None-Match']).toEqual(etag);
});

test('Should add clientKey as Authorization header', async () => {
    fetchMock.mockResponses(
        [JSON.stringify(data), { status: 200 }],
        [JSON.stringify(data), { status: 200 }],
    );
    const config: IConfig = { url: 'http://localhost/test', clientKey: 'some123key', appName: 'web' };
    const client = new UnleashClient(config);
    await client.start();

    jest.advanceTimersByTime(1001);

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toEqual('some123key');
});

test('Should require appName', () => {
    expect(() => {
        // tslint:disable-next-line
        new UnleashClient({ url: 'http://localhost/test', clientKey: '12', appName: '' })
      }).toThrow();
});

test('Should require url', () => {
    expect(() => {
        // tslint:disable-next-line
        new UnleashClient({ url: '', clientKey: '12', appName: 'web' })
      }).toThrow();
});

test('Should require valid url', () => {
    expect(() => {
        // tslint:disable-next-line
        new UnleashClient({ url: 'not-a-url', clientKey: '12', appName: 'web' })
      }).toThrow();
});

test('Should require valid clientKey', () => {
    expect(() => {
        // tslint:disable-next-line
        new UnleashClient({ url: 'http://localhost/test', clientKey: '', appName: 'web' })
      }).toThrow();
});

test('Should stop fetching when stop is called', async () => {
    fetchMock.mockResponses(
        [JSON.stringify(data), { status: 200 }],
        [JSON.stringify(data), { status: 200 }],
        [JSON.stringify(data), { status: 200 }],
    );
    const config: IConfig = { url: 'http://localhost/test', clientKey: '12', refreshInterval: 1, appName: 'web' };
    const client = new UnleashClient(config);

    await client.start();

    jest.advanceTimersByTime(1001);

    client.stop();

    jest.advanceTimersByTime(1001);
    jest.advanceTimersByTime(1001);
    jest.advanceTimersByTime(1001);

    expect(fetchMock.mock.calls.length).toEqual(2);
});

test('Should include context fields on request', async () => {
    fetchMock.mockResponses(
        [JSON.stringify(data), { status: 200 }],
        [JSON.stringify(data), { status: 304 }],
    );
    const context: IMutableContext = {
        userId: '123',
        sessionId: '456',
        remoteAddress: 'address',
        properties: {
            property1: 'property1',
            property2: 'property2',
        }
    }
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        environment: 'prod',
        context
    };
    const client = new UnleashClient(config);

    await client.start();

    jest.advanceTimersByTime(1001);

    const url = new URL(fetchMock.mock.calls[0][0]);

    expect(url.searchParams.get('userId')).toEqual('123');
    expect(url.searchParams.get('sessionId')).toEqual('456');
    expect(url.searchParams.get('remoteAddress')).toEqual('address');
    expect(url.searchParams.get('properties[property1]')).toEqual('property1');
    expect(url.searchParams.get('properties[property2]')).toEqual('property2');
    expect(url.searchParams.get('appName')).toEqual('web');
    expect(url.searchParams.get('environment')).toEqual('prod');
});

test('Should update context fields on request', async () => {
    fetchMock.mockResponses(
        [JSON.stringify(data), { status: 200 }],
        [JSON.stringify(data), { status: 304 }],
    );
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        environment: 'prod'
    };
    const client = new UnleashClient(config);
    client.updateContext({
        userId: '123',
        sessionId: '456',
        remoteAddress: 'address',
        properties: {
            property1: 'property1',
            property2: 'property2'
        }
    });

    await client.start();

    jest.advanceTimersByTime(1001);

    const url = new URL(fetchMock.mock.calls[0][0]);

    expect(url.searchParams.get('userId')).toEqual('123');
    expect(url.searchParams.get('sessionId')).toEqual('456');
    expect(url.searchParams.get('remoteAddress')).toEqual('address');
    expect(url.searchParams.get('properties[property1]')).toEqual('property1');
    expect(url.searchParams.get('properties[property2]')).toEqual('property2');
    expect(url.searchParams.get('appName')).toEqual('web');
    expect(url.searchParams.get('environment')).toEqual('prod');
});

test('Should not add property fields when properties is an empty object', async () => {
    fetchMock.mockResponses(
        [JSON.stringify(data), { status: 200 }],
        [JSON.stringify(data), { status: 304 }],
    );
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        environment: 'prod',
        context: {
            properties: {}
        }
    };
    const client = new UnleashClient(config);

    await client.start();

    jest.advanceTimersByTime(1001);

    const url = new URL(fetchMock.mock.calls[0][0]);

    // console.log(url.toString(), url.searchParams.toString(), url.searchParams.get('properties'));

    expect(url.searchParams.get('appName')).toEqual('web');
    expect(url.searchParams.get('environment')).toEqual('prod');
    expect(url.searchParams.get('properties')).toBeNull();
});

test('Should use default environment', async () => {
    fetchMock.mockResponses(
        [JSON.stringify(data), { status: 200 }],
        [JSON.stringify(data), { status: 200 }],
    );
    const config: IConfig = { url: 'http://localhost/test', clientKey: '12', appName: 'web' };
    const client = new UnleashClient(config);
    await client.start();

    jest.advanceTimersByTime(1001);

    const url = new URL(fetchMock.mock.calls[0][0]);

    expect(url.searchParams.get('environment')).toEqual('default');
});
