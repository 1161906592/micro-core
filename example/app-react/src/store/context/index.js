/**
 * @Author: liuyang
 * @Date: 2019-04-30 10:45
 */
import React, { createContext, useContext, useReducer } from "react";
import { isPromise } from "../../utils/base/getTargetType";
import store from '@store/state';
import reducer from "@store/reducer"

function wrapperDispatch (dispatch) {
  return async (action) => {
    if (isPromise(action)) {
      action.then(res => dispatch(res))
    } else {
      dispatch(action)
    }
  }
}

const Context = createContext();

export const StoreProvider = (props) =>{
  const [state, dispatch] = useReducer(reducer, store);
  return (
  <Context.Provider value={{state, dispatch: wrapperDispatch(dispatch)}}>
    {props.children}
  </Context.Provider>
  );
};

// 将store注入组件props 只支持函数组件
export function connect (mapStateToProps, mapDispatchToProps) {
  return function (factory) {
    return function (props) {
      const { dispatch, state } = useContext(Context);
      return factory({...props, ...(mapStateToProps ? mapStateToProps(state, props) : {}), ...(mapDispatchToProps ? mapDispatchToProps(dispatch, props) : {})})
    }
  }
}
