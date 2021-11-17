import { IContext } from ".";

class EventsHandler {
    private events: any[] = [];
    private url: URL = new URL("");
    private clientKey: string = "";
    private interval: number | null = null;

    constructor(url: URL, clientKey: string) {
        this.url = url;
        this.clientKey = clientKey;
        this.interval = setInterval(() => {
            this.sendEvents();
        }, 5000);
    }

    private addEvent(event: any) {
        this.events.push(event);
    }

    public addIsEnabledEvent(
        context: IContext,
        enabled: boolean,
        featureName: string
    ) {
        const event = {
            name: "isEnabled",
            context,
            enabled,
            featureName,
        };
        this.addEvent(event);
    }

    public addVariantEvent(
        context: IContext,
        enabled: boolean,
        featureName: string
    ) {
        const event = {
            name: "getVariant",
            context,
            enabled,
            featureName,
        };
        this.addEvent(event);
    }

    public addCustomEvent(context: IContext, featureName: string) {
        const event = {
            name: "custom",
            context,
            featureName,
        };
        this.addEvent(event);
    }

    private sendEvents() {
        const url = this.url + "/events";
        const start = 0;
        const end = this.events.length;

        const data = this.events.splice(start, end);

        if (data.length < 1) return;
        const headers = {
            Authorization: this.clientKey,
            type: "application/json",
        };
        const blob = new Blob([JSON.stringify(data)], headers);
        const success = navigator.sendBeacon(url, blob);

        if (!success) {
            this.events = [...data, ...this.events];
        }
    }
}

export default EventsHandler;
