/*
* simple Redux
* */
import {
  ProxyType,
  StoreAction,
  StoreReducer,
  StoreReducersMapObject,
  StoreStateFromReducersMapObject
} from "./interface";

function randomString() {
  return Math.random().toString(36).substring(7).split("").join(".");
}

const ActionTypes = {
  INIT: "@@store/INIT" + randomString(),
  REPLACE: "@@store/REPLACE" + randomString()
};

export function createStore<S, A extends StoreAction>(reducer: StoreReducer<S, A>, preloadedState?: S) {
  let currentReducer = reducer;
  let currentState = preloadedState;
  let currentListeners: (() => void)[] | null = [];
  let nextListeners = currentListeners;

  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice();
    }
  }

  function getState() {
    return currentState;
  }

  function subscribe(listener: () => void) {
    let isSubscribed = true;
    ensureCanMutateNextListeners();
    nextListeners.push(listener);
    return function unsubscribe() {
      if (!isSubscribed) {
        return;
      }
      isSubscribed = false;
      ensureCanMutateNextListeners();
      let index = nextListeners.indexOf(listener);
      nextListeners.splice(index, 1);
      currentListeners = null;
    };
  }

  function dispatch(action: A) {
    currentState = currentReducer(currentState!, action);
    let listeners = currentListeners = nextListeners;
    for (let i = 0; i < listeners.length; i++) {
      let listener = listeners[i];
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
  let reducerKeys = Object.keys(reducers);

  return function combination(state: StoreStateFromReducersMapObject<typeof reducers> = {}, action: StoreAction) {
    if (state === void 0) {
      state = {};
    }

    let hasChanged = false;
    let nextState: ProxyType = {};

    for (let _i = 0; _i < reducerKeys.length; _i++) {
      let _key = reducerKeys[_i];
      let reducer = reducers[_key];
      let previousStateForKey = state[_key];
      let nextStateForKey = reducer(previousStateForKey, action);

      nextState[_key] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
    }

    hasChanged = hasChanged || reducerKeys.length !== Object.keys(state).length;
    return hasChanged ? nextState : state;
  };
}

export function createAsyncStore<S, A extends StoreAction>(reducers: StoreReducersMapObject) {
  let allReducers = reducers;
  const store = createStore(combineReducers(allReducers));

  function addReducers(reducers: StoreReducersMapObject) {
    const key = Object.keys(reducers).find(key => allReducers[key]);
    if (key) {
      return console.error(`存在与 ${key} 同名的store。`);
    }
    allReducers = {
      ...allReducers,
      ...reducers
    };
    store.replaceReducer(combineReducers(allReducers));
  }

  return {
    ...store,
    addReducers
  };
}
