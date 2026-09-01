const rprefix = /^__amplify__/;

const PREFIX = "__amplify__";

export const amplify = new (class SimpleAmplify {
  clearExpired() {
    const now = Date.now();
    const ret: Record<string, any> = {};
    const removed: string[] = [];

    // Each entry is parsed inside its OWN try, and a malformed one is removed rather than ignored.
    //
    // Before 0.5.0 the whole loop sat in a single `try` with an EMPTY `catch (error) {}`. One
    // unparseable value - and `JSON.parse(localStorage.getItem(key) ?? '')` throws on a missing key,
    // because '' is not valid JSON - aborted the entire sweep silently, from that entry onward.
    // That matters precisely when it is least affordable: clearExpired() is the recovery path
    // store() calls after a quota-exceeded write, so the one moment the cache most needs pruning was
    // the moment a single bad entry could stop it, leaving the retry to fail too.
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key === null || !rprefix.test(key)) continue;

      let parsed: { expires?: number | null; data?: any };
      try {
        const raw = localStorage.getItem(key);
        parsed = raw === null ? { expires: -1 } : JSON.parse(raw);
      } catch (error) {
        // Unparseable: it can never be read back, so it is pure quota. Reclaim it.
        removed.push(key);
        continue;
      }

      if (parsed && parsed.expires && parsed.expires <= now) {
        removed.push(key);
      } else if (parsed) {
        ret[key.replace(rprefix, '')] = parsed.data;
      }
    }

    // Removal happens after the scan: localStorage is index-addressed, and deleting during the walk
    // renumbers the remaining entries and would skip every other key.
    removed.forEach(key => localStorage.removeItem(key));

    return ret;
  }

  get(key: string): any {
    const prefixedKey = PREFIX + key;
    const now = Date.now();

    const storedValue = localStorage.getItem(prefixedKey);
    const parsed = storedValue ? JSON.parse(storedValue) : { expires: -1 };
    if (parsed.expires && parsed.expires <= now) {
      localStorage.removeItem(prefixedKey);
      return undefined;
    }

    return parsed.data;

  }

  store(key: string, value?: any, options?: { expires?: number }): any {
    const prefixedKey = PREFIX + key;
    const now = Date.now();

    if (value === undefined) {
      return this.get(key);
    }

    if (value === null) {
      localStorage.removeItem(prefixedKey);
      return null;
    }

    const parsed = JSON.stringify({
      data: value,
      expires: options?.expires ? now + options.expires : null
    });
    try {
      localStorage.setItem(prefixedKey, parsed);
      // quota exceeded
    } catch (error) {
      console.error(error);
      // expire old data and try again
      this.clearExpired();
      try {
        localStorage.setItem(prefixedKey, parsed);
      } catch (error) {
        throw new Error(`can't set key ${prefixedKey} with data: ${parsed}`);
      }
    }

    return value;
  }
})
