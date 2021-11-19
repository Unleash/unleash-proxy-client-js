import { IContext } from ".";
import { v4 as uuidv4 } from "uuid";
import { urlFormatter } from "./url-formatter";

class EventsHandler {
    private events: any[] = [];
    private url: URL;
    private clientKey: string;

    constructor(url: URL, clientKey: string) {
        this.url = urlFormatter("events", url);
        this.clientKey = clientKey;
    }

    public addEvent(event: any) {
        this.events.push(event);
    }

    private generateEventId() {
        return uuidv4();
    }

    public createIsEnabledEvent(
        context: IContext,
        enabled: boolean,
        featureName: string
    ) {
        return {
            eventType: "isEnabled",
            eventId: this.generateEventId(),
            context,
            enabled,
            featureName,
        };
    }

    public createVariantEvent(
        context: IContext,
        enabled: boolean,
        featureName: string,
        variant: string
    ) {
        return {
            eventType: "getVariant",
            eventId: this.generateEventId(),
            variant: variant,
            context,
            enabled,
            featureName,
        };
    }

    public createCustomEvent(
        context: IContext,
        featureName: string,
        action: string
    ) {
        return {
            eventType: "custom",
            eventId: this.generateEventId(),
            context,
            featureName,
            action,
        };
    }

    private sendEvents() {
        const start = 0;
        const end = this.events.length;

        if (start === end) return;
        const data = this.events.slice(start, end);

        const headers = {
            Authorization: this.clientKey,
            "Content-Type": "application/json",
        };

        fetch(this.url.toString(), {
            method: "POST",
            body: JSON.stringify([...data]),
            headers,
        })
            .then(() => {
                this.events.splice(start, end);
            })
            .catch((err) => {
                console.log("Error reaching unleash proxy");
            });
    }
}

export default EventsHandler;
