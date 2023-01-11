import { TinyEmitter } from 'tiny-emitter';
import Metrics from './metrics';
import type IStorageProvider from './storage-provider';
import InMemoryStorageProvider from './storage-provider-inmemory';
import LocalStorageProvider from './storage-provider-local';
import EventsHandler from './events-handler';
import { notNullOrUndefined, urlWithContextAsQuery } from './util';

const DEFINED_FIELDS = ['userId', 'sessionId', 'remoteAddress'];

interface IStaticContext {
    appName: string;
    environment?: string;
}

interface IMutableContext {
    userId?: string;
    sessionId?: string;
    remoteAddress?: string;
    properties?: {
        [key: string]: string;
    };
}

type IContext = IStaticContext & IMutableContext;

interface IConfig extends IStaticContext {
    url: URL | string;
    clientKey: string;
    disableRefresh?: boolean;
    refreshInterval?: number;
    metricsInterval?: number;
    disableMetrics?: boolean;
    storageProvider?: IStorageProvider;
    context?: IMutableContext;
    fetch?: any;
    bootstrap?: IToggle[];
    bootstrapOverride?: boolean;
    headerName?: string;
    customHeaders?: Record<string, string>;
    impressionDataAll?: boolean;
    usePOSTrequests?: boolean;
}

interface IVariant {
    name: string;
    enabled: boolean;
    payload?: {
        type: string;
        value: string;
    };
}

interface IToggle {
    name: string;
    enabled: boolean;
    variant: IVariant;
    impressionData: boolean;
}

export const EVENTS = {
    INIT: 'initialized',
    ERROR: 'error',
    READY: 'ready',
    UPDATE: 'update',
    IMPRESSION: 'impression',
};

const IMPRESSION_EVENTS = {
    IS_ENABLED: 'isEnabled',
    GET_VARIANT: 'getVariant',
};

const defaultVariant: IVariant = { name: 'disabled', enabled: false };
const storeKey = 'repo';

export const resolveFetch = () => {
    try {
        if (typeof window !== 'undefined' && 'fetch' in window) {
            return fetch.bind(window);
        } else if ('fetch' in globalThis) {
            return fetch.bind(globalThis);
        }
    } catch (e) {
        console.error('Unleash failed to resolve "fetch"', e);
    }

    return undefined;
};

export class UnleashClient extends TinyEmitter {
    private toggles: IToggle[] = [];
    private impressionDataAll: boolean;
    private context: IContext;
    private timerRef?: any;
    private storage: IStorageProvider;
    private refreshInterval: number;
    private url: URL;
    private clientKey: string;
    private etag = '';
    private metrics: Metrics;
    private ready: Promise<void>;
    private fetch: any;
    private bootstrap?: IToggle[];
    private bootstrapOverride: boolean;
    private headerName: string;
    private eventsHandler: EventsHandler;
    private customHeaders: Record<string, string>;
    private readyEventEmitted = false;
    private usePOSTrequests = false;

    constructor({
        storageProvider,
        url,
        clientKey,
        disableRefresh = false,
        refreshInterval = 30,
        metricsInterval = 30,
        disableMetrics = false,
        appName,
        environment = 'default',
        context,
        fetch = resolveFetch(),
        bootstrap,
        bootstrapOverride = true,
        headerName = 'Authorization',
        customHeaders = {},
        impressionDataAll = false,
        usePOSTrequests = false,
    }: IConfig) {
        super();
        // Validations
        if (!url) {
            throw new Error('url is required');
        }
        if (!clientKey) {
            throw new Error('clientKey is required');
        }
        if (!appName) {
            throw new Error('appName is required.');
        }
        this.eventsHandler = new EventsHandler();
        this.impressionDataAll = impressionDataAll;
        this.toggles = bootstrap && bootstrap.length > 0 ? bootstrap : [];
        this.url = url instanceof URL ? url : new URL(url);
        this.clientKey = clientKey;
        this.headerName = headerName;
        this.customHeaders = customHeaders;
        this.storage =
            storageProvider ||
            (typeof window !== 'undefined'
                ? new LocalStorageProvider()
                : new InMemoryStorageProvider());
        this.refreshInterval = disableRefresh ? 0 : refreshInterval * 1000;
        this.context = { appName, environment, ...context };
        this.usePOSTrequests = usePOSTrequests;
        this.ready = new Promise((resolve) => {
            this.init()
                .then(resolve)
                .catch((error) => {
                    console.error(error);
                    this.emit(EVENTS.ERROR, error);
                    resolve();
                });
        });

        if (!fetch) {
            console.error(
                'Unleash: You must either provide your own "fetch" implementation or run in an environment where "fetch" is available.'
            );
        }

        this.fetch = fetch;
        this.bootstrap =
            bootstrap && bootstrap.length > 0 ? bootstrap : undefined;
        this.bootstrapOverride = bootstrapOverride;

        this.metrics = new Metrics({
            onError: this.emit.bind(this, EVENTS.ERROR),
            appName,
            metricsInterval,
            disableMetrics,
            url: this.url,
            clientKey,
            fetch,
            headerName,
        });
    }

    public getAllToggles(): IToggle[] {
        return [...this.toggles];
    }

    public isEnabled(toggleName: string): boolean {
        const toggle = this.toggles.find((t) => t.name === toggleName);
        const enabled = toggle ? toggle.enabled : false;
        this.metrics.count(toggleName, enabled);

        if (toggle?.impressionData || this.impressionDataAll) {
            const event = this.eventsHandler.createImpressionEvent(
                this.context,
                enabled,
                toggleName,
                IMPRESSION_EVENTS.IS_ENABLED,
                toggle?.impressionData ?? undefined
            );
            this.emit(EVENTS.IMPRESSION, event);
        }

        return enabled;
    }

