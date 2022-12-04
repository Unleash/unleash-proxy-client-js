import {urlWithContextAsQuery} from './util';

test('should not add paramters to URL', async () => {
    const someUrl = new URL("https://test.com");

    //@ts-ignore on purpose for testing!
    const result = urlWithContextAsQuery(someUrl, {});

    expect(result.toString()).toBe('https://test.com/');
});


test('should not add context as query params', async () => {
    const someUrl = new URL("https://test.com");

    const result = urlWithContextAsQuery(someUrl, {appName: 'test', userId: '1234A'});

    expect(result.toString()).toBe('https://test.com/?appName=test&userId=1234A');
});


test('should not add context properties as query params', async () => {
    const someUrl = new URL("https://test.com");

    const result = urlWithContextAsQuery(someUrl, {appName: 'test', userId: '1234A', properties: { custom1: 'test', custom2: "test2"}});

    expect(result.toString()).toBe('https://test.com/?appName=test&userId=1234A&properties%5Bcustom1%5D=test&properties%5Bcustom2%5D=test2');
});