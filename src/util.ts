import { IContext } from '.';

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

const sortObjectProperties = (
    obj: Record<string, unknown>
): Record<string, unknown> => {
    const sortedKeys = Object.keys(obj).sort();
    const sortedObj: Record<string, unknown> = {};
    sortedKeys.forEach((key) => {
        if (obj[key] !== null && typeof obj[key] === 'object') {
            sortedObj[key] = sortObjectProperties(
                obj[key] as Record<string, unknown>
            );
        } else {
            sortedObj[key] = obj[key];
        }
    });

    return sortedObj;
};

export const computeContextHashValue = (obj: IContext) =>
    JSON.stringify(
        sortObjectProperties(obj as unknown as Record<string, unknown>)
    );
