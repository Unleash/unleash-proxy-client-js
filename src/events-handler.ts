import { EVENTS, IContext } from '.';
import { v4 as uuidv4 } from 'uuid';

class EventsHandler {
    private generateEventId() {
        return uuidv4();
    }

    public createIsEnabledEvent(
        context: IContext,
        enabled: boolean,
        featureName: string
    ) {
        return {
            eventType: EVENTS.IS_ENABLED,
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
            eventType: EVENTS.GET_VARIANT,
            eventId: this.generateEventId(),
            variant: variant,
            context,
            enabled,
            featureName,
        };
    }
}

export default EventsHandler;
