export function runQueue(queue: Function[], fn: Function, cb?: Function) {
  next(0);

  function next(index: number) {
    if (index >= queue.length) {
      cb && cb();
    } else {
      if (queue[index]) {
        fn(queue[index], () => {
          next(index + 1);
        });
      } else {
        next(index + 1);
      }
    }
  }
}
