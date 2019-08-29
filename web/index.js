const UnleashClient = require('../build/index.js');

window.unleash = {
    createInstance: (config, context) => new UnleashClient(config, context),
};
