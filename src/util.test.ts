import { urlWithContextAsQuery } from './util';

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
