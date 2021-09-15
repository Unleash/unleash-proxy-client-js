import { TinyEmitter } from 'tiny-emitter';
import Metrics from './metrics';
import type IStorageProvider from './storage-provider';
import LocalStorageProvider from './storage-provider-local';
import InMemoryStorageProvider from './storage-provider-inmemory';

export interface IStaticContext {
    appName: string;
    environment?: string;
}

export interface IMutableContext {
    userId?: string;
    sessionId?: string;
    remoteAddress?: string;
    properties?: {
        [key:string]: string,
    };
}

export type IContext = IStaticContext & IMutableContext;

export interface IConfig extends IStaticContext {
    url: string;
    clientKey: string;
    refreshInterval?: number;
    metricsInterval?: number;
    disableMetrics?: boolean;
    storageProvider?: IStorageProvider;
    context?: IMutableContext;
    fetch?: any;
}

export interface IVariant {
    name: string;
    payload?: {
        type: string,
        value: string,
    };
}

export interface IToggle {
    name: string;
    enabled: boolean;
    variant: IVariant;
}

export const EVENTS = {
    READY: 'ready',
    UPDATE: 'update',
};

const defaultVariant: IVariant = {name: 'disabled'};
const storeKey = 'repo';

const resolveFetch = () => {
    if('fetch' in window) {
        return fetch.bind(window);
    } else if ('fetch' in globalThis) {
        return fetch.bind(globalThis);
    }
    return undefined;
}

export class UnleashClient extends TinyEmitter {
    private toggles: IToggle[] = [];
    private context: IContext;
    private timerRef?: any;
    private storage: IStorageProvider;
    private refreshInterval: number;
    private url: URL;
    private clientKey: string;
    private etag: string = '';
    private metrics: Metrics;
    private ready: Promise<void>;
    private fetch: any;

    constructor({
            storageProvider,
            url,
            clientKey,
            refreshInterval = 30,
            metricsInterval = 30,
            disableMetrics = false,
            appName,
            environment = 'default',
            context,
            fetch = resolveFetch()}
        : IConfig) {
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

        this.url = new URL(`${url}`);
        this.clientKey = clientKey;
        this.storage = storageProvider || new LocalStorageProvider();
        this.refreshInterval = refreshInterval * 1000;
        this.context = { appName, environment, ...context };
        this.ready = new Promise(async (resolve) => {
            try {
                await this.init();
            } catch (error) {
                console.error(error);
            } 
            resolve();    
        });

        if(!fetch) {
              // tslint:disable-next-line
              console.error('Unleash: You must either provide your own "fetch" implementation or run in an environment where "fetch" is available.');
        }

        this.fetch = fetch;

        this.metrics = new Metrics({
            appName,
            metricsInterval,
            disableMetrics,
            url,
            clientKey,
            fetch
        });
    }

    public isEnabled(toggleName: string): boolean {
        const toggle = this.toggles.find((t) => t.name === toggleName);
        const enabled = toggle ? toggle.enabled : false;
        this.metrics.count(toggleName, enabled);
        return enabled;
    }

    public getVariant(toggleName: string): IVariant {
        const toggle = this.toggles.find((t) => t.name === toggleName);
        if (toggle) {
            this.metrics.count(toggleName, true);
            return toggle.variant;
        } else {
            this.metrics.count(toggleName, false);
            return defaultVariant;
        }
    }

    public updateContext(context: IMutableContext) {
        // Give the user a nicer error message when including
        // static fields in the mutable context object
        // @ts-ignore
        if (context.appName || context.environment) {
            console.warn("appName and environment are static. They can't be updated with updateContext.");
        }
        const staticContext = {environment: this.context.environment, appName: this.context.appName };
        this.context = {...staticContext, ...context};
        if (this.timerRef) {
            this.fetchToggles();
        }
    }

    public getContext() {
        return {...this.context};
    }

    private async init(): Promise<void> {
        const sessionId = await this.resolveSessionId();
        this.context = { sessionId, ...this.context };

        const togglesLocal = await this.storage.get(storeKey) || [];
        if(this.toggles.length === 0) {
            this.toggles = togglesLocal;
        }
    }

    public async start(): Promise<void> {
        await this.ready;
        this.stop();
        const interval = this.refreshInterval;
        await this.fetchToggles();
        this.emit(EVENTS.READY);
        this.timerRef = setInterval(() => this.fetchToggles(), interval);
    }

    public stop(): void {
        if (this.timerRef) {
            clearInterval(this.timerRef);
            this.timerRef = undefined;
        }
    }

    private async resolveSessionId(): Promise<string> {
        if(this.context.sessionId) {
            return this.context.sessionId;
        } else {
            let sessionId = await this.storage.get('sessionId');
            if(!sessionId) {
                sessionId = Math.floor(Math.random() * 1_000_000_000); 
                await this.storage.save('sessionId', sessionId);
            }
            return sessionId;
        }
    }

    private async storeToggles(toggles: IToggle[]): Promise<void> {
        this.toggles = toggles;
        this.emit(EVENTS.UPDATE);
        this.storage.save(storeKey, toggles);
    }

    private async fetchToggles() {
        if (this.fetch) {
            try {
                const context = this.context;
                const urlWithQuery = new URL(this.url.toString());
                // Add context information to url search params. If the properties
                // object is included in the context, flatten it into the search params
                // e.g. /?...&property.param1=param1Value&property.param2=param2Value
                Object.entries(context).forEach(([contextKey, contextValue]) => {
                    if (contextKey === 'properties' && contextValue) {
                        Object.entries<string>(contextValue).forEach(([propertyKey, propertyValue]) =>
                            urlWithQuery.searchParams.append(`properties[${propertyKey}]`, propertyValue)
                        );
                    } else {
                        urlWithQuery.searchParams.append(contextKey, contextValue);
                    }
                });
                const response = await this.fetch(urlWithQuery.toString(), {
                    cache: 'no-cache',
                    headers: {
                        'Authorization': this.clientKey,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'If-None-Match': this.etag,
                    },
                });
                if (response.ok && response.status !== 304) {
                    this.etag = response.headers.get('ETag') || '';
                    const data = await response.json();
                    await this.storeToggles(data.toggles);
                }
            } catch (e) {
                // tslint:disable-next-line
                console.error('Unleash: unable to fetch feature toggles', e);
            }
        }
    }
}

// export storage providers from root module
export { IStorageProvider, LocalStorageProvider, InMemoryStorageProvider }