import { FetchMock } from 'jest-fetch-mock';
import 'jest-localstorage-mock';
import * as data from './test/testdata.json';
import IStorageProvider from './storage-provider';
import { EVENTS, IConfig, IMutableContext, UnleashClient } from './index';
import { getTypeSafeRequest, getTypeSafeRequestUrl } from './test';

jest.useFakeTimers();

const fetchMock = fetch as FetchMock;

afterEach(() => {
    fetchMock.resetMocks();
    jest.clearAllTimers();
});

test('Should initialize unleash-client', () => {
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
    };
    new UnleashClient(config);
    expect(config.url).toBe('http://localhost/test');
});

test('Should perform an initial fetch', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(data));
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
    };
    const client = new UnleashClient(config);
    await client.start();
    const isEnabled = client.isEnabled('simpleToggle');
    client.stop();
    expect(isEnabled).toBe(true);
});

test('Should perform an initial fetch as POST', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(data));
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'webAsPOST',
        usePOSTrequests: true,
    };
    const client = new UnleashClient(config);
    await client.start();

    const request = getTypeSafeRequest(fetchMock, 0);
    const body = JSON.parse(request.body as string);

    expect(request.method).toBe('POST');
    expect(body.context.appName).toBe('webAsPOST');
});

test('Should perform an initial fetch as GET', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(data));
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'webAsGET',
    };
    const client = new UnleashClient(config);
    await client.start();

    const request = getTypeSafeRequest(fetchMock, 0);

    expect(request.method).toBe('GET');
});


test('Should have correct variant', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(data));
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
    };
    const client = new UnleashClient(config);
    await client.start();
    const variant = client.getVariant('variantToggle');
    const payload = variant.payload || { type: 'undef', value: '' };
    client.stop();
    expect(variant.name).toBe('green');
    expect(variant.enabled).toBe(true);
    expect(payload.type).toBe('string');
    expect(payload.value).toBe('some-text');
});

test('Should return default variant if not found', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(data));
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
    };
    const client = new UnleashClient(config);
    await client.start();
    const variant = client.getVariant('missingToggle');
    const payload = variant.payload || { type: 'undef', value: '' };
    client.stop();
    expect(variant.name).toBe('disabled');
    expect(variant.enabled).toBe(false);
    expect(payload.type).toBe('undef');
    expect(payload.value).toBe('');
});

test('Should handle error and return false for isEnabled', async () => {
    jest.spyOn(global.console, 'error').mockImplementation(() => jest.fn());
    fetchMock.mockReject();
    class Store implements IStorageProvider {
        public async save() {
            return Promise.resolve();
        }

        public async get() {
            return Promise.resolve([]);
        }
    }
    const storageProvider = new Store();
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        storageProvider,
    };
    const client = new UnleashClient(config);
    await client.start();
    const isEnabled = client.isEnabled('simpleToggle');
    client.stop();
    expect(isEnabled).toBe(false);
});

test('Should read session id from localStorage', async () => {
    const sessionId = '123';
    fetchMock.mockReject();
    class Store implements IStorageProvider {
        public async save() {
            return Promise.resolve();
        }

        public async get(name: string) {
            if (name === 'sessionId') {
                return sessionId;
            } else {
                return Promise.resolve([]);
            }
        }
    }
    const storageProvider = new Store();
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        storageProvider,
    };
    const client = new UnleashClient(config);
    await client.start();
    const context = client.getContext();
    expect(context.sessionId).toBe(sessionId);
});

test('Should read toggles from localStorage', async () => {
    jest.spyOn(global.console, 'error').mockImplementation(() => jest.fn());
    const toggles = [
        {
            name: 'featureToggleBackup',
            enabled: true,
            variant: {
                name: 'disabled',
                enabled: false,
            },
        },
    ];
    fetchMock.mockReject();
    class Store implements IStorageProvider {
        public async save() {
            return Promise.resolve();
        }

        public async get(name: string) {
            if (name === 'repo') {
                return Promise.resolve(toggles);
            } else {
                return Promise.resolve(undefined);
            }
        }
    }
    const storageProvider = new Store();
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        storageProvider,
    };
    const client = new UnleashClient(config);
    await client.start();
    expect(client.isEnabled('featureToggleBackup')).toBe(true);
    expect(client.isEnabled('featureUnknown')).toBe(false);
});

