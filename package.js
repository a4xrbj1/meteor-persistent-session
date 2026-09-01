Package.describe({
  name: 'a4xrbj1:persistent-session',
  version: '0.5.0',
  summary: 'Persistently store Session data on the client (Meteor 3.x) - Numero fork',
  git: 'https://github.com/a4xrbj1/meteor-persistent-session',
});

function configurePackages(api) {
  // COMPATIBILITY CLAIM vs WHAT IS ACTUALLY TESTED - read this before trusting the list below.
  // CI (.github/workflows/test.yml) exercises Meteor 3.5.1 ONLY, because that is what the sole
  // consumer (workspace/frontend) runs. The 1.8.2 / 1.12 / 2.3 entries are inherited from upstream
  // and are UNTESTED here: the runner that once claimed to cover them, @zodern/mtest, has been dead
  // since 2022-02-23 and never supported Meteor 3.x, so those releases were never really verified by
  // this repo either. The list is left intact rather than narrowed because narrowing it is a
  // breaking change for any consumer on Meteor 1.x/2.x - treat 1.x/2.x support as legacy and
  // unverified, not as a promise.
  api.versionsFrom(['1.8.2', '1.12', '2.3', '3.0']);
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
