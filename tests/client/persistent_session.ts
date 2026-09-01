import { EJSON } from 'meteor/ejson';
import { Random } from 'meteor/random';
import { Session } from 'meteor/session';
import { LifetimeType, PersistentSession } from '../../lib/persistent_session';
import { amplify } from '../../lib/amplify';
import { PS_KEYS } from '../../lib/constants';

/**
 * Asserts deep equality with the same semantics Tinytest's `test.equal` had.
 *
 * WHY THIS EXISTS INSTEAD OF CHAI. A Meteor package resolves npm imports only through
 * `Npm.depends`, which is package-scoped - declaring `chai` there would make an assertion library
 * a RUNTIME dependency of a package that currently ships none at all. `ejson` is already in
 * `api.use()`, and `EJSON.equals` is precisely what Tinytest compared with, so the ported
 * assertions keep their original meaning with no new dependency in either direction.
 *
 * @param {*} actual - The value produced by the code under test.
 * @param {*} expected - The value it is required to equal.
 * @param {String} [message] - Optional context added to the failure.
 *
 * @returns {void}
 */
const equal = function (actual: any, expected: any, message?: string): void {
  if (!EJSON.equals(actual, expected)) {
    const detail = `expected ${EJSON.stringify(actual)} to equal ${EJSON.stringify(expected)}`;
    throw new Error(message ? `${message}: ${detail}` : detail);
  }
};

