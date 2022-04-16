// 实现all, race等方法
const PENDING = 0;
const FULFILLED = 1;
const REJECTED = 2;


class MyPromise {
  constructor(fn) {
    const { port1, port2 } = new MessageChannel();
    port2.onmessage = this.onMessage.bind(this);
    this.state = PENDING;
    this.result = undefined;
    this.error = undefined;
    this.subscriptions = [];
    this.errorCallBack = [];
    if (typeof fn === "function") {
      this.captureErr(
        fn.bind(
          null,
          (data) => { port1.postMessage({ data, type: 'success' }); },
          (data) => { port1.postMessage({ data, type: 'error' }); },
        )
      );
    }
  }

  then(cb, errCb) {
    if (typeof cb === "function") {
      this.subscriptions.push(cb);
    } else {
      console.warn("请传入函数");
    }
    if (errCb && typeof errCb === "function") {
      this.errorCallBack.push(cb);
    }
    return this;
  }

  catch(cb) {
    if (typeof cb === "function") {
      this.errorCallBack.push(cb);
    } else {
      console.warn("请传入函数");
    }
  }

  static resolve(cb) {
    return new MyPromise((res) => res(cb));
  }

  static reject() {
    return new MyPromise((_, rej) => rej(cb));
  }

  static all(arr) {
    return new MyPromise((resolve) => {
      const result = [];
      const checkOver = () => {
        for (let j = 0; j < arr.length; j++) {
          if (!result[j] && result[j] !== arr[j]) {
            return false;
          }
        }
        return true;
      };
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] instanceof MyPromise) {
          arr[i].then((res) => {
            result[i] = res;
            if (checkOver()) {
              resolve(result);
            }
          });
        } else {
          result[i] = arr[i];
          if (checkOver()) {
            resolve(result);
          }
        }
      }
    });
  }

  static race(arr) {
    return new MyPromise((resolve) => {
      for (let promise of arr) {
        if (promise instanceof MyPromise) {
          promise.then((res) => {
            resolve(res);
          });
        } else {
          return resolve(promise);
        }
      }
    })
  }

  onMessage(data) {
    const { data: info } = data;
    const { type, data: res } = info;
    if(type === 'success') {
      this._resolve(res);
    } else {
      this._reject(res);
    }
  }

  _resolve(res) {
    if (this.state !== PENDING) {
      return;
    }
    this.state = FULFILLED;
    if (res instanceof MyPromise) {
      res.then((data) => {
        this.result = data;
        this.notify();
      });
    } else {
      this.result = res;
      this.notify();
    }
  }

  _reject(res) {
    if (this.state !== PENDING) {
      return;
    }
    this.PENDING = REJECTED;
    if (res instanceof MyPromise) {
      res.then((data) => {
        this.error = data;
        this.notifyError();
      });
    } else {
      this.error = res;
       this.notifyError();
    }
  }

  notify() {
    let callback = null;
    while ((callback = this.subscriptions.shift())) {
       this.result = this.captureErr(callback.bind(null, this.result));
    }
  }

  notifyError() {
    const cb = this.errorCallBack.shift();
    if (cb && this.state === PENDING) {
      this.result = this.captureErr(cb.bind(null, this.error));
    }
  }

  captureErr(cb) {
    try {
      const value = cb();
      return value;
    } catch (err) {
      const errCb = this.errorCallBack.shift();
      if (errCb) {
        return errCb(err);
      }
    }
  }
}


// new MyPromise((res, rej) => {
//   console.log(1);
//   rej(4);
//   res(2);
//   console.log(5);
// })
//   .then((data) => {
//     console.log("data", data);
//     return 3;
//   })
//   .then(console.log).catch(console.log);

// MyPromise.all([
//   1,
//   MyPromise.resolve(2),
//   MyPromise.resolve(3).then(() => 4),
//   new MyPromise((res) => setTimeout(() => {res(5)}, 2000)),
//   null,
// ]).then((res) => {
//   console.log('res', res);
// });

MyPromise.race([
  new MyPromise((res) =>
    setTimeout(() => {
      res(5);
    }, 3000)
  ),
  // MyPromise.resolve(3).then(() => 4),
  new MyPromise((res) =>
    setTimeout(() => {
      res(5);
    }, 2000)
  ),
  // 1,
]).then((res) => {
  console.log("res", res);
});