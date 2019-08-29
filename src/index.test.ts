import { FetchMock } from 'jest-fetch-mock';
import * as data from '../tests/example-data.json'; 
import { IConfig, UnleashClient } from './index';


jest.useFakeTimers();

const fetchMock = fetch as FetchMock;

afterEach(() => {
    fetchMock.resetMocks();
});

test('Can inititalize unleash-client', () => {
    const config: IConfig = { url: 'http://localhost/test', clientKey: '12', refreshInterval: 10 };
    const client = new UnleashClient(config, {});
    expect(config.url).toBe('http://localhost/test');
});

test('Will perform an inital fetch', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(data));
    const config: IConfig = { url: 'http://localhost/test', clientKey: '12', refreshInterval: 10 };
    const client = new UnleashClient(config, {});
    await client.start();
    const isEnabled = client.isEnabled('simpleToggle');
    expect(isEnabled).toBe(true);
});

test('Will have correct variant', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(data));
    const config: IConfig = { url: 'http://localhost/test', clientKey: '12', refreshInterval: 10 };
    const client = new UnleashClient(config, {});
    await client.start();
    const variant = client.getVariant('variantToggle');
    expect(variant.name).toBe('green');
});

/*

Test cases:
1. 
 - calles correct url
 - correct headers set
2. Does fetch at given intervels
3. stops fetching on "stop" (fetch, inteval, stop => boost time => no new calls)
4. invalid data does not brak stuff. (validate response)
5. sends context data and they are correct
6. updates context data and they are sent 

*/