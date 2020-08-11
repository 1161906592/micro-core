/*
* simple Redux
* */
import {
  ProxyType,
  StoreAction,
  StoreReducer,
  StoreReducersMapObject, StoreStateFromReducersMapObject
} from "./interface";

function randomString() {
  return Math.random().toString(36).substring(7).split('').join('.');
}

var ActionTypes = {
  INIT: "@@store/INIT" + randomString(),
  REPLACE: "@@store/REPLACE" + randomString()
};

export function createStore<S, A extends StoreAction>(reducer: StoreReducer<S, A>, preloadedState: S) {
  var currentReducer = reducer;
  var currentState = preloadedState;
  var currentListeners: (() => void)[] | null = [];
  var nextListeners = currentListeners;

  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice();
    }
  }

  function getState() {
    return currentState;
  }

  function subscribe(listener: () => void) {
    var isSubscribed = true;
    ensureCanMutateNextListeners();
    nextListeners.push(listener);
    return function unsubscribe() {
      if (!isSubscribed) {
        return;
      }
      isSubscribed = false;
      ensureCanMutateNextListeners();
      var index = nextListeners.indexOf(listener);
      nextListeners.splice(index, 1);
      currentListeners = null;
    };
  }

  function dispatch(action: A) {
    currentState = currentReducer(currentState, action);
    var listeners = currentListeners = nextListeners;
    for (var i = 0; i < listeners.length; i++) {
      var listener = listeners[i];
      listener();
    }
    return action;
  }

  function replaceReducer(nextReducer: StoreReducer<S, A>) {
    currentReducer = nextReducer;
    dispatch({
      type: ActionTypes.REPLACE
    } as A);
  }

  dispatch({
    type: ActionTypes.INIT
  } as A);
  return {
    dispatch: dispatch,
    subscribe: subscribe,
    getState: getState,
    replaceReducer: replaceReducer
  };
}

export function combineReducers(reducers: StoreReducersMapObject) {
  var reducerKeys = Object.keys(reducers);

  return function combination(state: StoreStateFromReducersMapObject<typeof reducers> = {}, action: StoreAction) {
    if (state === void 0) {
      state = {};
    }

    var hasChanged = false;
    var nextState: ProxyType = {};

    for (var _i = 0; _i < reducerKeys.length; _i++) {
      var _key = reducerKeys[_i];
      var reducer = reducers[_key];
      var previousStateForKey = state[_key];
      var nextStateForKey = reducer(previousStateForKey, action);

      nextState[_key] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
    }

    hasChanged = hasChanged || reducerKeys.length !== Object.keys(state).length;
    return hasChanged ? nextState : state;
  };
}
