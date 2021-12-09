// Simplified version of: https://github.com/Unleash/unleash-client-node/blob/master/src/metrics.ts
export interface MetricsOptions {
    appName: string;
    metricsInterval: number;
    disableMetrics?: boolean;
    url: string;
    clientKey: string;
    fetch: any;
}

interface Bucket {
    start: Date;
    stop: Date | null;
    toggles: { [s: string]: { yes: number; no: number } };
}

export default class Metrics {
    private bucket: Bucket | undefined;
    private appName: string;
    private metricsInterval: number;
    private disabled: boolean;
    private url: string;
    private clientKey: string;
    private timer: any;
    private started: Date;
    private fetch: any;

    constructor({
        appName,
        metricsInterval,
        disableMetrics = false,
        url,
        clientKey,
        fetch,
    }: MetricsOptions) {
        this.disabled = disableMetrics;
        this.metricsInterval = metricsInterval * 1000;
        this.appName = appName;
        this.url = url;
        this.started = new Date();
        this.clientKey = clientKey;
        this.resetBucket();
        this.fetch = fetch;
    }

    public start() {
        if (
            typeof this.metricsInterval === "number" &&
            this.metricsInterval > 0
        ) {
            // send first metrics after two seconds.
            this.startTimer(2000);
        }
    }

    public stop() {
        if (this.timer) {
            clearTimeout(this.timer);
            delete this.timer;
        }
    }

    public async sendMetrics(): Promise<boolean> {
        /* istanbul ignore next if */
        if (this.disabled) {
            return false;
        }
        if (this.bucketIsEmpty()) {
            this.resetBucket();
            this.startTimer();
            return true;
        }
        const url = `${this.url}/client/metrics`;
        const payload = this.getPayload();

        await this.fetch(url, {
            cache: "no-cache",
            method: "POST",
            headers: {
                Authorization: this.clientKey,
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
        return true;
    }

    public count(name: string, enabled: boolean): boolean {
        if (this.disabled || !this.bucket) {
            return false;
        }
        this.assertBucket(name);
        this.bucket.toggles[name][enabled ? "yes" : "no"]++;
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

    private startTimer(timeout?: number) {
        if (this.disabled) {
            return false;
        }
        this.timer = setTimeout(() => {
            this.sendMetrics();
        }, timeout || this.metricsInterval);

        return true;
    }

    private bucketIsEmpty() {
        if (!this.bucket) {
            return false;
        }
        return Object.keys(this.bucket.toggles).length === 0;
    }

    private resetBucket() {
        const bucket: Bucket = {
            start: new Date(),
            stop: null,
            toggles: {},
        };
        this.bucket = bucket;
    }

    private closeBucket() {
        if (this.bucket) {
            this.bucket.stop = new Date();
        }
    }

    private getPayload() {
        this.closeBucket();
        const payload = this.getMetricsData();
        this.resetBucket();
        return payload;
    }

    private getMetricsData() {
        return {
            appName: this.appName,
            instanceId: "browser",
            bucket: this.bucket,
        };
    }
}
