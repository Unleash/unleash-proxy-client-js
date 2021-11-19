import { urlFormatter } from "./url-formatter";

test("Should format url correctly with one subpath", () => {
    const url = new URL("http://localhost:4242/proxy");
    const result = urlFormatter("events", url);

    expect(result).toEqual(url.toString() + "/events");
});

test("Should format url correctly with trailing slash", () => {
    const url = new URL("http://localhost:4242/proxy/");
    const result = urlFormatter("events", url);

    expect(result).toEqual(url.toString() + "/events");
});

test("Should format url correctly", () => {
    const url = new URL("http://localhost:4242/api/proxy");
    const result = urlFormatter("events", url);

    expect(result).toEqual(url.toString() + "/events");
});

test("Should format url correctly with multiple nested paths", () => {
    const url = new URL("http://localhost:4242/api/test/123/423/proxy");
    const result = urlFormatter("events", url);

    expect(result).toEqual(url.toString() + "/events");
});