test('Should bootstrap data when bootstrap is provided', async () => {
    localStorage.clear();
    const storeKey = 'unleash:repository:repo';
    const bootstrap = [
        {
            name: 'toggles',
            enabled: true,
            variant: {
                name: 'disabled',
                enabled: false,
            },
            impressionData: true,
        },
        {
            name: 'algo',
            enabled: true,
            variant: {
                name: 'disabled',
                enabled: false,
            },
            impressionData: true,
        },
    ];
    const initialData = [
        {
            name: 'initialData',
            enabled: true,
            variant: {
                name: 'disabled',
                enabled: false,
            },
            impressionData: true,
        },
        {
            name: 'test initial',
            enabled: true,
            variant: {
                name: 'disabled',
                enabled: false,
            },
            impressionData: true,
        },
    ];

    localStorage.setItem(storeKey, JSON.stringify(initialData));
    expect(localStorage.getItem(storeKey)).toBe(JSON.stringify(initialData));

    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        bootstrap,
    };
    const client = new UnleashClient(config);
    await client.start();

    expect(client.getAllToggles()).toStrictEqual(bootstrap);
    expect(localStorage.getItem(storeKey)).toBe(JSON.stringify(bootstrap));
});

test('Should set internal toggle state when bootstrap is set, before client is started', async () => {
    localStorage.clear();
    const storeKey = 'unleash:repository:repo';
    const bootstrap = [
        {
            name: 'toggles',
            enabled: true,
            variant: {
                name: 'disabled',
                enabled: false,
            },
            impressionData: true,
        },
        {
            name: 'algo',
            enabled: true,
            variant: {
                name: 'disabled',
                enabled: false,
            },
            impressionData: true,
        },
    ];
    const initialData = [
        {
            name: 'initialData',
            enabled: true,
            variant: {
                name: 'disabled',
                enabled: false,
            },
            impressionData: true,
        },
        {
            name: 'test initial',
            enabled: true,
            variant: {
                name: 'disabled',
                enabled: false,
            },
            impressionData: true,
        },
    ];

    localStorage.setItem(storeKey, JSON.stringify(initialData));
    expect(localStorage.getItem(storeKey)).toBe(JSON.stringify(initialData));

    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        bootstrap,
    };
    const client = new UnleashClient(config);
    expect(client.getAllToggles()).toStrictEqual(bootstrap);
    await client.start();
    expect(localStorage.getItem(storeKey)).toBe(JSON.stringify(bootstrap));
});

test('Should not bootstrap data when bootstrapOverride is false and localStorage is not empty', async () => {
    localStorage.clear();
    const storeKey = 'unleash:repository:repo';
    const bootstrap = [
        {
            name: 'toggles',
            enabled: true,
            variant: {
                name: 'disabled',
                enabled: false,
            },
            impressionData: true,
        },
        {
            name: 'algo',
            enabled: true,
            variant: {
                name: 'disabled',
                enabled: false,
            },
            impressionData: true,
        },
    ];
    const initialData = [
        {
            name: 'initialData',
            enabled: true,
            variant: {
                name: 'disabled',
                enabled: false,
            },
            impressionData: true,
        },
        {
            name: 'test initial',
            enabled: true,
            variant: {
                name: 'disabled',
                enabled: false,
            },
            impressionData: true,
        },
    ];

    localStorage.setItem(storeKey, JSON.stringify(initialData));
    expect(localStorage.getItem(storeKey)).toBe(JSON.stringify(initialData));

    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        bootstrap,
        bootstrapOverride: false,
    };
    const client = new UnleashClient(config);
    await client.start();

    expect(client.getAllToggles()).toStrictEqual(initialData);
    expect(localStorage.getItem(storeKey)).toBe(JSON.stringify(initialData));
});

test('Should bootstrap when bootstrapOverride is false and local storage is empty', async () => {
    localStorage.clear();
    const storeKey = 'unleash:repository:repo';
    const bootstrap = [
        {
            name: 'toggles',
            enabled: true,
            variant: {
                name: 'disabled',
                enabled: false,
            },
            impressionData: true,
        },
        {
            name: 'algo',
            enabled: true,
            variant: {
                name: 'disabled',
                enabled: false,
            },
            impressionData: true,
        },
    ];

    localStorage.setItem(storeKey, JSON.stringify([]));
    expect(localStorage.getItem(storeKey)).toBe(JSON.stringify([]));

    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        bootstrap,
        bootstrapOverride: false,
    };
    const client = new UnleashClient(config);
    await client.start();

    expect(client.getAllToggles()).toStrictEqual(bootstrap);
    expect(localStorage.getItem(storeKey)).toBe(JSON.stringify(bootstrap));
});

