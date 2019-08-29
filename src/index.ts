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

export class UnleashClient {
    private toggles: IToggle[] = [];
    private context: IContext;
    private ref?: any;
    private config: IConfig;
    private storage: IStorageProvider;
    private refreshInterval: number;

    constructor(config: IConfig, context?: IContext) {
        this.config =  config;
        this.storage = config.storageProvider || new LocalStorageProvider();
        this.refreshInterval = config.refreshInterval || 30;

        // Validations
        if (!this.config.url) {
            throw new Error('You have to specify the url!');
        }
        if (!this.config.clientKey) {
            throw new Error('You have to specify the clientKey!');
        }

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
            await this.fetchToggles(this.config);
            this.ref = setInterval(() => this.fetchToggles(this.config), interval);
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

    private async fetchToggles({ url, clientKey }: IConfig) {
        if (fetch) {
            const context = this.context;
            const u = new URL(url);
            Object.keys(context).forEach((key) => u.searchParams.append(key, context[key]));
            const response = await fetch(u.toString(), {
                cache: 'no-cache',
                headers: {
                    'Authorization': clientKey,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            this.storeToggles(data);
        }
    }
}
