import type { IContext } from '.';
import {
    computeContextHashValue,
    contextString,
    urlWithContextAsQuery,
    parseHeaders,
} from './util';

test('should not add paramters to URL', async () => {
    const someUrl = new URL('https://test.com');

    //@ts-expect-error on purpose for testing!
    const result = urlWithContextAsQuery(someUrl, {});

    expect(result.toString()).toBe('https://test.com/');
});

test('should add context as query params', async () => {
    const someUrl = new URL('https://test.com');

    const result = urlWithContextAsQuery(someUrl, {
        appName: 'test',
        userId: '1234A',
    });

    expect(result.toString()).toBe(
        'https://test.com/?appName=test&userId=1234A'
    );
});

test('should add context properties as query params', async () => {
    const someUrl = new URL('https://test.com');

    const result = urlWithContextAsQuery(someUrl, {
        appName: 'test',
        userId: '1234A',
        properties: { custom1: 'test', custom2: 'test2' },
    });

    expect(result.toString()).toBe(
        'https://test.com/?appName=test&userId=1234A&properties%5Bcustom1%5D=test&properties%5Bcustom2%5D=test2'
    );
});

test('should exclude context properties that are null or undefined', async () => {
    const someUrl = new URL('https://test.com');

    const result = urlWithContextAsQuery(someUrl, {
        appName: 'test',
        userId: undefined,
        properties: {
            custom1: 'test',
            custom2: 'test2',
            //@ts-expect-error this shouldn't be allowed if you're using TS, but
            //you could probably force it
            custom3: null,
            //@ts-expect-error same as the null property above
            custom4: undefined,
        },
    });

    expect(result.toString()).toBe(
        'https://test.com/?appName=test&properties%5Bcustom1%5D=test&properties%5Bcustom2%5D=test2'
    );
});

describe('contextString', () => {
    test('Should return value for a simple object', () => {
        const obj: IContext = {
            appName: '1',
            currentTime: '2',
            environment: '3',
            userId: '4',
        };
        const hashValue = contextString(obj);
        expect(hashValue).toBe(
            '[[["appName","1"],["currentTime","2"],["environment","3"],["userId","4"]],[]]'
        );
    });

    test('Should sort an object with not sorted keys', () => {
        const obj: IContext = {
            userId: '4',
            appName: '1',
            environment: '3',
            currentTime: '2024-08-05T11:00:00.000Z',
        };
        const hashValue = contextString(obj);
        expect(hashValue).toBe(
            '[[["appName","1"],["currentTime","2024-08-05T11:00:00.000Z"],["environment","3"],["userId","4"]],[]]'
        );
    });

    test('Should sort an object with not sorted properties', () => {
        const obj: IContext = {
            appName: '1',
            properties: { d: '4', c: '3' },
            currentTime: '2',
        };
        const hashValue = contextString(obj);
        expect(hashValue).toBe(
            '[[["appName","1"],["currentTime","2"]],[["c","3"],["d","4"]]]'
        );
    });
});

describe('computeContextHashValue', () => {
    test('Should return SHA-256 representation', async () => {
        const obj: IContext = {
            appName: '1',
            currentTime: '2',
            environment: '3',
            userId: '4',
        };

        expect(computeContextHashValue(obj)).resolves.toBe(
            // FIXME: Jest (JSDOM) doesn't have TextEncoder nor crypto.subtle
            '[[["appName","1"],["currentTime","2"],["environment","3"],["userId","4"]],[]]'
            // '70cff0d989f07f1bd8f29599b3d8d55d511a8a0718d02c6bc78894512e78d571'
        );
    });
});

describe('parseHeaders', () => {
    const clientKey = 'test-client-key';
    const appName = 'appName';
    const connectionId = '1234-5678';

    test('should set basic headers correctly', () => {
        const result = parseHeaders({
            clientKey,
            appName,
            connectionId,
        });

        expect(result).toEqual({
            authorization: clientKey,
            'unleash-sdk': 'unleash-client-js:__VERSION__',
            'unleash-appname': appName,
            accept: 'application/json',
            'unleash-connection-id': connectionId,
        });
    });

    test('should set custom client key header name', () => {
        const result = parseHeaders({
            clientKey,
            appName,
            connectionId,
            headerName: 'auth',
        });

        expect(result).toMatchObject({ auth: clientKey });
        expect(Object.keys(result)).not.toContain('authorization');
    });

    test('should add custom headers', () => {
        const customHeaders = {
            'custom-header': 'custom-value',
            'unleash-connection-id': 'should-not-be-overwritten',
            'unleash-appname': 'new-app-name',
        };
        const result = parseHeaders({
            clientKey,
            appName,
            connectionId,
            customHeaders,
        });

        expect(Object.keys(result)).toHaveLength(6);
        expect(result).toMatchObject({
            'custom-header': 'custom-value',
            'unleash-connection-id': connectionId,
            'unleash-appname': 'new-app-name',
        });
    });

    test('should include etag if provided', () => {
        const etag = '12345';
        const result = parseHeaders({
            clientKey,
            appName,
            connectionId,
            etag,
        });

        expect(result['if-none-match']).toBe(etag);
    });

    test('should handle custom headers in a case-insensitive way and normalize them', () => {
        const customHeaders = {
            'custom-HEADER': 'custom-value-1',
            'Custom-Header': 'custom-value-2',
        };
        const result = parseHeaders({
            clientKey,
            appName,
            connectionId,
            customHeaders,
        });

        expect(result).toMatchObject({
            'custom-header': 'custom-value-2',
        });
    });

    test('should ignore null or undefined custom headers', () => {
        const customHeaders = {
            header1: 'value1',
            header2: null as any,
            header3: undefined as any,
        };
        const result = parseHeaders({
            clientKey,
            appName,
            connectionId,
            customHeaders,
        });

        expect(result).toEqual(
            expect.not.objectContaining({
                header2: expect.anything(),
                header3: expect.anything(),
            })
        );
    });

    test('should include content-type for POST requests', () => {
        const result = parseHeaders({
            clientKey,
            appName,
            connectionId,
            isPost: true,
        });

        expect(result['content-type']).toBe('application/json');
    });
});
