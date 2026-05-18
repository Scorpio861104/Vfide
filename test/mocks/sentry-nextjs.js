const noop = () => undefined;

module.exports = {
  init: noop,
  captureMessage: noop,
  captureException: noop,
  withSentryConfig: (config) => config,
  withServerActionInstrumentation: async (_name, callback) => callback(),
  startSpan: (_options, callback) => (typeof callback === 'function' ? callback() : undefined),
};
