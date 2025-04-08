// Simplified version of: https://github.com/Unleash/unleash-client-node/blob/main/src/metrics.ts

import { parseHeaders } from './util';

export interface MetricsOptions {
    onError: OnError;
    onSent?: OnSent;
    appName: string;
    metricsInterval: number;
    disableMetrics?: boolean;
    url: URL | string;
    clientKey: string;
    fetch: any;
    headerName: string;
    customHeaders?: Record<string, string>;
    metricsIntervalInitial: number;
    connectionId: string;
}

interface VariantBucket {
    [s: string]: number;
}

interface Bucket {
    start: Date;
    stop: Date | null;
    toggles: {
        [s: string]: { yes: number; no: number; variants: VariantBucket };
    };
}

interface Payload {
    bucket: Bucket;
    appName: string;
    instanceId: string;
}

type OnError = (error: unknown) => void;
type OnSent = (payload: Payload) => void;
// eslint-disable-next-line @typescript-eslint/no-empty-function
const doNothing = () => {};

export default class Metrics {
    private onError: OnError;
    private onSent: OnSent;
    private bucket: Bucket;
    private appName: string;
    private metricsInterval: number;
    private disabled: boolean;
    private url: URL;
    private clientKey: string;
    private timer: any;
    private fetch: any;
    private headerName: string;
    private customHeaders: Record<string, string>;
    private metricsIntervalInitial: number;
    private connectionId: string;

    constructor({
        onError,
        onSent,
        appName,
        metricsInterval,
        disableMetrics = false,
        url,
        clientKey,
        fetch,
        headerName,
        customHeaders = {},
        metricsIntervalInitial,
        connectionId,
    }: MetricsOptions) {
        this.onError = onError;
        this.onSent = onSent || doNothing;
        this.disabled = disableMetrics;
        this.metricsInterval = metricsInterval * 1000;
        this.metricsIntervalInitial = metricsIntervalInitial * 1000;
        this.appName = appName;
        this.url = url instanceof URL ? url : new URL(url);
        this.clientKey = clientKey;
        this.bucket = this.createEmptyBucket();
        this.fetch = fetch;
        this.headerName = headerName;
        this.customHeaders = customHeaders;
        this.connectionId = connectionId;
    }

    public start() {
        if (this.disabled) {
            return false;
        }

        if (
            typeof this.metricsInterval === 'number' &&
            this.metricsInterval > 0
        ) {
            if (this.metricsIntervalInitial > 0) {
                setTimeout(() => {
                    this.startTimer();
                    this.sendMetrics();
                }, this.metricsIntervalInitial);
            } else {
                this.startTimer();
            }
        }
    }

    public stop() {
        if (this.timer) {
            clearInterval(this.timer);
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

    private getHeaders() {
        return parseHeaders({
            clientKey: this.clientKey,
            appName: this.appName,
            connectionId: this.connectionId,
            customHeaders: this.customHeaders,
            headerName: this.headerName,
            isPost: true,
        });
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
                headers: this.getHeaders(),
                body: JSON.stringify(payload),
            });
            this.onSent(payload);
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

    public countVariant(name: string, variant: string): boolean {
        if (this.disabled || !this.bucket) {
            return false;
        }
        this.assertBucket(name);
        if (this.bucket.toggles[name].variants[variant]) {
            this.bucket.toggles[name].variants[variant] += 1;
        } else {
            this.bucket.toggles[name].variants[variant] = 1;
        }
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
                variants: {},
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