test('Should not bootstrap data when bootstrap is []', async () => {
    localStorage.clear();
    const storeKey = 'unleash:repository:repo';
    const initialData = [
        {
            name: 'initialData',
            enabled: true,
            variant: {
                name: 'disabled',
                enabled: false,
            },
        },
        {
            name: 'test initial',
            enabled: true,
            variant: {
                name: 'disabled',
                enabled: false,
            },
        },
    ];

    localStorage.setItem(storeKey, JSON.stringify(initialData));
    expect(localStorage.getItem(storeKey)).toBe(JSON.stringify(initialData));

    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        bootstrap: [],
        bootstrapOverride: true,
    };
    const client = new UnleashClient(config);
    await client.start();

    expect(client.getAllToggles()).toStrictEqual(initialData);
    expect(localStorage.getItem(storeKey)).toBe(JSON.stringify(initialData));
});

test('Should publish ready event when bootstrap is provided, before client is started', async () => {
    localStorage.clear();
    const bootstrap = [
        {
            name: 'toggles',
            enabled: true,
            variant: {
                name: 'disabled',
                enabled: false,
            },
            impressionData: true,
        },
        {
            name: 'algo',
            enabled: true,
            variant: {
                name: 'disabled',
                enabled: false,
            },
            impressionData: true,
        },
    ];

    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        bootstrap,
    };
    const client = new UnleashClient(config);
    expect(client.getAllToggles()).toStrictEqual(bootstrap);
    client.on(EVENTS.READY, () => {
        expect(client.isEnabled('algo')).toBe(true);
    });
});

test('Should publish ready when initial fetch completed', (done) => {
    fetchMock.mockResponseOnce(JSON.stringify(data));
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
    };
    const client = new UnleashClient(config);
    client.start();
    client.on(EVENTS.READY, () => {
        const isEnabled = client.isEnabled('simpleToggle');
        client.stop();
        expect(isEnabled).toBe(true);
        done();
    });
});

test('Should publish error when initial init fails', (done) => {
    const givenError = 'Error';
    class Store implements IStorageProvider {
        public async save(): Promise<void> {
            return Promise.reject(givenError);
        }

        public async get(): Promise<any> {
            return Promise.reject(givenError);
        }
    }

    jest.spyOn(global.console, 'error').mockImplementation(() => jest.fn());
    fetchMock.mockResponseOnce(JSON.stringify(data));

    const storageProvider = new Store();
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        storageProvider,
    };
    const client = new UnleashClient(config);
    client.start();
    client.on(EVENTS.ERROR, (e: any) => {
        expect(e).toBe(givenError);
        done();
    });
});

test('Should publish error when fetch fails', (done) => {
    const givenError = new Error('Error');

    jest.spyOn(global.console, 'error').mockImplementation(() => jest.fn());
    fetchMock.mockReject(givenError);

    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
    };
    const client = new UnleashClient(config);
    client.start();
    client.on(EVENTS.ERROR, (e: any) => {
        expect(e).toBe(givenError);
        done();
    });
});

test.each([400, 401, 403, 404, 429, 500, 502, 503])('Should publish error when fetch receives a %d error', async (errorCode) => {
    expect.assertions(1);
    jest.spyOn(global.console, 'error').mockImplementation(() => jest.fn());
    fetchMock.mockResponseOnce("{}", { status: errorCode});

    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
    };
    const client = new UnleashClient(config);
    client.on(EVENTS.ERROR, (e: any) => {
        expect(e).toStrictEqual({ type: 'HttpError', code: errorCode});

    });
    await client.start();
})

