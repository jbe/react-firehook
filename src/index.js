import { useState, useEffect } from "react";

let debugLogEnabled = false;

export function throttle(func, wait, debounce) {
  let timeout, later;

  function result() {
    later = () => {
      timeout = null;
      func.apply(this, arguments);
    };

    if (debounce) clearTimeout(timeout);

    if (debounce || !timeout) {
      timeout = setTimeout(() => later.apply(this, arguments), wait);
    }
  }

  result.cancel = () => clearTimeout(timeout);
  result.flush = () => {
    if (timeout) later();
    clearTimeout(timeout);
  };

  return result;
}

export const debounce = (func, wait) => throttle(func, wait, true);

export function useMemoWithCustomEquals(value, isEqual) {
  const [memoized, setMemoized] = useState(value);

  useEffect(() => {
    !isEqual(value, memoized) && setMemoized(value);
  }, [value, isEqual, memoized]);

  return memoized;
}

export function configureFirehook(opts = {}) {
  if (opts.log !== undefined) debugLogEnabled = opts.log;
}

export function unwrapCollectionSnapshot(snapshot) {
  const result = {};
  snapshot.forEach(doc => (result[doc.id] = doc.data()));
  return result;
}

export function refsOrFalseyValuesEqual(a, b) {
  if (!a || !b) return a === b;
  return a.isEqual(b);
}

let snapshotSubscriberCache = [];

export function logSubscriptions() {
  if (!debugLogEnabled) return;

  const total = snapshotSubscriberCache
    .map(item => item.snapshotListeners.length)
    .reduce((a, b) => a + b, 0);

  // console.clear();
  console.log(
    "%c\n🔥 " +
      snapshotSubscriberCache.length +
      " subscription" +
      (snapshotSubscriberCache.length === 1 ? "" : "s") +
      " (" +
      total +
      " hook" +
      (total === 1 ? "" : "s") +
      ")",
    "font-size: 2em"
  );

  snapshotSubscriberCache
    .map(item => {
      const { ref } = item;

      let formattedRef = ref
        ? (ref.path || ref._query || ref) + ""
        : JSON.stringify(ref);

      const maxLen = 60;
      // if (formattedRef.length > maxLen)
      //   formattedRef = formattedRef.substr(0, maxLen - 2) + "..";
      if (formattedRef.length <= maxLen)
        formattedRef = formattedRef + " ".repeat(maxLen - formattedRef.length);

      return { ...item, formattedRef };
    })
    .sort((a, b) => a.formattedRef.localeCompare(b.formattedRef))
    .forEach(item => {
      const { callers, formattedRef } = item;

      const cached = !callers.length;

      const callerCounts = {};
      callers.forEach(caller => {
        if (!callerCounts[caller]) callerCounts[caller] = 1;
        else callerCounts[caller] += 1;
      });

      if (cached) {
        console.log(
          "%c" + formattedRef + " [cache timing out]",
          "font-weight: bold; color: grey;"
        );
      } else {
        console.log(
          "%c" +
            formattedRef +
            "%c » " +
            Object.keys(callerCounts)
              .map(name =>
                callerCounts[name] === 1
                  ? name
                  : name + " × " + callerCounts[name]
              )
              .join(", "),
          "font-weight: bold",
          "font-weight: bold; color: maroon"
        );
      }
    });
}

const debouncedLogSubscriptions = debounce(logSubscriptions, 500);

function cachedOnSnapshot(ref, onSnapshot, onError, callerName) {
  let hit =
    ref &&
    snapshotSubscriberCache.find(item => {
      return (
        item.ref &&
        item.ref.constructor === ref.constructor &&
        item.ref.isEqual(ref)
      );
    });

  if (hit) {
    clearTimeout(hit.timeout);
    hit.snapshotListeners.push(onSnapshot);
    hit.errorListeners.push(onError);
    hit.callers.push(callerName);
    hit.error && onError(hit.error);
    hit.snapshot && onSnapshot(hit.snapshot, true);
  } else {
    hit = {
      ref,
      snapshotListeners: [onSnapshot],
      errorListeners: [onError],
      callers: [callerName]
    };
    hit.cancel = ref.onSnapshot(
      snapshot => {
        delete hit.error;
        hit.snapshot = snapshot;
        hit.snapshotListeners.forEach(fn => fn(snapshot));
      },
      error => {
        delete hit.snapshot;
        hit.error = error;
        hit.errorListeners.forEach(fn => fn(error));
      }
    );
    snapshotSubscriberCache.push(hit);
  }

  debouncedLogSubscriptions();

  return () => {
    debouncedLogSubscriptions();

    if (hit.snapshotListeners.length !== hit.errorListeners.length)
      throw new Error(
        "invalid state: different number of error and snapshot listeners"
      );

    hit.snapshotListeners = hit.snapshotListeners.filter(
      fn => fn !== onSnapshot
    );

    hit.errorListeners = hit.errorListeners.filter(fn => fn !== onError);

    hit.callers = hit.callers.filter(name => name !== callerName);

    if (hit.snapshotListeners.length === 0) {
      hit.timeout = setTimeout(() => {
        hit.cancel();
        snapshotSubscriberCache = snapshotSubscriberCache.filter(
          item => item !== hit
        );
        debouncedLogSubscriptions();
      }, 2000);
    }
  };
}

export function useSubscription(_ref) {
  const ref = useMemoWithCustomEquals(_ref, refsOrFalseyValuesEqual);

  const initialState = {
    data: null,
    error: null,
    ready: false,
    ref,
    id: ref && ref.id
  };

  const [state, setState] = useState(initialState);

  let callerName;
  try {
    throw new Error();
  } catch (e) {
    const re = /(\w+)@|at (\w+) /g;
    re.exec(e.stack);
    const m = re.exec(e.stack);
    callerName = m[1] || m[2];
  }

  useEffect(() => {
    if (!ref) {
      return;
    }

    const cancel = cachedOnSnapshot(
      ref,
      (snapshot, immediate) => {
        setState({
          data: snapshot.forEach
            ? unwrapCollectionSnapshot(snapshot)
            : snapshot.data(),
          error: null,
          ready: true,
          ref: ref,
          id: ref.id,
          immediate
        });
      },
      error => {
        setState({
          data: null,
          error,
          ready: true,
          ref: ref,
          id: ref.id
        });
        throw error;
      },
      callerName
    );

    return () => {
      cancel();
      setState({
        data: null,
        error: null,
        ready: false,
        ref: ref,
        id: null
      });
    };
  }, [ref, callerName]);

  if (!refsOrFalseyValuesEqual(_ref, state.ref)) return initialState;

  return { ...state, enabled: !!ref };
}

export function useFirestoreGet(_ref) {
  const ref = useMemoWithCustomEquals(_ref, refsOrFalseyValuesEqual);

  const [state, setState] = useState({
    data: null,
    error: null,
    ready: false,
    ref,
    id: ref && ref.id
  });

  useEffect(() => {
    if (!ref) return;

    ref.get().then(snapshot =>
      setState({
        data: snapshot.forEach
          ? unwrapCollectionSnapshot(snapshot)
          : snapshot.data(),
        error: null,
        ready: true,
        ref: ref,
        id: ref.id
      })
    );
  }, [ref]);

  return state;
}
