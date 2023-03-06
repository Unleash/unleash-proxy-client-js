// Simplified version of: https://github.com/Unleash/unleash-client-node/blob/main/src/metrics.ts

export interface MetricsOptions {
    onError: OnError;
    appName: string;
    metricsInterval: number;
    disableMetrics?: boolean;
    url: URL | string;
    clientKey: string;
    fetch: any;
    headerName: string;
}

interface Bucket {
    start: Date;
    stop: Date | null;
    toggles: { [s: string]: { yes: number; no: number } };
}

interface Payload {
    bucket: Bucket;
    appName: string;
    instanceId: string;
}

type OnError = (error: unknown) => void;

export default class Metrics {
    private onError: OnError;
    private bucket: Bucket;
    private appName: string;
    private metricsInterval: number;
    private disabled: boolean;
    private url: URL;
    private clientKey: string;
    private timer: any;
    private fetch: any;
    private headerName: string;

    constructor({
        onError,
        appName,
        metricsInterval,
        disableMetrics = false,
        url,
        clientKey,
        fetch,
        headerName,
    }: MetricsOptions) {
        this.onError = onError;
        this.disabled = disableMetrics;
        this.metricsInterval = metricsInterval * 1000;
        this.appName = appName;
        this.url = url instanceof URL ? url : new URL(url);
        this.clientKey = clientKey;
        this.bucket = this.createEmptyBucket();
        this.fetch = fetch;
        this.headerName = headerName;
    }

    public start() {
        if (this.disabled) {
            return false;
        }

        if (
            typeof this.metricsInterval === 'number' &&
            this.metricsInterval > 0
        ) {
            // send first metrics after two seconds.
            setTimeout(() => {
                this.startTimer();
                this.sendMetrics();
            }, 2000);
        }
    }

    public stop() {
        if (this.timer) {
            clearTimeout(this.timer);
            delete this.timer;
        }
    }

    public createEmptyBucket(): Bucket {
        return {
            start: new Date(),
            stop: null,
            toggles: {},
        };
    }

    public async sendMetrics(): Promise<void> {
        /* istanbul ignore next if */

        const url = `${this.url}/client/metrics`;
        const payload = this.getPayload();

        if (this.bucketIsEmpty(payload)) {
            return;
        }

        try {
            await this.fetch(url, {
                cache: 'no-cache',
                method: 'POST',
                headers: {
                    [this.headerName]: this.clientKey,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
        } catch (e) {
            console.error('Unleash: unable to send feature metrics', e);
            this.onError(e);
        }
    }

    public count(name: string, enabled: boolean): boolean {
        if (this.disabled || !this.bucket) {
            return false;
        }
        this.assertBucket(name);
        this.bucket.toggles[name][enabled ? 'yes' : 'no']++;
        return true;
    }

    private assertBucket(name: string) {
        if (this.disabled || !this.bucket) {
            return false;
        }
        if (!this.bucket.toggles[name]) {
            this.bucket.toggles[name] = {
                yes: 0,
                no: 0,
            };
        }
    }

    private startTimer(): void {
        this.timer = setInterval(() => {
            this.sendMetrics();
        }, this.metricsInterval);
    }

    private bucketIsEmpty(payload: Payload) {
        return Object.keys(payload.bucket.toggles).length === 0;
    }

    private getPayload(): Payload {
        const bucket = { ...this.bucket, stop: new Date() };
        this.bucket = this.createEmptyBucket();

        return {
            bucket,
            appName: this.appName,
            instanceId: 'browser',
        };
    }
}
