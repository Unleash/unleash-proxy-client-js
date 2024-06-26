import { TinyEmitter } from 'tiny-emitter';
import Metrics from './metrics';
import type IStorageProvider from './storage-provider';
import InMemoryStorageProvider from './storage-provider-inmemory';
import LocalStorageProvider from './storage-provider-local';
import EventsHandler from './events-handler';
import { notNullOrUndefined, urlWithContextAsQuery } from './util';

const DEFINED_FIELDS = [
    'userId',
    'sessionId',
    'remoteAddress',
    'currentTime',
] as const;
type DefinedField = (typeof DEFINED_FIELDS)[number];

interface IStaticContext {
    appName: string;
    environment?: string;
}

interface IMutableContext {
    userId?: string;
    sessionId?: string;
    remoteAddress?: string;
    currentTime?: string;
    properties?: {
        [key: string]: string;
    };
}

type IContext = IStaticContext & IMutableContext;

const isDefinedContextField = (field: string): field is DefinedField => {
    return DEFINED_FIELDS.includes(field as DefinedField);
};

interface IConfig extends IStaticContext {
    url: URL | string;
    clientKey: string;
    disableRefresh?: boolean;
    refreshInterval?: number;
    metricsInterval?: number;
    metricsIntervalInitial?: number;
    disableMetrics?: boolean;
    storageProvider?: IStorageProvider;
    context?: IMutableContext;
    fetch?: any;
    createAbortController?: () => AbortController | null;
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
    feature_enabled?: boolean;
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
    SENT: 'sent',
    RECOVERED: 'recovered',
};

const IMPRESSION_EVENTS = {
    IS_ENABLED: 'isEnabled',
    GET_VARIANT: 'getVariant',
};

const defaultVariant: IVariant = {
    name: 'disabled',
    enabled: false,
    feature_enabled: false,
};
const storeKey = 'repo';

type SdkState = 'initializing' | 'healthy' | 'error';

export const resolveFetch = () => {
    try {
        if (typeof window !== 'undefined' && 'fetch' in window) {
            return fetch.bind(window);
        }

        if ('fetch' in globalThis) {
            return fetch.bind(globalThis);
        }
    } catch (e) {
        console.error('Unleash failed to resolve "fetch"', e);
    }

    return undefined;
};

