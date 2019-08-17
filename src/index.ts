interface IConfig {
    url: string;
    clientKey: string;
    refreshInterval: number;
}

interface IContext {
    [key: string]: string;
}

interface IToggles {
    [key: string]: boolean;
}

class UnleashClient {
    private toggles: IToggles = {};
    private context: IContext;
    private ref: number;

    constructor(config: IConfig, context: IContext) {
        this.context = context;
        this.fetchToggles(config);
        this.ref = setInterval(() => this.fetchToggles(config), config.refreshInterval);
    }

    public isEnabled(toggleName: string): boolean {
        return this.toggles[toggleName];
    }

    public updateContext(context: IContext) {
        this.context = context;
    }

    public stop(): void {
        if (this.ref) {
            clearInterval(this.ref);
        }
    }

    private async fetchToggles({ url, clientKey }: IConfig) {
        if (fetch) {
            const context = this.context;
            const u = new URL(url);
            Object.keys(context).forEach((key) => u.searchParams.append(key, context[key]));
            const response = await fetch(u.toString(), {
                headers: {
                    'Authorization': clientKey,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            });
            this.toggles = await response.json();
        } else {
            console.error('Unleash: Browser does not support fetch.');
        }
    }
}
