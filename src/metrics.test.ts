import { FetchMock } from 'jest-fetch-mock';
import Metrics from './metrics';
import { getTypeSafeRequest, parseRequestBodyWithType } from './test';

jest.useFakeTimers();

const fetchMock = fetch as FetchMock;

afterEach(() => {
    fetchMock.resetMocks();
    jest.clearAllTimers();
});

test('should be disabled by flag disableMetrics', async () => {
    const metrics = new Metrics({
        onError: console.error,
        appName: 'test',
        metricsInterval: 0,
        disableMetrics: true,
        url: 'http://localhost:3000',
        clientKey: '123',
        fetch: fetchMock,
        headerName: 'Authorization',
    });

    metrics.count('foo', true);

    await metrics.sendMetrics();

    expect(fetchMock.mock.calls.length).toEqual(0);
});

test('should send metrics', async () => {
    const metrics = new Metrics({
        onError: console.error,
        appName: 'test',
        metricsInterval: 0,
        disableMetrics: false,
        url: 'http://localhost:3000',
        clientKey: '123',
        fetch: fetchMock,
        headerName: 'Authorization',
    });

    metrics.count('foo', true);
    metrics.count('foo', true);
    metrics.count('foo', false);
    metrics.count('bar', false);

    await metrics.sendMetrics();

    expect(fetchMock.mock.calls.length).toEqual(1);

    /** Parse request and get its body with casted type */
    const request = getTypeSafeRequest(fetchMock);
    const body =
        parseRequestBodyWithType<{ bucket: Metrics['bucket'] }>(request);

    expect(body.bucket.toggles.foo.yes).toEqual(2);
    expect(body.bucket.toggles.foo.no).toEqual(1);
    expect(body.bucket.toggles.bar.yes).toEqual(0);
    expect(body.bucket.toggles.bar.no).toEqual(1);
});

test('should send metrics under custom header', async () => {
    const metrics = new Metrics({
        onError: console.error,
        appName: 'test',
        metricsInterval: 0,
        disableMetrics: false,
        url: 'http://localhost:3000',
        clientKey: '123',
        fetch: fetchMock,
        headerName: 'NotAuthorization',
    });

    metrics.count('foo', true);
    await metrics.sendMetrics();

    const requestBody = getTypeSafeRequest(fetchMock);

    expect(fetchMock.mock.calls.length).toEqual(1);
    expect(requestBody.headers).toMatchObject({
        NotAuthorization: '123',
    });
});

test('Should send initial metrics after 2 seconds', () => {
    const metrics = new Metrics({
        onError: console.error,
        appName: 'test',
        metricsInterval: 5,
        disableMetrics: false,
        url: 'http://localhost:3000',
        clientKey: '123',
        fetch: fetchMock,
        headerName: 'Authorization',
    });

    metrics.start();

    metrics.count('foo', true);
    metrics.count('foo', true);
    metrics.count('foo', false);
    metrics.count('bar', false);
    // Account for 2 second timeout before the set interval starts
    jest.advanceTimersByTime(2000);
    expect(fetchMock.mock.calls.length).toEqual(1);
});

test('should send metrics based on timer interval', async () => {
    const metrics = new Metrics({
        onError: console.error,
        appName: 'test',
        metricsInterval: 5,
        disableMetrics: false,
        url: new URL('http://localhost:3000'),
        clientKey: '123',
        fetch: fetchMock,
        headerName: 'Authorization',
    });

    metrics.start();

    metrics.count('foo', true);
    metrics.count('foo', true);
    metrics.count('foo', false);
    metrics.count('bar', false);
    // Account for 2 second timeout before the set interval starts
    jest.advanceTimersByTime(2000);

    metrics.count('foo', true);
    metrics.count('foo', true);
    metrics.count('foo', false);
    metrics.count('bar', false);
    // Fill bucket and advance the interval
    jest.advanceTimersByTime(5000);

    metrics.count('foo', true);
    metrics.count('foo', true);
    metrics.count('foo', false);
    metrics.count('bar', false);
    // Fill bucket and advance the interval
    jest.advanceTimersByTime(5000);

    expect(fetchMock.mock.calls.length).toEqual(3);
});
