export const $ = (selector) => {
  return document.querySelector(selector);
};

export const $$ = (selector) => {
  return [...document.querySelectorAll(selector)];
};

export const $find = (doc, selector) => {
  return doc.querySelector(selector);
};

export const $$find = (doc, selector) => {
  return [...doc.querySelectorAll(selector)];
};

export const $el = (tag, attr = {}, cb = () => {}) => {
  const el = document.createElement(tag);
  Object.assign(el, attr);
  cb(el);
  return el;
};

export const $print = {
  debug(...args) {
    console.debug.apply(console, [...args]);
  },
  error(...args) {
    console.error.apply(console, [...args]);
  },
  log(...args) {
    console.log.apply(console, [...args]);
  },
};

export const toInt = (x) => {
  const t = Number(x);
  return isNaN(t) ? 0 : Math.floor(t);
};

export const toFormUrlencoded = (o) => {
  // application/x-www-form-urlencoded
  return new URLSearchParams(o).toString();
};

export async function waitUntil(func, { ms = 100, maxCount = 20 } = {}) {
  return new Promise((resolve, reject) => {
    let c = maxCount;
    const i = setInterval(() => {
      const r = func();
      $print.debug('utils#waitUntil: r, countdown', [r, c]);
      if (r) {
        clearInterval(i);
        resolve(r);
      } else if (c <= 0) {
        clearInterval(i);
        reject();
      } else {
        c -= 1;
      }
    }, ms);
  });
}

export async function $ready(func) {
  return waitUntil(func, { maxCount: Infinity })
    .catch($print.error);
}