test('Should publish update when state changes after refreshInterval', async () => {
    expect.assertions(1);
    fetchMock.mockResponses(
        [JSON.stringify(data), { status: 200 }],
        [JSON.stringify(data), { status: 200 }]
    );
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        refreshInterval: 1,
        appName: 'web',
    };
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

test(`If refresh is disabled should not fetch`, async () => {
    fetchMock.mockResponses(
        [JSON.stringify(data), { status: 200 }],
        [JSON.stringify(data), { status: 200 }]
    );
    const config: IConfig = {
        disableRefresh: true,
        url: 'http://localhost/test',
        clientKey: '12',
        refreshInterval: 1,
        appName: 'web',
    };
    const client = new UnleashClient(config);
    await client.start();
    jest.advanceTimersByTime(100000);
    expect(fetchMock.mock.calls.length).toEqual(1); // Never called again
});

test('Should include etag in second request', async () => {
    const etag = '123a';
    fetchMock.mockResponses(
        [JSON.stringify(data), { status: 200, headers: { ETag: etag } }],
        [JSON.stringify(data), { status: 304, headers: { ETag: etag } }]
    );
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        refreshInterval: 1,
        appName: 'web',
    };
    const client = new UnleashClient(config);

    await client.start();

    jest.advanceTimersByTime(1001);

    const firstRequest = getTypeSafeRequest(fetchMock, 0);
    const secondRequest = getTypeSafeRequest(fetchMock, 1);

    expect(firstRequest.headers).toMatchObject({
        'If-None-Match': '',
    });
    expect(secondRequest.headers).toMatchObject({
        'If-None-Match': etag,
    });
});

test('Should add clientKey as Authorization header', async () => {
    fetchMock.mockResponses(
        [JSON.stringify(data), { status: 200 }],
        [JSON.stringify(data), { status: 200 }]
    );
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: 'some123key',
        appName: 'web',
    };
    const client = new UnleashClient(config);
    await client.start();

    jest.advanceTimersByTime(1001);

    const request = getTypeSafeRequest(fetchMock);

    expect(request.headers).toMatchObject({
        Authorization: 'some123key',
    });
});

test('Should require appName', () => {
    expect(() => {
        new UnleashClient({
            url: 'http://localhost/test',
            clientKey: '12',
            appName: '',
        });
    }).toThrow();
});

test('Should require url', () => {
    expect(() => {
        new UnleashClient({ url: '', clientKey: '12', appName: 'web' });
    }).toThrow();
});

test('Should require valid url', () => {
    expect(() => {
        new UnleashClient({
            url: 'not-a-url',
            clientKey: '12',
            appName: 'web',
        });
    }).toThrow();
});

test('Should require valid clientKey', () => {
    expect(() => {
        new UnleashClient({
            url: 'http://localhost/test',
            clientKey: '',
            appName: 'web',
        });
    }).toThrow();
});

test('Should stop fetching when stop is called', async () => {
    fetchMock.mockResponses(
        [JSON.stringify(data), { status: 200 }],
        [JSON.stringify(data), { status: 200 }],
        [JSON.stringify(data), { status: 200 }]
    );
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        refreshInterval: 1,
        appName: 'web',
    };
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
        [JSON.stringify(data), { status: 304 }]
    );
    const context: IMutableContext = {
        userId: '123',
        sessionId: '456',
        remoteAddress: 'address',
        properties: {
            property1: 'property1',
            property2: 'property2',
        },
    };
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        environment: 'prod',
        context,
    };
    const client = new UnleashClient(config);

    await client.start();

    jest.advanceTimersByTime(1001);

    const url = new URL(getTypeSafeRequestUrl(fetchMock));

    expect(url.searchParams.get('userId')).toEqual('123');
    expect(url.searchParams.get('sessionId')).toEqual('456');
    expect(url.searchParams.get('remoteAddress')).toEqual('address');
    expect(url.searchParams.get('properties[property1]')).toEqual('property1');
    expect(url.searchParams.get('properties[property2]')).toEqual('property2');
    expect(url.searchParams.get('appName')).toEqual('web');
    expect(url.searchParams.get('environment')).toEqual('prod');
});

