export const urlFormatter = (path: string, url: URL): URL => {
    return new URL(`${url.pathname}/${path}`, url.toString());
};