    public getVariant(toggleName: string): IVariant {
        const toggle = this.toggles.find((t) => t.name === toggleName);
        const enabled = toggle?.enabled || false;
        const variant = toggle ? toggle.variant : defaultVariant;

        this.metrics.count(toggleName, enabled);
        if (toggle?.impressionData || this.impressionDataAll) {
            const event = this.eventsHandler.createImpressionEvent(
                this.context,
                enabled,
                toggleName,
                IMPRESSION_EVENTS.GET_VARIANT,
                toggle?.impressionData ?? undefined,
                variant.name
            );
            this.emit(EVENTS.IMPRESSION, event);
        }
        return variant;
    }

    public async updateContext(context: IMutableContext): Promise<void> {
        // @ts-expect-error Give the user a nicer error message when
        // including static fields in the mutable context object
        if (context.appName || context.environment) {
            console.warn(
                "appName and environment are static. They can't be updated with updateContext."
            );
        }
        const staticContext = {
            environment: this.context.environment,
            appName: this.context.appName,
            sessionId: this.context.sessionId,
        };
        this.context = { ...staticContext, ...context };

        if (this.timerRef) {
            await this.fetchToggles();
        } else {
            await new Promise<void>((resolve) => {
                const listener = () => {
                    this.fetchToggles().then(() => {
                        this.off(EVENTS.READY, listener);
                        resolve();
                    });
                };
                this.once(EVENTS.READY, listener);
            });
        }
    }

    public getContext() {
        return { ...this.context };
    }

    public setContextField(field: string, value: string) {
        if (DEFINED_FIELDS.includes(field)) {
            this.context = { ...this.context, [field]: value };
        } else {
            const properties = { ...this.context.properties, [field]: value };
            this.context = { ...this.context, properties };
        }
        if (this.timerRef) {
            this.fetchToggles();
        }
    }

    private async init(): Promise<void> {
        const sessionId = await this.resolveSessionId();
        this.context = { sessionId, ...this.context };

        this.toggles = (await this.storage.get(storeKey)) || [];

        if (
            this.bootstrap &&
            (this.bootstrapOverride || this.toggles.length === 0)
        ) {
            await this.storage.save(storeKey, this.bootstrap);
            this.toggles = this.bootstrap;
            this.emit(EVENTS.READY);
        }
        this.emit(EVENTS.INIT);
    }

    public async start(): Promise<void> {
        if (this.timerRef) {
            console.error(
                'Unleash SDK has already started, if you want to restart the SDK you should call client.stop() before starting again.'
            );
            return;
        }
        await this.ready;
        this.metrics.start();
        const interval = this.refreshInterval;

        await this.fetchToggles();

        if (interval > 0) {
            this.timerRef = setInterval(() => this.fetchToggles(), interval);
        }
    }

    public stop(): void {
        if (this.timerRef) {
            clearInterval(this.timerRef);
            this.timerRef = undefined;
        }
        this.metrics.stop();
    }

    private async resolveSessionId(): Promise<string> {
        if (this.context.sessionId) {
            return this.context.sessionId;
        } else {
            let sessionId = await this.storage.get('sessionId');
            if (!sessionId) {
                sessionId = Math.floor(Math.random() * 1_000_000_000);
                await this.storage.save('sessionId', sessionId);
            }
            return sessionId;
        }
    }

    private getHeaders() {
        const headers = {
            [this.headerName]: this.clientKey,
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'If-None-Match': this.etag,
        };
        Object.entries(this.customHeaders)
            .filter(notNullOrUndefined)
            .forEach(([name, value]) => (headers[name] = value));
        return headers;
    }

    private async storeToggles(toggles: IToggle[]): Promise<void> {
        this.toggles = toggles;
        this.emit(EVENTS.UPDATE);
        await this.storage.save(storeKey, toggles);
    }

    private async fetchToggles() {
        if (this.fetch) {
            try {
                const isPOST = this.usePOSTrequests;

                const url = isPOST
                    ? this.url
                    : urlWithContextAsQuery(this.url, this.context);
                const method = isPOST ? 'POST' : 'GET';
                const body = isPOST
                    ? JSON.stringify({ context: this.context })
                    : undefined;

                const response = await this.fetch(url.toString(), {
                    method,
                    cache: 'no-cache',
                    headers: this.getHeaders(),
                    body,
                });
                if (response.ok && response.status !== 304) {
                    this.etag = response.headers.get('ETag') || '';
                    const data = await response.json();
                    await this.storeToggles(data.toggles);

                    if (!this.bootstrap && !this.readyEventEmitted) {
                        this.emit(EVENTS.READY);
                        this.readyEventEmitted = true;
                    }
                } else if (!response.ok && response.status !== 304) {
                    console.error(
                        'Unleash: Fetching feature toggles did not have an ok response'
                    );
                    this.emit(EVENTS.ERROR, {
                        type: 'HttpError',
                        code: response.status,
                    });
                }
            } catch (e) {
                console.error('Unleash: unable to fetch feature toggles', e);
                this.emit(EVENTS.ERROR, e);
            }
        }
    }
}

// export storage providers from root module
export { IStorageProvider, LocalStorageProvider, InMemoryStorageProvider };

export type { IConfig, IContext, IMutableContext, IVariant, IToggle };
