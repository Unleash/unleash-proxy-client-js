import { IContext } from ".";
import { v4 as uuidv4 } from "uuid";

class EventsHandler {
    private events: any[] = [];
    private url: URL;
    private clientKey: string;

    constructor(url: URL, clientKey: string) {
        this.url = url;
        this.clientKey = clientKey;
        setInterval(() => {
            this.sendEvents();
        }, 5000);
    }

    private addEvent(event: any) {
        this.events.push(event);
    }

    private generateEventId() {
        return uuidv4();
    }

    public addIsEnabledEvent(
        context: IContext,
        enabled: boolean,
        featureName: string
    ) {
        const event = {
            eventType: "isEnabled",
            eventId: this.generateEventId(),
            context,
            enabled,
            featureName,
        };

        this.addEvent(event);
    }

    public addVariantEvent(
        context: IContext,
        enabled: boolean,
        featureName: string,
        variant: string
    ) {
        const event = {
            eventType: "getVariant",
            eventId: this.generateEventId(),
            variant: variant,
            context,
            enabled,
            featureName,
        };

        this.addEvent(event);
    }

    public addCustomEvent(context: IContext, featureName: string) {
        const event = {
            eventType: "custom",
            eventId: this.generateEventId(),
            context,
            featureName,
        };

        this.addEvent(event);
    }

    private sendEvents() {
        const url = this.url + "/events";
        const start = 0;
        const end = this.events.length;

        if (start === end) return;
        const data = this.events.slice(start, end);

        const headers = {
            Authorization: this.clientKey,
            "Content-Type": "application/json",
        };
        fetch(url, {
            method: "POST",
            body: JSON.stringify({ data }),
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
