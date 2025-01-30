import { IContext } from '.';
import { sdkVersion } from './version';

export const notNullOrUndefined = ([, value]: [string, string]) =>
    value !== undefined && value !== null;

export const urlWithContextAsQuery = (url: URL, context: IContext) => {
    const urlWithQuery = new URL(url.toString());
    // Add context information to url search params. If the properties
    // object is included in the context, flatten it into the search params
    // e.g. /?...&property.param1=param1Value&property.param2=param2Value
    Object.entries(context)
        .filter(notNullOrUndefined)
        .forEach(([contextKey, contextValue]) => {
            if (contextKey === 'properties' && contextValue) {
                Object.entries<string>(contextValue)
                    .filter(notNullOrUndefined)
                    .forEach(([propertyKey, propertyValue]) =>
                        urlWithQuery.searchParams.append(
                            `properties[${propertyKey}]`,
                            propertyValue
                        )
                    );
            } else {
                urlWithQuery.searchParams.append(contextKey, contextValue);
            }
        });
    return urlWithQuery;
};

export const contextString = (context: IContext): string => {
    const { properties = {}, ...fields } = context;

    const sortEntries = (record: Record<string, string>) =>
        Object.entries(record).sort(([a], [b]) =>
            a.localeCompare(b, undefined)
        );

    return JSON.stringify([sortEntries(fields), sortEntries(properties)]);
};

const sha256 = async (input: string): Promise<string> => {
    const cryptoSubtle =
        typeof globalThis !== 'undefined' && globalThis.crypto?.subtle
            ? globalThis.crypto?.subtle
            : undefined;

    if (
        typeof TextEncoder === 'undefined' ||
        !cryptoSubtle?.digest ||
        typeof Uint8Array === 'undefined'
    ) {
        throw new Error('Hashing function not available');
    }

    const msgUint8 = new TextEncoder().encode(input);
    const hashBuffer = await cryptoSubtle.digest('SHA-256', msgUint8);
    const hexString = Array.from(new Uint8Array(hashBuffer))
        .map((x) => x.toString(16).padStart(2, '0'))
        .join('');
    return hexString;
};

export const computeContextHashValue = async (obj: IContext) => {
    const value = contextString(obj);

    try {
        const hash = await sha256(value);
        return hash;
    } catch {
        return value;
    }
};

export const parseHeaders = ({
    clientKey,
    appName,
    connectionId,
    customHeaders,
    headerName = 'authorization',
    etag,
    isPost,
}: {
    clientKey: string;
    connectionId: string;
    appName: string;
    customHeaders?: Record<string, string>;
    headerName?: string;
    etag?: string;
    isPost?: boolean;
}): Record<string, string> => {
    const headers: Record<string, string> = {
        'accept': 'application/json',
        [headerName.toLocaleLowerCase()]: clientKey,
        'unleash-sdk': sdkVersion,
        'unleash-appname': appName,
    };

    if (isPost) {
        headers['content-type'] = 'application/json';
    }

    if (etag) {
        headers['if-none-match'] = etag;
    }

    Object.entries(customHeaders || {})
        .filter(notNullOrUndefined)
        .forEach(
            ([name, value]) => (headers[name.toLocaleLowerCase()] = value)
        );

    headers['unleash-connection-id'] = connectionId;

    return headers;
};