const resolveAbortController = () => {
    try {
        if (typeof window !== 'undefined' && 'AbortController' in window) {
            return () => new window.AbortController();
        }

        if ('fetch' in globalThis) {
            return () => new globalThis.AbortController();
        }
    } catch (e) {
        console.error('Unleash failed to resolve "AbortController" factory', e);
    }
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
    private createAbortController?: () => AbortController | null;
    private abortController?: AbortController | null;
    private bootstrap?: IToggle[];
    private bootstrapOverride: boolean;
    private headerName: string;
    private eventsHandler: EventsHandler;
    private customHeaders: Record<string, string>;
    private readyEventEmitted = false;
    private fetchedFromServer = false;
    private usePOSTrequests = false;
    private started = false;
    private sdkState: SdkState;
    private lastError: any;

    constructor({
        storageProvider,
        url,
        clientKey,
        disableRefresh = false,
        refreshInterval = 30,
        metricsInterval = 30,
        metricsIntervalInitial = 2,
        disableMetrics = false,
        appName,
        environment = 'default',
        context,
        fetch = resolveFetch(),
        createAbortController = resolveAbortController(),
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
        this.sdkState = 'initializing';
        this.ready = new Promise((resolve) => {
            this.init()
                .then(resolve)
                .catch((error) => {
                    console.error(error);
                    this.sdkState = 'error';
                    this.emit(EVENTS.ERROR, error);
                    this.lastError = error;
                    resolve();
                });
        });

        if (!fetch) {
            console.error(
                'Unleash: You must either provide your own "fetch" implementation or run in an environment where "fetch" is available.'
            );
        }
        if (!createAbortController) {
            console.error(
                'Unleash: You must either provide your own "AbortController" implementation or run in an environment where "AbortController" is available.'
            );
        }

        this.fetch = fetch;
        this.createAbortController = createAbortController;
        this.bootstrap =
            bootstrap && bootstrap.length > 0 ? bootstrap : undefined;
        this.bootstrapOverride = bootstrapOverride;

        this.metrics = new Metrics({
            onError: this.emit.bind(this, EVENTS.ERROR),
            onSent: this.emit.bind(this, EVENTS.SENT),
            appName,
            metricsInterval,
            disableMetrics,
            url: this.url,
            clientKey,
            fetch,
            headerName,
            customHeaders,
            metricsIntervalInitial,
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

        if (variant.name) {
            this.metrics.countVariant(toggleName, variant.name);
        }
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
        return { ...variant, feature_enabled: enabled };
    }

    private async updateToggles() {
        if (this.timerRef || this.fetchedFromServer) {
            await this.fetchToggles();
        } else if (this.started) {
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

        await this.updateToggles();
    }

    public getContext() {
        return { ...this.context };
    }

    public setContextField(field: string, value: string) {
        if (isDefinedContextField(field)) {
            this.context = { ...this.context, [field]: value };
        } else {
            const properties = { ...this.context.properties, [field]: value };
            this.context = { ...this.context, properties };
        }

        this.updateToggles();
    }

    public removeContextField(field: string): void {
        if (isDefinedContextField(field)) {
            this.context = { ...this.context, [field]: undefined };
        } else if (typeof this.context.properties === 'object') {
            delete this.context.properties[field];
        }

        this.updateToggles();
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
            this.sdkState = 'healthy';
            this.readyEventEmitted = true;
            this.emit(EVENTS.READY);
        }

        this.sdkState = 'healthy';
        this.emit(EVENTS.INIT);
    }

    public async start(): Promise<void> {
        this.started = true;
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

    public isReady(): boolean {
        return this.readyEventEmitted;
    }

    public getError() {
        return this.sdkState === 'error' ? this.lastError : undefined;
    }

    private async resolveSessionId(): Promise<string> {
        if (this.context.sessionId) {
            return this.context.sessionId;
        }

        let sessionId = await this.storage.get('sessionId');
        if (!sessionId) {
            sessionId = Math.floor(Math.random() * 1_000_000_000);
            await this.storage.save('sessionId', sessionId);
        }
        return sessionId;
    }

    private getHeaders() {
        const isPOST = this.usePOSTrequests;
        const headers = {
            [this.headerName]: this.clientKey,
            Accept: 'application/json',
        };
        if (isPOST) {
            headers['Content-Type'] = 'application/json';
        }
        if (this.etag) {
            headers['If-None-Match'] = this.etag;
        }
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
            if (this.abortController) {
                this.abortController.abort();
            }
            this.abortController = this.createAbortController?.();
            const signal = this.abortController
                ? this.abortController.signal
                : undefined;

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
                    signal,
                });
                if (this.sdkState === 'error' && response.status < 400) {
                    this.sdkState = 'healthy';
                    this.emit(EVENTS.RECOVERED);
                }

                if (response.ok && response.status !== 304) {
                    this.etag = response.headers.get('ETag') || '';
                    const data = await response.json();
                    await this.storeToggles(data.toggles);

                    if (this.sdkState !== 'healthy') {
                        this.sdkState = 'healthy';
                    }

                    if (!this.fetchedFromServer) {
                        this.fetchedFromServer = true;
                        this.readyEventEmitted = true;
                        this.emit(EVENTS.READY);
                    }
                } else if (!response.ok && response.status !== 304) {
                    console.error(
                        'Unleash: Fetching feature toggles did not have an ok response'
                    );
                    this.sdkState = 'error';
                    this.emit(EVENTS.ERROR, {
                        type: 'HttpError',
                        code: response.status,
                    });
                    this.lastError = {
                        type: 'HttpError',
                        code: response.status,
                    };
                }
            } catch (e) {
                if (!(e instanceof DOMException && e.name === 'AbortError')) {
                    console.error(
                        'Unleash: unable to fetch feature toggles',
                        e
                    );
                    this.sdkState = 'error';
                    this.emit(EVENTS.ERROR, e);
                    this.lastError = e;
                }
            } finally {
                this.abortController = null;
            }
        }
    }
}

// export storage providers from root module
export { type IStorageProvider, LocalStorageProvider, InMemoryStorageProvider };

export type { IConfig, IContext, IMutableContext, IVariant, IToggle };
