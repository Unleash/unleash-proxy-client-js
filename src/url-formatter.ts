export const urlFormatter = (path: string, url: URL) => {
    return new URL(`${url.pathname}/${path}`, url.toString()).toString();
};
