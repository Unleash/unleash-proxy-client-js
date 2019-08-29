//
const variant = unleash.getVariant('toggleName');

// Google Analytics integration
var dimensionValue = variant.name;
ga('set', 'dimension3', dimensionValue);

