/**
 * @Author: liuyang
 * @Date: 2019-04-30 10:40
 */
import { SET_USER } from "@store/action";

const reducer = (state, action) => {
  const { preload } = action;
  switch (action.type) {
    case SET_USER:
      return { ...state, user: preload.user };
    default:
      return state;
  }
};

export default reducer;
