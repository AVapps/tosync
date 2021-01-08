/* Information about this package */
Package.describe({
  // Short two-sentence summary.
  summary: "Static Data",
  // Version number.
  version: "1.0.0",
  // Optional.  Default is package directory name.
  name: "adrienv:static-data"
});

/* This defines your actual package */
Package.onUse(function (api) {
  // api.versionsFrom('1.0.0');

  api.use([
    'meteor-base',
    'ecmascript',
    'reactive-var',
    'minimongo',
    'mongo',
    'adrienv:grounddb'
  ], ['client', 'server']);

  api.export('Static', ['client', 'server']);

  // Server code
  api.addFiles('static-data-server.js', 'server');
  // Client App code
  api.addFiles('static-data-client.js', 'client');

});

/* This defines the tests for the package */
Package.onTest(function (api) {
});