import { TinyEmitter } from 'tiny-emitter';
import Metrics from './metrics';
import IStorageProvider from './storage-provider';
import LocalStorageProvider from './storage-provider-local';

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

    constructor({
            storageProvider,
            url,
            clientKey,
            refreshInterval = 30,
            metricsInterval = 30,
            disableMetrics = false,
            appName,
            environment = 'default',
            context}
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
        this.toggles = this.storage.get(storeKey) || [];
        this.metrics = new Metrics({
            appName,
            metricsInterval,
            disableMetrics,
            url,
            clientKey,
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
        const staticContext = {environment: this.context.environment, appName: this.context.appName};
        this.context = {...staticContext, ...context};
        if (this.timerRef) {
            this.fetchToggles();
        }
    }

    public async start(): Promise<void> {
        if (fetch) {
            this.stop();
            const interval = this.refreshInterval;
            await this.fetchToggles();
            this.emit(EVENTS.READY);
            this.timerRef = setInterval(() => this.fetchToggles(), interval);
        } else {
            // tslint:disable-next-line
            console.error('Unleash: Client does not support fetch.');
        }
    }

    public stop(): void {
        if (this.timerRef) {
            clearInterval(this.timerRef);
            this.timerRef = undefined;
        }
    }

    private storeToggles(toggles: IToggle[]): void {
        this.toggles = toggles;
        this.emit(EVENTS.UPDATE);
        this.storage.save(storeKey, toggles);
    }

    private async fetchToggles() {
        if (fetch) {
            try {
                const context = this.context;
                const urlWithQuery = new URL(this.url.toString());
                // Add context information to url search params. If the properties
                // object is included in the context, flatten it into the search params
                // e.g. /?...&property.param1=param1Value&property.param2=param2Value
                Object.entries(context).forEach(([contextKey, contextValue]) => {
                    if (contextKey === 'properties' && contextValue) {
                        Object.entries<string>(contextValue).forEach(([propertyKey, propertyValue]) =>
                            urlWithQuery.searchParams.append(`properties.${propertyKey}`, propertyValue)
                        );
                    } else {
                        urlWithQuery.searchParams.append(contextKey, contextValue);
                    }
                });
                const response = await fetch(urlWithQuery.toString(), {
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
                    this.storeToggles(data.toggles);
                }
            } catch (e) {
                // tslint:disable-next-line
                console.error('Unleash: unable to fetch feature toggles', e);
            }
        }
    }
}
