import IStorageProvider from './storage-provider';
import LocalStorageProvider from './storage-provider-local';

export interface IConfig {
    url: string;
    clientKey: string;
    refreshInterval?: number;
    storageProvider?: IStorageProvider;
}

export interface IContext {
    [key: string]: string;
}

export interface IVariant {
    name: string;
    payload?: string;
}

export interface IToggle {
    name: string;
    enabled: boolean;
    variant: IVariant;
}

const defaultVariant: IVariant = {name: 'disabled'};
const storeKey = 'repo';

export default class UnleashClient {
    private toggles: IToggle[] = [];
    private context: IContext;
    private ref?: any;
    private storage: IStorageProvider;
    private refreshInterval: number;
    private url: URL;
    private clientKey: string;

    constructor(config: IConfig, context?: IContext) {
        this.storage = config.storageProvider || new LocalStorageProvider();
        this.refreshInterval = (config.refreshInterval || 30) * 1000;

        // Validations
        if (!config.url) {
            throw new Error('You have to specify the url!');
        }
        if (!config.clientKey) {
            throw new Error('You have to specify the clientKey!');
        }

        this.url = new URL(`${config.url}/proxy`);
        this.clientKey = config.clientKey;

        this.context = context || {};
        this.toggles = this.storage.get(storeKey);
    }

    public isEnabled(toggleName: string): boolean {
        const toggle = this.toggles.find((t) => t.name === toggleName);
        return toggle ? toggle.enabled : false;
    }

    public getVariant(toggleName: string): IVariant {
        const toggle = this.toggles.find((t) => t.name === toggleName);
        return toggle ? toggle.variant : defaultVariant;
    }

    public updateContext(context: IContext) {
        this.context = context;
    }

    public async start(): Promise<void> {
        if (fetch) {
            this.stop();
            const interval = this.refreshInterval;
            await this.fetchToggles();
            this.ref = setInterval(() => this.fetchToggles(), interval);
        } else {
            // tslint:disable-next-line
            console.error('Unleash: Client does not support fetch.');
        }
    }

    public stop(): void {
        if (this.ref) {
            clearInterval(this.ref);
        }
    }

    private storeToggles(toggles: IToggle[]): void {
        this.toggles = toggles;
        this.storage.save(storeKey, toggles);
    }

    private async fetchToggles() {
        if (fetch) {
            const context = this.context;
            const urlWithQuery = this.url;
            Object.keys(context).forEach((key) => urlWithQuery.searchParams.append(key, context[key]));
            const response = await fetch(urlWithQuery.toString(), {
                cache: 'no-cache',
                headers: {
                    'Authorization': this.clientKey,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            this.storeToggles(data.toggles);
        }
    }
}
