Package.describe({
  name: "adrienv:grounddb",
  version: "2.1.0",
  summary: "Ground Meteor.Collections offline",
  git: "https://github.com/GroundMeteor/db.git"
});

Npm.depends({
  localforage: '1.9.0',
});

Package.onUse(function (api) {
  api.versionsFrom('METEOR@1.3');
  api.use(['ecmascript', 'mongo-id', 'reactive-var', 'diff-sequence', 'minimongo']);

  api.use([
    'ejson',
  ], ['client', 'server']);

  api.export('Ground');

  api.use(['tracker'], 'client');
  api.use(['dispatch:kernel@0.0.6'], 'client', { weak: true });

  api.mainModule('lib/client/ground.db.js', 'client');
  api.mainModule('lib/server/ground.db.js', 'server');
});

Package.onTest(function (api) {
});
