Package.describe({
  name: 'a4xrbj1:persistent-session',
  version: '0.5.0',
  summary: 'Persistently store Session data on the client (Meteor 3.x) - Numero fork',
  git: 'https://github.com/a4xrbj1/meteor-persistent-session',
});

function configurePackages(api) {
  // METEOR 3.x ONLY. Deliberately narrowed from the upstream ['1.8.2', '1.12', '2.3', '3.0'] on
  // 2026-09-01, operator decision: this fork tracks the latest generation of Meteor and does not
  // carry 1.x/2.x compatibility.
  //
  // This is a BREAKING change for any consumer still on Meteor 1.x or 2.x, and that is intended.
  // The dropped claim was never verified in the first place - the runner that nominally covered
  // those releases, @zodern/mtest, has been dead since 2022-02-23 and never supported Meteor 3.x -
  // so what is removed here is an untested promise, not working support.
  //
  // BE HONEST ABOUT WHAT IS ACTUALLY TESTED: '3.0' is the declared FLOOR, not the tested surface.
  // CI (.github/workflows/test.yml) exercises Meteor 3.5.1 only - the release workspace/frontend
  // runs - so 3.0 through 3.4 are ASSUMED compatible, not measured. The floor is set at 3.0 rather
  // than 3.5.1 because the operator's intent is 'Meteor 3 and above', and a 3.0-3.4 consumer
  // failing would fail loudly at Meteor's constraint-solve step, not silently.
  api.versionsFrom(['3.0']);
  api.use(['typescript', 'tracker', 'reactive-dict', 'session', 'ejson']);
  // If `accounts-base` is loaded, we have to make sure that this package is
  // loaded after `accounts-base` is, so we specify `weak: true` here
  api.use('accounts-base', { weak: true });
  api.mainModule('lib/persistent_session.ts', 'client');
}

Package.onUse(function (api) {
  configurePackages(api);

  api.export('PersistentSession', 'client');
});

Package.onTest(function (api) {
  configurePackages(api);
  api.use('meteortesting:mocha');
  api.use('random');

  api.addFiles('tests/client/persistent_session.ts', 'client');
});