test('Should note include context fields with "null" value', async () => {
    fetchMock.mockResponses(
        [JSON.stringify(data), { status: 200 }],
        [JSON.stringify(data), { status: 304 }]
    );
    const context: IMutableContext = {
        userId: undefined,
        sessionId: '0',
        remoteAddress: undefined,
        properties: {
            property1: 'property1',
            property2: 'property2',
        },
    };
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        environment: 'prod',
        context,
    };
    const client = new UnleashClient(config);

    await client.start();

    jest.advanceTimersByTime(1001);

    const url = new URL(getTypeSafeRequestUrl(fetchMock));

    expect(url.searchParams.has('userId')).toBe(false);
    expect(url.searchParams.has('remoteAddress')).toBe(false);
    expect(url.searchParams.has('sessionId')).toBe(true);
    expect(url.searchParams.get('sessionId')).toBe('0');
});

test('Should update context fields on request', async () => {
    fetchMock.mockResponses(
        [JSON.stringify(data), { status: 200 }],
        [JSON.stringify(data), { status: 304 }]
    );
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        environment: 'prod',
    };
    const client = new UnleashClient(config);
    client.updateContext({
        userId: '123',
        sessionId: '456',
        remoteAddress: 'address',
        properties: {
            property1: 'property1',
            property2: 'property2',
        },
    });

    await client.start();

    jest.advanceTimersByTime(1001);

    const url = new URL(getTypeSafeRequestUrl(fetchMock));

    expect(url.searchParams.get('userId')).toEqual('123');
    expect(url.searchParams.get('sessionId')).toEqual('456');
    expect(url.searchParams.get('remoteAddress')).toEqual('address');
    expect(url.searchParams.get('properties[property1]')).toEqual('property1');
    expect(url.searchParams.get('properties[property2]')).toEqual('property2');
    expect(url.searchParams.get('appName')).toEqual('web');
    expect(url.searchParams.get('environment')).toEqual('prod');
});

test('Updating context should wait on asynchronous start', async () => {
    fetchMock.mockResponses(
        [JSON.stringify(data), { status: 200 }],
        [JSON.stringify(data), { status: 200 }]
    );
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        environment: 'prod',
    };
    const client = new UnleashClient(config);

    client.start();
    await client.updateContext({
        userId: '123'
    });

    expect(fetchMock).toBeCalledTimes(2);
});

test('Should not replace sessionId when updating context', async () => {
    fetchMock.mockResponses(
        [JSON.stringify(data), { status: 200 }],
        [JSON.stringify(data), { status: 304 }]
    );
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        environment: 'prod',
    };
    const client = new UnleashClient(config);
    await client.start();
    const context = client.getContext();
    await client.updateContext({
        userId: '123',
        remoteAddress: 'address',
        properties: {
            property1: 'property1',
            property2: 'property2',
        },
    });

    jest.advanceTimersByTime(1001);

    const url = new URL(getTypeSafeRequestUrl(fetchMock));

    expect(url.searchParams.get('sessionId')).toEqual(context.sessionId?.toString());
});

test('Should not add property fields when properties is an empty object', async () => {
    fetchMock.mockResponses(
        [JSON.stringify(data), { status: 200 }],
        [JSON.stringify(data), { status: 304 }]
    );
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        environment: 'prod',
        context: {
            properties: {},
        },
    };
    const client = new UnleashClient(config);

    await client.start();

    jest.advanceTimersByTime(1001);

    const url = new URL(getTypeSafeRequestUrl(fetchMock));

    // console.log(url.toString(), url.searchParams.toString(), url.searchParams.get('properties'));

    expect(url.searchParams.get('appName')).toEqual('web');
    expect(url.searchParams.get('environment')).toEqual('prod');
    expect(url.searchParams.get('properties')).toBeNull();
});

test('Should use default environment', async () => {
    fetchMock.mockResponses(
        [JSON.stringify(data), { status: 200 }],
        [JSON.stringify(data), { status: 200 }]
    );
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
    };
    const client = new UnleashClient(config);
    await client.start();

    jest.advanceTimersByTime(1001);

    const url = new URL(getTypeSafeRequestUrl(fetchMock));

    expect(url.searchParams.get('environment')).toEqual('default');
});

test('Should setContextField with userId', async () => {
    const userId = 'some-id-123';
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
    };
    const client = new UnleashClient(config);
    client.setContextField('userId', userId);
    const context = client.getContext();
    expect(context.userId).toBe(userId);
});

test('Should setContextField with sessionId', async () => {
    const sessionId = 'some-session-id-123';
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
    };
    const client = new UnleashClient(config);
    client.setContextField('sessionId', sessionId);
    const context = client.getContext();
    expect(context.sessionId).toBe(sessionId);
});