describe('PersistentSession', function () {
  describe('Modes', function () {
    it('defaults to temporary', function () {
      const TestSession = new PersistentSession(Random.id());

      equal('temporary', TestSession.default_method);
    });

    // this isn't testing anything yet...
    it('alternate mode', function () {
      const TestSession = new PersistentSession(Random.id());

      // TODO: This should probably be a reactive var, just for sanity now
      TestSession.default_method = LifetimeType.Authenticated;
      equal('authenticated', TestSession.default_method);

      // reset to default
      TestSession.default_method = LifetimeType.Temporary;
      equal('temporary', TestSession.default_method);
    });
  });

  describe('Clear keys', function () {
    it('clear all keys', function () {
      const TestSession = new PersistentSession(Random.id());

      equal(Object.keys(TestSession.reactiveDict.keys).length, 0);

      TestSession.set('foobar', 'woo');
      let result = TestSession.get('foobar');
      equal('woo', result);

      equal(Object.keys(TestSession.reactiveDict.keys).length, 1);

      TestSession.clear();

      equal(Object.keys(TestSession.reactiveDict.keys).length, 0);

      result = TestSession.get('foobar');
      equal(undefined, result);
    });

    it('clear auth keys', function () {
      const TestSession = new PersistentSession(Random.id());

      equal(Object.keys(TestSession.reactiveDict.keys).length, 0);

      TestSession.setAuth('foobar', 'bork');
      equal('bork', TestSession.get('foobar'));

      TestSession.clearAuth();

      equal(undefined, TestSession.get('foobar'));
    });

    it('skip undefined keys', function () {
      const TestSession = new PersistentSession(Random.id());
      equal(Object.keys(TestSession.reactiveDict.keys).length, 0);

      // @ts-expect-error
      TestSession.set(undefined, 'woo');
      equal(Object.keys(TestSession.reactiveDict.keys).length, 1);

      TestSession.clear();

      equal(Object.keys(TestSession.reactiveDict.keys).length, 0);
    });

    it('clear single key', function () {
      const TestSession = new PersistentSession(Random.id());

      equal(Object.keys(TestSession.reactiveDict.keys).length, 0);

      TestSession.set('foobar', 'woo');
      let result = TestSession.get('foobar');
      equal('woo', result);

      TestSession.set('barfoo', 'oow');
      result = TestSession.get('barfoo');
      equal('oow', result);

      equal(Object.keys(TestSession.reactiveDict.keys).length, 2);

      TestSession.clear('foobar');

      equal(Object.keys(TestSession.reactiveDict.keys).length, 1);

      result = TestSession.get('foobar');
      equal(undefined, result);

      result = TestSession.get('barfoo');
      equal('oow', result);
    });

    it('clear multiple keys', function () {
      const TestSession = new PersistentSession(Random.id());

      equal(Object.keys(TestSession.reactiveDict.keys).length, 0);

      TestSession.set('foobar', 'woo');
      let result = TestSession.get('foobar');
      equal('woo', result);

      TestSession.set('barfoo', 'oow');
      result = TestSession.get('barfoo');
      equal('oow', result);

      equal(Object.keys(TestSession.reactiveDict.keys).length, 2);

      TestSession.clear(undefined, ['foobar', 'barfoo']);

      equal(Object.keys(TestSession.reactiveDict.keys).length, 0);

      result = TestSession.get('foobar');
      equal(undefined, result);

      result = TestSession.get('barfoo');
      equal(undefined, result);
    });
  });

  describe('Get', function () {
    it('gets undefined', function () {
      const TestSession = new PersistentSession(Random.id());

      const result = TestSession.get('foobar');
      equal(void 0, result);
    });

    it('store gets persisted value', function () {
      const dictName = Random.id();
      amplify.store(dictName + 'foo', 'awesome');
      const TestSession = new PersistentSession(dictName);
      const result = TestSession.get('foo');
      equal('awesome', result);
    });
  });

  describe('Set', function () {
    it('sets & gets', function () {
      const TestSession = new PersistentSession(Random.id());

      // set never returns anything, although it probably should...
      let result: any = TestSession.set('something', 'amazing');
      equal(void 0, result);
      // did it set?
      result = TestSession.get('something');
      equal('amazing', result);
    });

    it('sets defaults', function () {
      const TestSession = new PersistentSession(Random.id());

      // set never returns anything, although it probably should...
      let result: any = TestSession.setDefault('something', 'amazing');
      equal(void 0, result);

      // did it set?
      result = TestSession.get('something');
      equal('amazing', result);
    });

    it('sets defaults with an object', function () {
      const TestSession = new PersistentSession(Random.id());

      // set never returns anything, although it probably should...
      let result: any = TestSession.setDefault({ something: 'amazing', foobar: 'awesome' });
      equal(void 0, result);

      // did it set?
      result = TestSession.get('something');
      equal('amazing', result);

      result = TestSession.get('foobar');
      equal('awesome', result);
    });

    it("sets defaults but doesn't change if set", function () {
      const TestSession = new PersistentSession(Random.id());

      // set never returns anything, although it probably should...
      TestSession.set('something', 'amazing');

      let result: any = TestSession.setDefault('something', 'awesome');
      equal(void 0, result);

      // did it set?
      result = TestSession.get('something');
      equal('amazing', result);
    });

    it("multiple sessions don't effect each other (never cross the streams)", function () {
      const TestSessionFoo = new PersistentSession(Random.id());
      const TestSessionBar = new PersistentSession(Random.id());

      TestSessionFoo.set('something', 'amazing');
      let result = TestSessionFoo.get('something');
      equal('amazing', result);

      TestSessionBar.set('something', 'awesome');
      result = TestSessionBar.get('something');
      equal('awesome', result);

      result = TestSessionFoo.get('something');
      equal('amazing', result);
    });

    it('setDefaultPersistent sets with an object', function () {
      const TestSession = new PersistentSession(Random.id());

      TestSession.setDefaultPersistent({
        'id': 'foobarid',
        'room_id': 'foobarroomid'
      });

      TestSession.reactiveDict.clear();

      let result = TestSession.get('id');
      equal('foobarid', result);

      result = TestSession.get('room_id');
      equal('foobarroomid', result);
    });

    it('setDefaultPersistent only sets unset keys (gh #32)', function () {
      const TestSession = new PersistentSession(Random.id());

      TestSession.set('room_id', 'awesome');
      let result = TestSession.get('room_id');
      equal('awesome', result);

      TestSession.setDefaultPersistent({
        'id': 'foobarid',
        'room_id': 'foobarroomid'
      });

      result = TestSession.get('id');
      equal('foobarid', result);

      result = TestSession.get('room_id');
      equal('awesome', result);
    });

    it('setDefaultPersistent should not override an existing persisted value', function () {
      const dictName = Random.id();
      amplify.store(dictName + 'foo', 'awesome');

      const TestSession = new PersistentSession(dictName);

      let result = TestSession.get('foo');
      equal('awesome', result);

      TestSession.setDefaultPersistent('foo', 'foobarid');

      result = TestSession.get('foo');
      equal('awesome', result);
    });
  });

  describe('Equals', function () {
    it('equals() works', function () {
      const dictName = Random.id();
      amplify.store(dictName + 'foo', 'awesome');

      const TestSession = new PersistentSession(dictName);

      let result: any = TestSession.get('foo');
      equal('awesome', result);

      result = TestSession.equals('foo', 'awesome');
      equal(true, result);
    });
  });

  describe('All', function () {
    it('all() works', function () {
      const dictName = Random.id();
      // default the session with some data before creating it
      amplify.store(dictName + 'foo', 'awesome');
      // since we set foo, we'll also need it's key to be set to `set` is called
      // and it ends up in the `dict.keys`
      amplify.store(PS_KEYS + dictName, ['foo']);
      amplify.store('__PSDATAVERSION__' + dictName, 4);

      const TestSession = new PersistentSession(dictName);

      let result: any = TestSession.get('foo');
      equal('awesome', result);

      TestSession.set('bar', 'thing');
      result = TestSession.get('bar');
      equal('thing', result);

      TestSession.setDefaultPersistent('foobar', 'stuff');
      TestSession.setAuth('foobarfoo', 'fact');
      TestSession.setPersistent('barfoobar', 'entity');

      result = TestSession.all();

      equal({
        'foo': 'awesome',
        'bar': 'thing',
        'foobar': 'stuff',
        'foobarfoo': 'fact',
        'barfoobar': 'entity'
      }, result);
    });
  });

  describe('Session', function () {
    it('has valid prototype', function () {
      // @ts-ignore
      Session.setPersistent('testkey', 1);

      equal(Session.get('testkey'), 1);
    });
  });

  describe('Migrations', function () {
    it('updates from 3.x to 4.x', function () {
      const dictName = Random.id();
      localStorage.clear();
      // Set up 3.x-format keys/values
      localStorage['__amplify__' + dictName + 'foo'] = '{"data":"[]","expires":null}';
      localStorage['__amplify__' + dictName + 'bar'] = '{"data":"\\"noodol\\"","expires":null}';
      localStorage['__amplify__' + dictName + 'obj'] = '{"data":"{\\"obj\\":\\"val\\"}","expires":null}';
      // 4.x-format keys/values
      localStorage['__amplify__' + dictName + 'foo4'] = '{"data":[],"expires":null}';
      localStorage['__amplify__' + dictName + 'bar4'] = '{"data":"noodol","expires":null}';
      localStorage['__amplify__' + dictName + 'obj4'] = '{"data":{"obj":"val"},"expires":null}';
      amplify.store(PS_KEYS + dictName, ['foo', 'bar', 'obj', 'foo4', 'bar4', 'obj4']);
      amplify.store('__PSDATAVERSION__' + dictName, 1);

      const TestSession = new PersistentSession(dictName);
      equal(amplify.store('__PSDATAVERSION__' + dictName), 4);
      equal(TestSession.get('foo'), []);
      equal(TestSession.get('bar'), 'noodol');
      equal(TestSession.get('obj'), { obj: 'val' });
      equal(TestSession.get('foo4'), []);
      equal(TestSession.get('bar4'), 'noodol');
      equal(TestSession.get('obj4'), { obj: 'val' });
    });
  });
});
