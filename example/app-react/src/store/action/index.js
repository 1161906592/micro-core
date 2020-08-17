/**
 * @Author: liuyang
 * @Date: 2019-04-30 10:41
 */
import http from "@utils/http";

export const SET_USER = "setUser";

async function getUserBasicInfo () {
  const { data: { status, data } } = await http.get("/api/user/basicInfo");
  if (status === 1) {
    return {
      user: data
    };
  } else {
    return {
      user: {}
    };
  }
}

export async function setUser () {
  return {
    type: SET_USER,
    preload: await getUserBasicInfo()
  };
}