test('Should setContextField with remoteAddress', async () => {
    const remoteAddress = '10.0.0.1';
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
    };
    const client = new UnleashClient(config);
    client.setContextField('remoteAddress', remoteAddress);
    const context = client.getContext();
    expect(context.remoteAddress).toBe(remoteAddress);
});

test('Should setContextField with custom property', async () => {
    const clientId = 'some-client-id-443';
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
    };
    const client = new UnleashClient(config);
    client.setContextField('clientId', clientId);
    const context = client.getContext();
    expect(context.properties?.clientId).toBe(clientId);
});

test('Should setContextField with custom property and keep existing props', async () => {
    const clientId = 'some-client-id-443';
    const initialContext = { properties: { someField: '123' } };
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        context: initialContext,
    };
    const client = new UnleashClient(config);
    client.setContextField('clientId', clientId);
    const context = client.getContext();
    expect(context.properties?.clientId).toBe(clientId);
    expect(context.properties?.someField).toBe(
        initialContext.properties.someField
    );
});

test('Should override userId via setContextField', async () => {
    const userId = 'some-user-id-552';
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        context: { userId: 'old' },
    };
    const client = new UnleashClient(config);
    client.setContextField('userId', userId);
    const context = client.getContext();
    expect(context.userId).toBe(userId);
});

test('Initializing client twice should show a console warning', async () => {
    console.error = jest.fn();
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        context: { userId: 'old' },
    };
    const client = new UnleashClient(config);

    await client.start();
    await client.start();
    // Expect console.error to be called once before start runs.
    expect(console.error).toBeCalledTimes(2);
});

test('Should pass under custom header clientKey', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(data));

    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        headerName: 'NotAuthorization',
    };
    const client = new UnleashClient(config);

    client.on(EVENTS.UPDATE, () => {
        const request = getTypeSafeRequest(fetchMock, 0);

        expect(fetchMock.mock.calls.length).toEqual(1);
        expect(request.headers).toMatchObject({
            NotAuthorization: '12',
        });
        client.stop();
    });

    await client.start();

    jest.advanceTimersByTime(999);
});

test('Should emit impression events on isEnabled calls when impressionData is true', (done) => {
    const bootstrap = [
        {
            name: 'impression',
            enabled: true,
            variant: {
                name: 'disabled',
                enabled: false,
            },
            impressionData: true,
        },
    ];

    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        bootstrap,
    };
    const client = new UnleashClient(config);
    client.start();

    client.on(EVENTS.READY, () => {
        const isEnabled = client.isEnabled('impression');
        expect(isEnabled).toBe(true);
    });

    client.on(EVENTS.IMPRESSION, (event: any) => {
        expect(event.featureName).toBe('impression');
        expect(event.eventType).toBe('isEnabled');
        client.stop();
        done();
    });
});

test('Should pass custom headers', async () => {
    fetchMock.mockResponses(
        [JSON.stringify(data), { status: 200 }],
        [JSON.stringify(data), { status: 200 }]
    );
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: 'extrakey',
        appName: 'web',
        customHeaders: {
            customheader1: 'header1val',
            customheader2: 'header2val',
        },
    };
    const client = new UnleashClient(config);
    await client.start();

    jest.advanceTimersByTime(1001);

    const request = getTypeSafeRequest(fetchMock);

    expect(request.headers).toMatchObject({
        customheader2: 'header2val',
    });
});

test('Should emit impression events on getVariant calls when impressionData is true', (done) => {
    const bootstrap = [
        {
            name: 'impression-variant',
            enabled: true,
            variant: {
                name: 'disabled',
                enabled: false,
            },
            impressionData: true,
        },
    ];

    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        bootstrap,
    };
    const client = new UnleashClient(config);
    client.start();

    client.on(EVENTS.READY, () => {
        const isEnabled = client.getVariant('impression-variant');
        expect(isEnabled).toBe(true);
    });

    client.on(EVENTS.IMPRESSION, (event: any) => {
        expect(event.featureName).toBe('impression-variant');
        expect(event.eventType).toBe('getVariant');
        expect(event.impressionData).toBe(true);
        client.stop();
        done();
    });
});

