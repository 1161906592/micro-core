/**
 * @Author: liuyang
 * @Date: 2019-04-30 11:00
 */

export const isPromise = (obj) => (!!obj && (typeof obj === "object" || typeof obj === "function") && typeof obj.then === "function");
