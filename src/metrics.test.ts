import { FetchMock } from 'jest-fetch-mock';
import Metrics from './metrics';

jest.useFakeTimers();

const fetchMock = fetch as FetchMock;

afterEach(() => {
    fetchMock.resetMocks();
    jest.clearAllTimers();
});

test('should be disabled by flag disableMetrics', async () => {
    const metrics = new Metrics({
        appName: 'test',
        metricsInterval: 0,
        disableMetrics: true,
        url: 'http://localhost:3000',
        clientKey: '123',
    });

    metrics.count('foo', true);

    await metrics.sendMetrics();

    expect(fetchMock.mock.calls.length).toEqual(0);
});

test('should send metrics', async () => {
    const metrics = new Metrics({
        appName: 'test',
        metricsInterval: 0,
        disableMetrics: false,
        url: 'http://localhost:3000',
        clientKey: '123',
    });

    metrics.count('foo', true);
    metrics.count('foo', true);
    metrics.count('foo', false);
    metrics.count('bar', false);

    await metrics.sendMetrics();

    expect(fetchMock.mock.calls.length).toEqual(1);
    const content = JSON.parse(fetchMock.mock.calls[0][1].body);

    expect(content.bucket.toggles.foo.yes).toEqual(2);
    expect(content.bucket.toggles.foo.no).toEqual(1);
    expect(content.bucket.toggles.bar.yes).toEqual(0);
    expect(content.bucket.toggles.bar.no).toEqual(1);
});