test('Should not emit impression events on isEnabled calls when impressionData is false', (done) => {
    const bootstrap = [
        {
            name: 'impression',
            enabled: true,
            variant: {
                name: 'disabled',
                enabled: false,
            },
            impressionData: false,
        },
    ];

    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        bootstrap,
    };
    const client = new UnleashClient(config);
    client.start();

    client.on(EVENTS.READY, () => {
        const isEnabled = client.isEnabled('impression');
        expect(isEnabled).toBe(true);
        client.stop();
        done();
    });

    client.on(EVENTS.IMPRESSION, () => {
        client.stop();
        fail('SDK should not emit impression event');
    });
});

test('Should emit impression events on isEnabled calls when impressionData is false and impressionDataAll is true', (done) => {
    const bootstrap = [
        {
            name: 'impression',
            enabled: true,
            variant: {
                name: 'disabled',
                enabled: false,
            },
            impressionData: false,
        },
    ];

    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        bootstrap,
        impressionDataAll: true,
    };
    const client = new UnleashClient(config);
    client.start();

    client.on(EVENTS.READY, () => {
        const isEnabled = client.isEnabled('impression');
        expect(isEnabled).toBe(true);
    });

    client.on(EVENTS.IMPRESSION, (event: any) => {
        try {
            expect(event.featureName).toBe('impression');
            expect(event.eventType).toBe('isEnabled');
            expect(event.impressionData).toBe(false);
            client.stop();
            done();
        } catch (e) {
            client.stop();
            done(e);
        }
    });
});

test('Should emit impression events on isEnabled calls when toggle is unknown and impressionDataAll is true', (done) => {
    const bootstrap = [
        {
            name: 'impression',
            enabled: true,
            variant: {
                name: 'disabled',
                enabled: false,
            },
            impressionData: false,
        },
    ];

    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        bootstrap,
        impressionDataAll: true,
    };
    const client = new UnleashClient(config);
    client.start();

    client.on(EVENTS.READY, () => {
        const isEnabled = client.isEnabled('unknown');
        expect(isEnabled).toBe(true);
    });

    client.on(EVENTS.IMPRESSION, (event: any) => {
        expect(event.featureName).toBe('unknown');
        expect(event.eventType).toBe('isEnabled');
        expect(event.enabled).toBe(false);
        expect(event.impressionData).toBe(undefined);
        client.stop();
        done();
    });
});

test('Should emit impression events on getVariant calls when impressionData is false and impressionDataAll is true', (done) => {
    const bootstrap = [
        {
            name: 'impression-variant',
            enabled: true,
            variant: {
                name: 'disabled',
                enabled: false,
            },
            impressionData: false,
        },
    ];

    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        bootstrap,
        impressionDataAll: true,
    };
    const client = new UnleashClient(config);
    client.start();

    client.on(EVENTS.READY, () => {
        const isEnabled = client.getVariant('impression-variant');
        expect(isEnabled).toBe(true);
    });

    client.on(EVENTS.IMPRESSION, (event: any) => {
        try {
            expect(event.featureName).toBe('impression-variant');
            expect(event.eventType).toBe('getVariant');
            expect(event.impressionData).toBe(false);
            client.stop();
            done();
        } catch (e) {
            client.stop();
            done(e);
        }
    });
});

test('Should publish ready only when the first fetch was successful', async () => {
    fetchMock.mockResponse(JSON.stringify(data));
    const config: IConfig = {
        url: 'http://localhost/test',
        clientKey: '12',
        appName: 'web',
        refreshInterval: 1,
    };
    const client = new UnleashClient(config);
    await client.start();

    let readyCount = 0;

    client.on(EVENTS.READY, () => {
        const isEnabled = client.isEnabled('simpleToggle');
        expect(isEnabled).toBe(true);
        readyCount++;
        client.stop();
        expect(readyCount).toEqual(1);
    });

    jest.advanceTimersByTime(1001);
    jest.advanceTimersByTime(1001);

    expect(fetchMock).toHaveBeenCalledTimes(3);
});

test('Should be able to configure UnleashClient with a URL instance', () => {
    const url = new URL('test', 'http://localhost');
    const config: IConfig = {
        url,
        clientKey: '12',
        appName: 'web',
    };
    const client = new UnleashClient(config);
    expect(client).toHaveProperty('url', url);
});
