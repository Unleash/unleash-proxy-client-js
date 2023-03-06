import type { FetchMock } from 'jest-fetch-mock';

/**
 * Extract request body from given `FetchMock` object.
 * @param fetchedMock - mocked fetch body to get the request body from
 * @param callIndex - index of call in given `fetcheMock`
 */
function getTypeSafeRequest(
  fetchedMock: FetchMock,
  callIndex: number | undefined = 0
): RequestInit {
  const mockedCall = fetchedMock.mock.calls[callIndex];
  const [, mockedReq] = mockedCall;
  const typeSafeRequest = mockedReq ?? {};

  return typeSafeRequest;
}

/**
 * Extract request url from given `FetchMock` object.
 * @param fetchedMock - mocked fetch body to get the request url from
 * @param callIndex - index of call in given `fetcheMock`
 */
function getTypeSafeRequestUrl(
  fetchedMock: FetchMock,
  callIndex: number | undefined = 0
): string {
  const mockedCall = fetchedMock.mock.calls[callIndex];
  const [url] = mockedCall;

  return url as string;
}

/**
 * parses given `RequestInit` with `JSON.parse()` and return
 * its body with passed type.
 */
function parseRequestBodyWithType<T>(requestBody: RequestInit): T {
  const body = JSON.parse(`${requestBody.body}`) as T;

  return body;
}

export { getTypeSafeRequest, getTypeSafeRequestUrl, parseRequestBodyWithType };
