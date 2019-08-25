"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.throttle = throttle;
exports.useMemoWithCustomEquals = useMemoWithCustomEquals;
exports.configureFirehook = configureFirehook;
exports.unwrapCollectionSnapshot = unwrapCollectionSnapshot;
exports.refsOrFalseyValuesEqual = refsOrFalseyValuesEqual;
exports.logSubscriptions = logSubscriptions;
exports.useSubscription = useSubscription;
exports.debounce = void 0;

var _react = require("react");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

var debugLogEnabled = false;

function throttle(func, wait, debounce) {
  var timeout, later;

  function result() {
    var _this = this,
        _arguments = arguments;

    later = function later() {
      timeout = null;
      func.apply(_this, _arguments);
    };

    if (debounce) clearTimeout(timeout);

    if (debounce || !timeout) {
      timeout = setTimeout(function () {
        return later.apply(_this, _arguments);
      }, wait);
    }
  }

  result.cancel = function () {
    return clearTimeout(timeout);
  };

  result.flush = function () {
    if (timeout) later();
    clearTimeout(timeout);
  };

  return result;
}

var debounce = function debounce(func, wait) {
  return throttle(func, wait, true);
};

exports.debounce = debounce;

function useMemoWithCustomEquals(value, isEqual) {
  var _useState = (0, _react.useState)(value),
      _useState2 = _slicedToArray(_useState, 2),
      memoized = _useState2[0],
      setMemoized = _useState2[1];

  (0, _react.useEffect)(function () {
    !isEqual(value, memoized) && setMemoized(value);
  }, [value, isEqual, memoized]);
  return memoized;
}

function configureFirehook() {
  var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  if (opts.log !== undefined) debugLogEnabled = opts.log;
}

function unwrapCollectionSnapshot(snapshot) {
  var result = {};
  snapshot.forEach(function (doc) {
    return result[doc.id] = doc.data();
  });
  return result;
}

function refsOrFalseyValuesEqual(a, b) {
  if (!a || !b) return a === b;
  return a.isEqual(b);
}

var snapshotSubscriberCache = [];

function logSubscriptions() {
  if (!debugLogEnabled) return;
  var total = snapshotSubscriberCache.map(function (item) {
    return item.snapshotListeners.length;
  }).reduce(function (a, b) {
    return a + b;
  }, 0); // console.clear();

  console.log("%c\n🔥 " + snapshotSubscriberCache.length + " subscription" + (snapshotSubscriberCache.length === 1 ? "" : "s") + " (" + total + " hook" + (total === 1 ? "" : "s") + ")", "font-size: 2em");
  snapshotSubscriberCache.forEach(function (item) {
    var ref = item.ref,
        callers = item.callers;
    var formattedRef = ref ? (ref.path || ref._query || ref) + "" : JSON.stringify(ref);
    var cached = !callers.length;
    var maxLen = 60; // if (formattedRef.length > maxLen)
    //   formattedRef = formattedRef.substr(0, maxLen - 2) + "..";

    if (formattedRef.length <= maxLen) formattedRef = formattedRef + " ".repeat(maxLen - formattedRef.length);
    var callerCounts = {};
    callers.forEach(function (caller) {
      if (!callerCounts[caller]) callerCounts[caller] = 1;else callerCounts[caller] += 1;
    });

    if (cached) {
      console.log("%c" + formattedRef + " [cache timing out]", "font-weight: bold; color: grey;");
    } else {
      console.log("%c" + formattedRef + "%c » " + Object.keys(callerCounts).map(function (name) {
        return callerCounts[name] === 1 ? name : name + " × " + callerCounts[name];
      }).join(", "), "font-weight: bold", "font-weight: bold; color: maroon");
    }
  });
}

var debouncedLogSubscriptions = debounce(logSubscriptions, 500);

function cachedOnSnapshot(ref, onSnapshot, onError, callerName) {
  var hit = ref && snapshotSubscriberCache.find(function (item) {
    return item.ref && item.ref.constructor === ref.constructor && item.ref.isEqual(ref);
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
      ref: ref,
      snapshotListeners: [onSnapshot],
      errorListeners: [onError],
      callers: [callerName]
    };
    hit.cancel = ref.onSnapshot(function (snapshot) {
      delete hit.error;
      hit.snapshot = snapshot;
      hit.snapshotListeners.forEach(function (fn) {
        return fn(snapshot);
      });
    }, function (error) {
      delete hit.snapshot;
      hit.error = error;
      hit.errorListeners.forEach(function (fn) {
        return fn(error);
      });
    });
    snapshotSubscriberCache.push(hit);
  }

  debouncedLogSubscriptions();
  return function () {
    debouncedLogSubscriptions();
    if (hit.snapshotListeners.length !== hit.errorListeners.length) throw new Error("invalid state: different number of error and snapshot listeners");
    hit.snapshotListeners = hit.snapshotListeners.filter(function (fn) {
      return fn !== onSnapshot;
    });
    hit.errorListeners = hit.errorListeners.filter(function (fn) {
      return fn !== onError;
    });
    hit.callers = hit.callers.filter(function (name) {
      return name !== callerName;
    });

    if (hit.snapshotListeners.length === 0) {
      hit.timeout = setTimeout(function () {
        hit.cancel();
        snapshotSubscriberCache = snapshotSubscriberCache.filter(function (item) {
          return item !== hit;
        });
        debouncedLogSubscriptions();
      }, 2000);
    }
  };
}

function useSubscription(_ref) {
  var ref = useMemoWithCustomEquals(_ref, refsOrFalseyValuesEqual);
  var initialState = {
    data: null,
    error: null,
    ready: false,
    ref: ref,
    id: ref && ref.id
  };

  var _useState3 = (0, _react.useState)(initialState),
      _useState4 = _slicedToArray(_useState3, 2),
      state = _useState4[0],
      setState = _useState4[1];

  var callerName;

  try {
    throw new Error();
  } catch (e) {
    var re = /(\w+)@|at (\w+) /g;
    re.exec(e.stack);
    var m = re.exec(e.stack);
    callerName = m[1] || m[2];
  }

  (0, _react.useEffect)(function () {
    if (!ref) {
      return;
    }

    var cancel = cachedOnSnapshot(ref, function (snapshot, immediate) {
      setState({
        data: snapshot.forEach ? unwrapCollectionSnapshot(snapshot) : snapshot.data(),
        error: null,
        ready: true,
        ref: ref,
        id: ref.id,
        immediate: immediate
      });
    }, function (error) {
      setState({
        data: null,
        error: error,
        ready: true,
        ref: ref,
        id: ref.id
      });
      throw error;
    }, callerName);
    return function () {
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
  return _objectSpread({}, state, {
    enabled: !!ref
  });
}