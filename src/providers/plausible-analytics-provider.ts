export default class PlausibleAnalyticsProvider  {
    client: any;
    constructor(plausibleClient: any) {
        this.client = plausibleClient
    }

    sendEvent = (event: any) => {
        this.client.trackEvent(event.eventType, {
            callback: console.log('done')
        }, event)
    }
}
