import Vue from 'vue';
import VueI18n from 'vue-i18n';
import Vuex from 'vuex';

/**
 * The differents between FOLLOWED_NEWS and ANCIENT_FOLLOWED_NEWS:
 * FOLLOWED_NEWS: div._1BUAfFH>(div._25taFA4>figure.mSh0kS-)*N
 * ANCIENT_FOLLOWED_NEWS: ul>(li.image-item>a*3)*N
 */

const MAIN_PAGE_TYPE = {
  ANCIENT_FOLLOWED_NEWS: Symbol('ANCIENT_FOLLOWED_NEWS'),
  FOLLOWED_NEWS: Symbol('FOLLOWED_NEWS'),
  NEW_PROFILE: Symbol('NEW_PROFILE'),
  NEW_PROFILE_BOOKMARK: Symbol('NEW_PROFILE_BOOKMARK'),
  NEW_PROFILE_ILLUST: Symbol('NEW_PROFILE_ILLUST'),
  NEW_PROFILE_MANGA: Symbol('NEW_PROFILE_MANGA'),
  NO_SUPPORT: Symbol('NO_SUPPORT'),
  SEARCH: Symbol('SEARCH'),
  SELF_BOOKMARK: Symbol('SELF_BOOKMARK'),
};

const SORT_TYPE = {
  BOOKMARK_COUNT: 2,
  BOOKMARK_ID: 1,
  ILLUST_ID: 0,
};

const NPP_TYPE_COUNT = 5;

const $ = (selector) => {
  return document.querySelector(selector);
};

const $$ = (selector) => {
  return [...document.querySelectorAll(selector)];
};

const $$find = (doc, selector) => {
  return [...doc.querySelectorAll(selector)];
};

const $el = (tag, attr = {}, cb = () => {}) => {
  const el = document.createElement(tag);
  Object.assign(el, attr);
  cb(el);
  return el;
};

const $print = {
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

const toInt = (x) => {
  const t = Number(x);
  return isNaN(t) ? 0 : Math.floor(t);
};

const $after = (el, target) => {
  el.parentNode.insertBefore(target, el.nextSibling);
};

const $parents = (el) => {
  let cur = el;
  const collection = [];
  while (cur.parentElement) {
    collection.push(cur.parentElement);
    cur = cur.parentElement;
  }
  return collection;
};

const toFormUrlencoded = (o) => {
  // application/x-www-form-urlencoded
  return Object.entries(o)
    .map(p => p.map(encodeURIComponent).join('='))
    .join('&');
};

async function waitUntil(func, { ms = 100, maxCount = 20 } = {}) {
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

async function $ready(func) {
  return waitUntil(func, { maxCount: Infinity })
    .catch($print.error);
}

// ref: https://stackoverflow.com/questions/31089801/extending-error-in-javascript-with-es6-syntax-babel#32749533
class ExtendableError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new Error(message)).stack;
    }
  }
}

class InitError extends ExtendableError {}
class ConnectionError extends ExtendableError {}

// (get|post)Name(HTMLDetail|APIDetail)s?

// new API
// (get|post) (illust|user) name? Data (Group)?
// └ method                 |              |
//                          └ special attr |
//                 group array of requests ┘

class Pixiv {
  constructor() {
    this._tt = null;
  }

  get tt() {
    if (this._tt) {
      return this._tt;
    }

    const inputTT = $('input[name="tt"]');
    if (inputTT) {
      this._tt = inputTT.value;
    } else if (window.pixiv) {
      this._tt = window.pixiv.context.token;
    } else if (window.globalInitData) {
      this._tt = window.globalInitData.token;
    } else {
      $print.error('Pixiv#tt getter');
    }
    return this._tt;
  }

  async fetch(url, options = {}) {
    const opt = Object.assign({ credentials: 'same-origin' }, options);

    $print.debug('Pixiv#fetch: url:', url);

    try {
      if (url) {
        const a = $el('a', { href: url });
        const resp = await fetch(a.href, opt);
        if (!resp.ok) {
          throw new ConnectionError(`${resp.status} ${resp.statusText}`);
        }
        return resp;
      } else {
        $print.error('Pixiv#fetch without url');
      }
    } catch (error) {
      $print.error('Pixiv#fetch: error:', error);
    }
  }

  async fetchJSON(url, options = {}) {
    try {
      const resp = await this.fetch(url, options);
      const data = await resp.json();
      const properties = Object.keys(data);
      if (properties.includes('error') && properties.includes('body')) {
        if (data.error) {
          $print.error('Pixiv#fetchJSON: JSON has error:', data.message);
          return null;
        } else {
          return data.body;
        }
      } else {
        return data;
      }
    } catch (error) {
      $print.error('Pixiv#fetchJSON: error:', error);
    }
  }

  async fetchHTML(url, options = {}) {
    try {
      const resp = await this.fetch(url, options);
      const data = await resp.text();
      return data;
    } catch (error) {
      $print.error('Pixiv#fetchHTML: error:', error);
    }
  }

  async rpcCall(mode, params = {}) {
    /* eslint-disable sort-keys */
    return this.fetchJSON('/rpc/index.php', {
      method: 'POST',

      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormUrlencoded({ ...params, mode, tt: this.tt }),
    });
    /* eslint-enable sort-keys */
  }

  // new API to get an illust data
  async getIllustData(illustId) {
    const url = `/ajax/illust/${illustId}`;
    const data = await this.fetchJSON(url);
    $print.debug('Pixiv#getIllustData: data:', data);
    return data;
  }

  async getIllustBookmarkData(illustId) {
    const url = `/ajax/illust/${illustId}/bookmarkData`;
    const data = await this.fetchJSON(url);
    $print.debug('Pixiv#getIllustBookmarkData: data:', data);
    return data;
  }

  async getIllustDataGroup(illustIds) {
    const uniqIllustIds = [...new Set(illustIds)];
    const illustDataGroup = await Promise.all(uniqIllustIds.map(id => this.getIllustData(id)));
    $print.debug('Pixiv#getIllustDataGroup: illustDataGroup:', illustDataGroup);
    return illustDataGroup
      .filter(Boolean)
      .reduce((collect, d) => {
        collect[d.illustId] = d;
        return collect;
      }, {});
  }

  // new API to get an user data
  async getUserData(userId) {
    const url = `/ajax/user/${userId}`;
    const data = await this.fetchJSON(url);
    $print.debug('Pixiv#getUserData: data:', data);
    return data;
  }

  async getUserProfileData(userId) {
    const url = `/ajax/user/${userId}/profile/all`;
    const data = await this.fetchJSON(url);
    $print.debug('Pixiv#getUserProfileData: data:', data);
    return data;
  }

  async getUserBookmarkData(userId, optSearchParams = {}) {
    const searchParams = Object.assign({
      limit: 24,
      offset: 0,
      rest: 'show',
      tag: '',
    }, optSearchParams);
    const url = `/ajax/user/${userId}/illusts/bookmarks?${toFormUrlencoded(searchParams)}`;
    const data = await this.fetchJSON(url);
    $print.debug('Pixiv#getUserBookmarkData: data:', data);
    return data;
  }

  async getUserDataGroup(userIds) {
    const uniqUserIds = [...new Set(userIds)];
    const userDataGroup = await Promise.all(uniqUserIds.map(id => this.getUserData(id)));
    return userDataGroup
      .filter(Boolean)
      .reduce((collect, d) => {
        collect[d.userId] = d;
        return collect;
      }, {});
  }

  async getIllustUgoiraMetaData(illustId) {
    const url = `/ajax/illust/${illustId}/ugoira_meta`;
    const data = await this.fetchJSON(url);
    $print.debug('Pixiv#getIllustUgoiraMetaData: data:', data);
    return data;
  }

  async getIllustIdsInLegacyPageHTML(url) {
    try {
      const html = await this.fetchHTML(url);
      const nextTag = html.match(/class="next"[^/]*/);

      let nextUrl = '';
      if (nextTag) {
        const nextHref = nextTag[0].match(/href="([^"]+)"/);
        if (nextHref) {
          const query = nextHref[1].replace(/&amp;/g, '&');
          if (query) {
            nextUrl = `${location.pathname}${query}`;
          }
        }
      }

      const iidHTMLs = html.match(/;illust_id=\d+"\s*class="work/g) || [];
      const illustIds = [];
      for (const dataid of iidHTMLs) {
        const iid = dataid.replace(/\D+(\d+).*/, '$1');
        if (!illustIds.includes(iid) && iid !== '0') {
          illustIds.push(iid);
        }
      }
      const ret = {
        illustIds,
        nextUrl,
      };
      return ret;
    } catch (error) {
      $print.error('Pixiv#getIllustIdsInLegacyPageHTML: error:', error);
    }
  }

  async getIllustIdsInPageHTML(url) {
    try {
      const html = await this.fetchHTML(url);
      const nextTag = html.match(/class="next"[^/]*/);

      let nextUrl = '';
      if (nextTag) {
        const nextHref = nextTag[0].match(/href="([^"]+)"/);
        if (nextHref) {
          const query = nextHref[1].replace(/&amp;/g, '&');
          if (query) {
            nextUrl = `${location.pathname}${query}`;
          }
        }
      }

      const iidHTMLs = html.match(/illustId&quot;:&quot;(\d+)&quot;/g) || [];
      $print.debug('Pixiv#getIllustIdsInPageHTML: iidHTMLs:', iidHTMLs);

      const illustIds = [];
      for (const dataid of iidHTMLs) {
        const iid = dataid.replace(/\D+(\d+).*/, '$1');
        if (!illustIds.includes(iid) && iid !== '0') {
          illustIds.push(iid);
        }
      }

      const ret = {
        illustIds,
        nextUrl,
      };
      return ret;
    } catch (error) {
      $print.error('Pixiv#getIllustIdsInPageHTML: error:', error);
    }
  }

  // new API to like an illust, return true if succeeded
  async postIllustLike(illustId) {
    const url = '/ajax/illusts/like';
    /* eslint-disable sort-keys */
    const data = await this.fetchJSON(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': this.tt,
      },
      body: JSON.stringify({
        illust_id: illustId,
      }),
    });
    /* eslint-enable sort-keys */
    return Boolean(data);
  }

  async postFollowUser(userId) {
    const url = '/bookmark_add.php';

    const searchParams = {
      format: 'json',
      mode: 'add',
      restrict: 0,
      tt: this.tt,
      type: 'user',
      user_id: userId,
    };

    /* eslint-disable sort-keys */
    const data = await this.fetchJSON(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: toFormUrlencoded(searchParams),
    });
    /* eslint-enable sort-keys */
    return Boolean(data);
  }

  async postRPCAddBookmark(illustId) {
    const searchParams = {
      comment: '',
      illust_id: illustId,
      restrict: 0,
      tags: '',
    };
    await this.rpcCall('save_illust_bookmark', searchParams);
    return true;
  }

  async postRPCDeleteBookmark(bookmarkId) {
    const searchParams = { bookmark_id: bookmarkId };
    await this.rpcCall('delete_illust_bookmark', searchParams);
    return true;
  }
}

const PixivAPI = new Pixiv();

function removeAnnoyings(doc = document) {
  const annoyings = [
    'iframe',
    // Ad
    '.ad',
    '.ads_area',
    '.ad-footer',
    '.ads_anchor',
    '.ads-top-info',
    '.comic-hot-works',
    '.user-ad-container',
    '.ads_area_no_margin',
    // Premium
    '.hover-item',
    '.ad-printservice',
    '.bookmark-ranges',
    '.require-premium',
    '.showcase-reminder',
    '.sample-user-search',
    '.popular-introduction',
    '._premium-lead-tag-search-bar',
    '._premium-lead-popular-d-body',
    '._premium-lead-promotion-banner',
  ];

  for (const selector of annoyings) {
    for (const el of $$find(doc, selector)) {
      el.remove();
    }
  }
}

Vue.use(VueI18n);

const en = {
  config: {
    blacklist: 'Blacklist',
    contextMenuExtension: 'Right click extension',
    hoverPlay: 'Mouse hover play ugoira',
    userTooltip: 'Illustrator tooltip',
  },
  contextMenu: {
    addToBlacklist: 'Add to Blacklist',
    download: 'Download',
    followUser: 'Follow',
    openBookmarkPage: 'Add Bookmark Page',
    preview: 'Preview',
    thumbUp: 'Like',
  },
  ctrlPanel: {
    buttonEnd: 'End',
    buttonGo: 'Go',
    buttonPause: 'Pause',
    fitWidth: 'fit browser width',
    processed: '{count} imgs processed',
    sortByBookmarkId: 'sort by bookmark id',
    sortByDate: 'sort by date',
    sortByPopularity: 'sort by popularity',
    tagFilterQueryPlaceholder: 'tags filter example: flandre || sister',
  },
  mainView: {
    bookmarkTooltip: '{count} bookmarks',
    newProfilePage: {
      bookmarks: 'Bookmarks',
      contents: 'Contents',
      illustrations: 'Illustrations',
      manga: 'Manga',
      noResult: 'Not found',
      privateBookmark: 'Private',
      publicBookmark: 'Public',
    },
  },
};
const ja = {
  config: {
    blacklist: 'ブラックリスト',
    contextMenuExtension: '右クリックの拡張機能',
    hoverPlay: 'マウスオーバーでうごイラ再生',
    userTooltip: 'イラストレーターツールチップ',
  },
  contextMenu: {
    addToBlacklist: 'ブラックリストへ',
    download: 'ダウンロード',
    followUser: 'フォローする',
    openBookmarkPage: 'ブックマーク追加ページ',
    preview: 'プレビュー',
    thumbUp: 'いいね',
  },
  ctrlPanel: {
    buttonEnd: '終了',
    buttonGo: '捜す',
    buttonPause: '中断',
    fitWidth: '全幅',
    processed: '{count} 件が処理された',
    sortByBookmarkId: 'ブックマーク順',
    sortByDate: '投稿順',
    sortByPopularity: '人気順',
    tagFilterQueryPlaceholder: 'タグフィルター 例: フランドール || 妹様',
  },
  mainView: {
    bookmarkTooltip: '{count} 件のブックマーク',
    newProfilePage: {
      bookmarks: 'ブックマーク',
      contents: '作品',
      illustrations: 'イラスト',
      manga: 'マンガ',
      noResult: '作品がありません',
      privateBookmark: '非公開',
      publicBookmark: '公開',
    },
  },
};
const zhCN = {
  config: {
    blacklist: '黑名單',
    contextMenuExtension: '右键扩展',
    hoverPlay: '鼠标播放动图',
    userTooltip: '绘师提示框',
  },
  contextMenu: {
    addToBlacklist: '拉黑',
    download: '下载',
    followUser: '加关注',
    openBookmarkPage: '开启添加收藏页',
    preview: '原图预览',
    thumbUp: '赞',
  },
  ctrlPanel: {
    buttonEnd: '完',
    buttonGo: '找',
    buttonPause: '停',
    fitWidth: '自适应浏览器宽度',
    processed: '已处理 {count} 张',
    sortByBookmarkId: '以加入顺序排序',
    sortByDate: '以日期排序',
    sortByPopularity: '以人气排序',
    tagFilterQueryPlaceholder: '标签过滤 例: 芙兰朵露 || 二小姐',
  },
  mainView: {
    bookmarkTooltip: '{count} 个收藏',
    newProfilePage: {
      bookmarks: '收藏',
      contents: '作品',
      illustrations: '插画',
      manga: '漫画',
      noResult: '找不到作品',
      privateBookmark: '非公开',
      publicBookmark: '公开',
    },
  },
};
const zhTW = {
  config: {
    blacklist: '黑名單',
    contextMenuExtension: '擴充右鍵',
    hoverPlay: '滑鼠播放動圖',
    userTooltip: '繪師提示框',
  },
  contextMenu: {
    addToBlacklist: '加入黑名單',
    download: '下載',
    followUser: '加關注',
    openBookmarkPage: '開啟添加收藏頁',
    preview: '原圖預覽',
    thumbUp: '讚',
  },
  ctrlPanel: {
    buttonEnd: '完',
    buttonGo: '找',
    buttonPause: '停',
    fitWidth: '自適應瀏覽器寬度',
    processed: '已處理 {count} 張',
    sortByBookmarkId: '以加入順序排序',
    sortByDate: '以日期排序',
    sortByPopularity: '以人氣排序',
    tagFilterQueryPlaceholder: '標籤過濾 例: 芙蘭朵露 || 二小姐',
  },
  mainView: {
    bookmarkTooltip: '{count} 個收藏',
    newProfilePage: {
      bookmarks: '收藏',
      contents: '作品',
      illustrations: '插畫',
      manga: '漫畫',
      noResult: '找不到作品',
      privateBookmark: '非公開',
      publicBookmark: '公開',
    },
  },
};

var i18n = new VueI18n({
  fallbackLocale: 'ja',
  locale: document.documentElement.lang.toLowerCase(),
  messages: {
    en,
    ja,
    'zh': zhCN,
    'zh-cn': zhCN,
    'zh-tw': zhTW,
  },
});

const DEFAULT_MATCH = true;

const isString = (s) => typeof(s) === 'string';
const isFunction = (s) => typeof(s) === 'function';
const isOrOp = (s) => s === ' || ';
const isAndOp = (s) => s === ' && ';
const isCondOp = (s) => isOrOp(s) || isAndOp(s);
const isGroupExpr = (s) => isString(s) && (/^{.*}$/).test(s);
const isPartialExclusionExpr = (s) => isString(s) && (/^-[^-].*$/).test(s);
const isPartialInclusionExpr = (s) => isString(s) && (/^[+]?.*$/).test(s);
const defaultFunc = () => DEFAULT_MATCH;

const isMatched = (ruleStr, targetStr) => {

  const rule = ruleStr.toLowerCase();
  const target = targetStr.toLowerCase();

  return makeRuleFunc(rule, target)();
};

const makeRuleFunc = (rule, target) => {
  if (isString(rule)) {
    // raw toks
    const rtoks = rule.trim().match(/(\{.*?\}| ([|]{2}|[&]{2}) |\S+)/g);
    if (!rtoks) {
      return defaultFunc;
    }

    const tokList = rtoks.map((rtok) => {
      if (isCondOp(rtok)) {
        return rtok;
      } else if (isGroupExpr(rtok)) {
        return makeRuleFunc(rtok.slice(1, -1), target);
      } else if (isPartialExclusionExpr(rtok)) {
        return () => !target.includes(rtok.slice(1));
      } else if (isPartialInclusionExpr(rtok)) {
        return () => target.includes(rtok.replace(/^[+]?(.*)$/, '$1'));
      } else {
        $print.log('tagMatcher#makeRuleFunc: Unknown rtok', rtok);
        return defaultFunc;
      }
    });

    return makeRuleFunc(tokList, target);
  } else {
    const ruleList = rule.map(r => (isString(r) && !isCondOp(r)) ? makeRuleFunc(r, target) : r);
    const funcList = ruleList.filter(isFunction);
    const opList = ruleList.filter(isCondOp);
    if (funcList.length + opList.length !== ruleList.length) {
      $print.log('tagMatcher#makeRuleFunc: Unknown ruleList', ruleList);
      return defaultFunc;
    }

    if (opList.every(isAndOp)) {
      // include opList.length === 0
      return () => funcList.every(fn => fn());
    } else if (opList.every(isOrOp)) {
      return () => funcList.some(fn => fn());
    } else {
      $print.log('tagMatcher#makeRuleFunc: Mixed condition operators without grouping', ruleList);
      return defaultFunc;
    }
  }
};

var tagFilterQuerier = {
  isMatched,
  makeRuleFunc,
};

const makeNewTag = (tag) => {
  if (tag.translation) {
    const trs = Object.values(tag.translation);
    return [tag.tag, ...trs].filter(Boolean).join('\x00');
  }
  return [tag.tag, tag.romaji].filter(Boolean).join('\x00');
};

const makeLibraryData = ({ illustDataGroup, userDataGroup }) => {
  if (!illustDataGroup || !Object.keys(illustDataGroup).length) {
    return [];
  }

  const library = [];

  for (const [illustId, illustData] of Object.entries(illustDataGroup)) {
    const allTags = illustData.tags.tags.map(makeNewTag).join('\x00');
    const d = {
      bookmarkCount: illustData.bookmarkCount,
      bookmarkId: '',
      illustId,
      illustPageCount: toInt(illustData.pageCount),
      illustTitle: illustData.illustTitle,
      isBookmarked: Boolean(illustData.bookmarkData),
      isFollowed: userDataGroup[illustData.userId].isFollowed,
      isManga: illustData.illustType === 1,
      isPrivateBookmark: false,
      isUgoira: illustData.illustType === 2,
      profileImg: userDataGroup[illustData.userId].image,
      tags: allTags,
      urls: {
        original: illustData.urls.original,
        thumb: illustData.urls.thumb,
      },
      userId: illustData.userId,
      userName: illustData.userName,
    };

    if (illustData.bookmarkData) {
      d.bookmarkId = illustData.bookmarkData.id;
      d.isPrivateBookmark = illustData.bookmarkData.private;
    }

    library.push(d);
  }

  return library;
};

const state = {
  batchSize: 40,
  defaultStatus: {
    isEnded: false,
    isPaused: true,
  },
  imageItemLibrary: [],
  moveWindowIndex: 0,
  moveWindowPrivateBookmarkIndex: 0,
  nextUrl: location.href,
  nppStatus: {
    isEnded: Array(NPP_TYPE_COUNT).fill(false),
    isPaused: true,
  },
  prefetchPool: {
    illusts: [],
    manga: [],
  },
};

const getters = {
  batchSize: (state) => state.batchSize,
  defaultDisplayIndices: (state, getters, rootState, rootGetters) => {
    const clonedLib = state.imageItemLibrary.slice();
    const { sp, filters, config, orderBy } = rootGetters;
    const dateOldFirst = sp.order === 'date';
    const bookmarkEarlyFirst = sp.order === 'asc';

    const isToShow = (d) => {
      return d.bookmarkCount >= filters.limit &&
        tagFilterQuerier.isMatched(filters.query, d.tags) &&
        !config.blacklist.includes(d.userId);
    };

    const shows = [], hides = [];
    for (const [i, d] of clonedLib.entries()) {
      const s = isToShow(d);
      const o = {
        index: i,
        [orderBy]: d[orderBy],
      };
      if (s) {
        shows.push(o);
      } else {
        hides.push(o);
      }
    }

    shows.sort((a, b) => {
      const av = toInt(a[orderBy]);
      const bv = toInt(b[orderBy]);
      const c = bv - av;
      switch (orderBy) {
      case 'illustId':
        return dateOldFirst ? -c : c;
      case 'bookmarkCount':
        return c;
      case 'bookmarkId':
        return bookmarkEarlyFirst ? -c : c;
      default:
        return 0;
      }
    });

    return {
      hides: hides.map(item => item.index),
      shows: shows.map(item => item.index),
    };
  },
  imageItemLibrary: (state) => state.imageItemLibrary,
  nppDisplayIndices: (state, getters, rootState, rootGetters) => {
    const clonedLib = state.imageItemLibrary.slice();
    const { filters, config, orderBy, sp } = rootGetters;
    const { nppType } = getters;
    const isToShow = (d) => {
      const conds = [
        d.bookmarkCount >= filters.limit,
        tagFilterQuerier.isMatched(filters.query, d.tags),
        !config.blacklist.includes(d.userId),
      ];

      switch (nppType) {
      case 0:
        conds.push(d.userId === sp.id);
        break;
      case 1:
        conds.push(d.userId === sp.id && !d.isManga);
        break;
      case 2:
        conds.push(d.userId === sp.id && d.isManga);
        break;
      case 3:
        conds.push(d.userId !== sp.id && !d.isPrivateBookmark);
        break;
      case 4:
        conds.push(d.userId !== sp.id && d.isPrivateBookmark);
        break;
      default:
        break;
      }

      return conds.every(Boolean);
    };

    const shows = [], hides = [];
    for (const [i, d] of clonedLib.entries()) {
      const s = isToShow(d);
      const o = {
        index: i,
        [orderBy]: d[orderBy],
      };
      if (s) {
        shows.push(o);
      } else {
        hides.push(o);
      }
    }

    shows.sort((a, b) => {
      const av = toInt(a[orderBy]);
      const bv = toInt(b[orderBy]);
      return bv - av;
    });

    return {
      hides: hides.map(item => item.index),
      shows: shows.map(item => item.index),
    };
  },
  nppType: (state, getters, rootState, rootGetters) => {
    const types = [
      MAIN_PAGE_TYPE.NEW_PROFILE,
      MAIN_PAGE_TYPE.NEW_PROFILE_ILLUST,
      MAIN_PAGE_TYPE.NEW_PROFILE_MANGA,
      MAIN_PAGE_TYPE.NEW_PROFILE_BOOKMARK,
    ];

    const loginId = rootGetters.loginData.id;
    const uid = rootGetters.sp.id;
    const rest = rootGetters.sp.rest;
    const mpt = rootGetters.MPT;
    const isSelfPrivateBookmarkPage = mpt === MAIN_PAGE_TYPE.NEW_PROFILE_BOOKMARK && loginId === uid && rest === 'hide';
    if (isSelfPrivateBookmarkPage) {
      return types.length; // after the last of type
    }
    return types.indexOf(mpt);
  },
  status: (state, getters) => {
    if (getters.nppType >= 0) {
      return {
        isEnded: state.nppStatus.isEnded[getters.nppType],
        isPaused: state.nppStatus.isPaused,
      };
    } else {
      return state.defaultStatus;
    }
  },
};

const mutations = {
  editImgItem: (state, payload = {}) => {
    const DEFAULT_OPT = {
      illustId: '',
      type: null,
      userId: '',
    };

    const opt = Object.assign({}, DEFAULT_OPT, payload);

    if (opt.type === 'follow-user' && opt.userId) {
      state.imageItemLibrary
        .filter(i => i.userId === opt.userId)
        .forEach(i => {
          i.isFollowed = true;
        });
    }
  },
  setStatus: (state, { nppType = -1, isPaused, isEnded }) => {
    if (nppType >= 0) {
      if (isPaused !== undefined) {
        state.nppStatus.isPaused = isPaused;
      }
      if (isEnded !== undefined) {
        state.nppStatus.isEnded[nppType] = isEnded;
      }
    } else {
      if (isPaused !== undefined) {
        state.defaultStatus.isPaused = isPaused;
      }
      if (isEnded !== undefined) {
        state.defaultStatus.isEnded = isEnded;
      }
    }
  },
};

const actions = {
  pause: ({ commit, getters }) => {
    commit('setStatus', { isPaused: true,  nppType: getters.nppType });
  },
  relive: ({ commit, getters }) => {
    commit('setStatus', { isEnded: false,  nppType: getters.nppType });
  },
  resume: ({ commit, getters }) => {
    commit('setStatus', { isPaused: false,  nppType: getters.nppType });
  },
  start: async({ state, dispatch, getters, rootGetters }, { times = Infinity, force = false, isFirst = false } = {}) => {
    await dispatch('resume');

    if (force) {
      await dispatch('relive');
    }

    if (getters.status.isEnded || times <= 0) {
      return;
    }

    if (getters.nppType >= 0 && isFirst) {
      const profile = await PixivAPI.getUserProfileData(rootGetters.sp.id);
      state.prefetchPool.illusts.push(...Object.keys(profile.illusts));
      state.prefetchPool.manga.push(...Object.keys(profile.manga));

      // from new → old
      state.prefetchPool.illusts.sort((i, j) => j - i);
      state.prefetchPool.manga.sort((i, j) => j - i);

      $print.debug('vuexMudule/pixiv#start: prefetchPool.illusts:', state.prefetchPool.illusts);
      $print.debug('vuexMudule/pixiv#start: prefetchPool.manga:', state.prefetchPool.manga);
    }

    $print.debug('vuexMudule/pixiv#start: MPT:', rootGetters.MPT);

    switch (rootGetters.MPT) {
    case MAIN_PAGE_TYPE.SEARCH:
    case MAIN_PAGE_TYPE.FOLLOWED_NEWS:
    case MAIN_PAGE_TYPE.ANCIENT_FOLLOWED_NEWS:
    case MAIN_PAGE_TYPE.SELF_BOOKMARK:
      await dispatch('startNextUrlBased', { times });
      break;
    case MAIN_PAGE_TYPE.NEW_PROFILE:
      await dispatch('startPrefetchBased', { pool: 'all', times  });
      break;
    case MAIN_PAGE_TYPE.NEW_PROFILE_ILLUST:
      await dispatch('startPrefetchBased', { pool: 'illusts', times });
      break;
    case MAIN_PAGE_TYPE.NEW_PROFILE_MANGA:

      await dispatch('startPrefetchBased', { pool: 'manga', times });
      break;
    case MAIN_PAGE_TYPE.NEW_PROFILE_BOOKMARK:
      await dispatch('startMovingWindowBased', { times });
      break;
    default:
      $print.error('Unknown main page type', rootGetters.MPT);
      break;
    }
  },
  startMovingWindowBased: async({ state, dispatch, getters, rootGetters }, { times = Infinity, rest = null } = {}) => {
    while (!getters.status.isPaused && !getters.status.isEnded && times) {
      let illustIds = [], maxTotal = Infinity;
      const _rest = rest || rootGetters.sp.rest;
      const _uid = rootGetters.sp.id;
      let cIndex = (_rest === 'show') ? state.moveWindowIndex : state.moveWindowPrivateBookmarkIndex;
      if (getters.nppType >= 0) {
        const opt = { limit: getters.batchSize, offset: cIndex, rest: _rest };
        const { works, total } = await PixivAPI.getUserBookmarkData(_uid, opt);
        $print.debug('vuexMudule/pixiv#startMovingWindowBased: works:', works);
        if (!works) {
          await dispatch('stop');
          break;
        }
        maxTotal = total;
        illustIds.push(...works.map((d) => d.id));
      }

      cIndex += getters.batchSize;

      if (getters.nppType >= 0 && _rest === 'hide') {
        state.moveWindowPrivateBookmarkIndex = cIndex;
      } else {
        state.moveWindowIndex = cIndex;
      }

      const illustDataGroup = await PixivAPI.getIllustDataGroup(illustIds);
      $print.debug('vuexMudule/pixiv#startMovingWindowBased: illustDataGroup:', illustDataGroup);

      const userIds = Object.values(illustDataGroup).map(d => d.userId);
      const userDataGroup = await PixivAPI.getUserDataGroup(userIds);
      $print.debug('vuexMudule/pixiv#startMovingWindowBased: userDataGroup:', userDataGroup);

      const libraryData = makeLibraryData({
        illustDataGroup,
        userDataGroup,
      });

      // prevent duplicate illustId
      for (const d of libraryData) {
        if (!state.imageItemLibrary.find(x => x.illustId === d.illustId)) {
          state.imageItemLibrary.push(d);
        }
      }

      times -= 1;

      if (!times) {
        await dispatch('pause');
      }

      if (cIndex > maxTotal) {
        await dispatch('stop');
      }
    }
  },
  startNextUrlBased: async({ state, dispatch, getters, rootGetters }, { times = Infinity } = {}) => {
    while (!getters.status.isPaused && !getters.status.isEnded && times) {
      let page = null;

      if ([MAIN_PAGE_TYPE.SEARCH, MAIN_PAGE_TYPE.FOLLOWED_NEWS].includes(rootGetters.MPT)) {
        page = await PixivAPI.getIllustIdsInPageHTML(state.nextUrl);
      } else {
        page = await PixivAPI.getIllustIdsInLegacyPageHTML(state.nextUrl);
      }
      $print.debug('vuexMudule/pixiv#startNextUrlBased: page:', page);

      state.nextUrl = page.nextUrl;

      const illustDataGroup = await PixivAPI.getIllustDataGroup(page.illustIds);
      $print.debug('vuexMudule/pixiv#startNextUrlBased: illustDataGroup:', illustDataGroup);

      const userIds = Object.values(illustDataGroup).map(d => d.userId);
      const userDataGroup = await PixivAPI.getUserDataGroup(userIds);
      $print.debug('vuexMudule/pixiv#startNextUrlBased: userDataGroup:', userDataGroup);

      const libraryData = makeLibraryData({
        illustDataGroup,
        userDataGroup,
      });

      // prevent duplicate illustId
      for (const d of libraryData) {
        if (!state.imageItemLibrary.find(x => x.illustId === d.illustId)) {
          state.imageItemLibrary.push(d);
        }
      }

      times -= 1;

      if (!times) {
        await dispatch('pause');
      }

      if (!state.nextUrl) {
        await dispatch('stop');
      }
    }
  },
  startPrefetchBased: async({ state, dispatch, getters }, { times = Infinity, pool = 'all' } = {}) => {
    const pPool = state.prefetchPool;
    let todoPool = [];
    if (pool === 'all') {
      todoPool.push(...pPool.illusts);
      todoPool.push(...pPool.manga);
    } else {
      todoPool.push(...pPool[pool]);
    }
    $print.debug('vuexMudule/pixiv#startPrefetchBased: todoPool:', todoPool);

    while (!getters.status.isPaused && !getters.status.isEnded && times) {
      if (!todoPool.length) {
        await dispatch('stop');
      }

      const illustIds = todoPool.splice(0, getters.batchSize);

      if (pool === 'all') {
        illustIds.forEach((id) => {
          const ii = pPool.illusts.indexOf(id);
          if (ii >= 0) {
            pPool.illusts.splice(ii, 1);
          }
          const mi = pPool.manga.indexOf(id);
          if (mi >= 0) {
            pPool.manga.splice(mi, 1);
          }
        });
      }

      const illustDataGroup = await PixivAPI.getIllustDataGroup(illustIds);
      $print.debug('vuexMudule/pixiv#startPrefetchBased: illustDataGroup:', illustDataGroup);

      const userIds = Object.values(illustDataGroup).map(d => d.userId);
      const userDataGroup = await PixivAPI.getUserDataGroup(userIds);
      $print.debug('vuexMudule/pixiv#startPrefetchBased: userDataGroup:', userDataGroup);

      const libraryData = makeLibraryData({
        illustDataGroup,
        userDataGroup,
      });

      // prevent duplicate illustId
      for (const d of libraryData) {
        if (!state.imageItemLibrary.find(x => x.illustId === d.illustId)) {
          state.imageItemLibrary.push(d);
        }
      }

      times -= 1;

      if (!times) {
        await dispatch('pause');
      }

      if (!todoPool.length) {
        await dispatch('stop');
      }
    }
  },
  stop: ({ commit, getters }) => {
    commit('setStatus', { isEnded: true, isPaused: true,  nppType: getters.nppType });
  },
};

var pixiv = {
  actions,
  getters,
  mutations,
  namespaced: true,
  state,
};

const state$1 = {
  active: false,
  data: null,
  position: { x: -1e7, y: -1e7 },
};

const getters$1 = {
  active: (state) => state.active,
  data: (state) => state.data,
  pos: (state) => state.position,
};

const mutations$1 =  {
  activate: (state, payload) => {
    state.active = true;
    state.position = payload.position;
    state.data = payload.data;
  },
  deactivate: (state) => {
    state.active = false;
    state.position = { x: -1e7, y: -1e7 };
  },
};

var contextMenu = {
  getters: getters$1,
  mutations: mutations$1,
  namespaced: true,
  state: state$1,
};

const state$2 = {
  data: null,
  mode: null,
};

const mutations$2 = {
  close: (state) => {
    state.mode = null;
  },
  open: (state, payload) => {
    Object.assign(state, payload);
  },
};

const getters$2 = {
  data: (state) => state.data,
  mode: (state) => state.mode,
};

var coverLayer = {
  getters: getters$2,
  mutations: mutations$2,
  namespaced: true,
  state: state$2,
};

Vue.use(Vuex);

const _isSelfBookmarkPage = (mpt, loginId, uid) => {
  return (
    mpt === MAIN_PAGE_TYPE.SELF_BOOKMARK ||
    (mpt === MAIN_PAGE_TYPE.NEW_PROFILE_BOOKMARK &&
      loginId === uid)
  );
};

const _getSearchParam = () => {
  const s = new URLSearchParams(location.search);
  const ret = {};
  [...s.entries()].reduce((collect, [k, v]) => {
    collect[k] = v;
    return collect;
  }, ret);
  return ret;
};

const modules = { contextMenu, coverLayer, pixiv };

const state$3 = {
  NAME: GM_info.script.name,
  VERSION: GM_info.script.version,
  config: {
    blacklist: [],
    contextMenu: 1,
    fitwidth: 1,
    hoverPlay: 1,
    sort: SORT_TYPE.ILLUST_ID,
    userTooltip: 1,
  },
  ctrlPanelOffsetY: 0,
  filters: {
    limit: 0,
    query: '',
  },
  locale: document.documentElement.lang.toLowerCase(),
  loginData: null,
  mainPageType: MAIN_PAGE_TYPE.NO_SUPPORT,
  mountPointCoverLayer: null,
  mountPointCtrlPanel: null,
  mountPointMainView: null,
  searchParam: {},
};

const getters$3 = {
  MPT: (state) => state.mainPageType,
  config: (state) => state.config,
  ctrlPanelOffsetY: (state) => state.ctrlPanelOffsetY,
  filters: (state) => state.filters,
  isSelfBookmarkPage: (state) => _isSelfBookmarkPage(state.mainPageType, state.loginData.id, state.searchParam.id),
  locale: (state) => state.locale,
  loginData: (state) => state.loginData,
  mountPointCoverLayer: (state) => state.mountPointCoverLayer,
  mountPointCtrlPanel: (state) => state.mountPointCtrlPanel,
  mountPointMainView: (state) => state.mountPointMainView,
  orderBy: (state) => {
    switch (state.config.sort) {
    case SORT_TYPE.ILLUST_ID:
      return 'illustId';
    case SORT_TYPE.BOOKMARK_ID:
      return 'bookmarkId';
    case SORT_TYPE.BOOKMARK_COUNT:
      return 'bookmarkCount';
    default:
      $print.error('VuexStore#getters.orderBy:', state.config.sort);
      return 'illustId';
    }
  },
  sp: (state) => state.searchParam,
};

const mutations$3 = {
  afterInit: (state) => {
    if (state.mainPageType === MAIN_PAGE_TYPE.SELF_BOOKMARK) {
      for (const marker of $$('.js-legacy-mark-all, .js-legacy-unmark-all')) {
        marker.addEventListener('click', () => {
          $$('input[name="book_id[]"]').forEach(el => {
            el.checked = marker.classList.contains('js-legacy-mark-all');
          });
        });
      }
    }
    const _sbp = _isSelfBookmarkPage(state.mainPageType, state.loginData.id, state.searchParam.id);
    if (!_sbp && state.config.sort === SORT_TYPE.BOOKMARK_ID) {
      state.config.sort = SORT_TYPE.ILLUST_ID;
    }
  },
  applyConfig: (state) => {
    if (state.mainPageType !== MAIN_PAGE_TYPE.NO_SUPPORT) {
      if (state.config.fitwidth) {
        $$('.ω').forEach(el => el.classList.add('↔'));
      } else {
        $$('.ω').forEach(el => el.classList.remove('↔'));
      }
    }
  },
  loadConfig: (state) => {
    const config = JSON.parse(localStorage.getItem(state.NAME) || '{}');
    Object.assign(state.config, config);
  },
  saveConfig: (state) => {
    const storable = JSON.stringify(state.config);
    localStorage.setItem(state.NAME, storable);
  },
  setConfig: (state, payload) => {
    Object.assign(state.config, payload);
  },
  setFilters: (state, payload) => {
    Object.assign(state.filters, payload);
  },
  setMainPageType: (state, payload = {}) => {
    if (payload.forceSet) {
      $print.debug('vuexStore#setMainPageType: payload:', payload);
      state.mainPageType = payload.forceSet;

      const _sbp = _isSelfBookmarkPage(state.mainPageType, state.loginData.id, state.searchParam.id);
      if (!_sbp && state.config.sort === SORT_TYPE.BOOKMARK_ID) {
        state.config.sort = SORT_TYPE.ILLUST_ID;
      }
      return;
    }

    const path = location.pathname;

    const _id = state.searchParam.id;
    const _type = state.searchParam.type;
    const _mode = state.searchParam.mode;
    const _rest = state.searchParam.rest;

    switch (path) {
    case '/search.php':
      state.mainPageType = MAIN_PAGE_TYPE.SEARCH;
      break;
    case '/bookmark_new_illust_r18.php':
    case '/bookmark_new_illust.php':
      state.mainPageType = MAIN_PAGE_TYPE.FOLLOWED_NEWS;
      break;
    case '/new_illust.php':
    case '/mypixiv_new_illust.php':
    case '/new_illust_r18.php':
      state.mainPageType = MAIN_PAGE_TYPE.ANCIENT_FOLLOWED_NEWS;
      break;
    case '/member.php':
      state.mainPageType = MAIN_PAGE_TYPE.NEW_PROFILE;
      break;
    case '/member_illust.php':
      if (_mode) {
        state.mainPageType = MAIN_PAGE_TYPE.NO_SUPPORT;
        break;
      }

      if (_type === 'manga') {
        state.mainPageType = MAIN_PAGE_TYPE.NEW_PROFILE_MANGA; // pool = manga
      } else if (_type === 'illust') {
        state.mainPageType = MAIN_PAGE_TYPE.NEW_PROFILE_ILLUST; // pool = illusts
      } else { // !_type
        state.mainPageType = MAIN_PAGE_TYPE.NEW_PROFILE; // pool = all (illusts + manga)
      }
      break;
    case '/bookmark.php': {
      if (_rest && _id) {
        // ?id={userId}&rest=show
        // ?id={userId}&rest=hide
        state.mainPageType =  MAIN_PAGE_TYPE.NEW_PROFILE_BOOKMARK;
      } else if (_type === 'user' || _type === 'reg_user') {
        // ?id={userId}&type=user
        // ?id={userId}&type=reg_user
        state.mainPageType = MAIN_PAGE_TYPE.NO_SUPPORT;
      } else {
        // ?
        // ?untagged=1
        // ?type=illust_all
        state.mainPageType = MAIN_PAGE_TYPE.SELF_BOOKMARK;
      }
      break;
    }
    default:
      state.mainPageType = MAIN_PAGE_TYPE.NO_SUPPORT;
      break;
    }

    const _sbp = _isSelfBookmarkPage(state.mainPageType, state.loginData.id, state.searchParam.id);
    if (!_sbp && state.config.sort === SORT_TYPE.BOOKMARK_ID) {
      state.config.sort = SORT_TYPE.ILLUST_ID;
    }
  },
  updateSearchParam: (state) => {
    state.searchParam = _getSearchParam();
  },
};

const actions$1 = {
  init: async({ state, commit, dispatch }) => {
    // init loginData
    if (window.globalInitData && window.globalInitData.userData) {
      const u = window.globalInitData.userData;
      state.loginData = { id: u.id };
    } else if (window.pixiv && window.pixiv.user) {
      const u = window.pixiv.user;
      state.loginData = { id: u.id };
    } else {
      throw new InitError('The page has no any login user data.');
    }

    commit('updateSearchParam');

    // determine mainPageType
    commit('setMainPageType');

    commit('loadConfig');

    // set mount points by mainPageType
    await dispatch('setMountPoints');

    // others
    commit('afterInit');
    commit('applyConfig');
    commit('saveConfig');
  },
  setMountPoints: async({ state, getters }) => {
    const mpt = state.mainPageType;
    if (mpt !== MAIN_PAGE_TYPE.NO_SUPPORT) {

      $$('#wrapper').forEach(el => el.classList.add('ω'));

      state.mountPointCoverLayer = $el('div', null, (el) => {
        document.body.appendChild(el);
      });

      state.mountPointCtrlPanel = $el('div', null, async(el) => {
        if (getters['pixiv/nppType'] >= 0) {
          await $ready(() => $('.sLHPYEz'));
          $after($('.sLHPYEz').parentNode, el);
        } else {
          $after($('header._global-header'), el);
        }
        state.ctrlPanelOffsetY = el.getBoundingClientRect().y;
      });

      switch (mpt) {
      case MAIN_PAGE_TYPE.SEARCH:
        state.mountPointMainView = $('#js-react-search-mid');
        break;
      case MAIN_PAGE_TYPE.FOLLOWED_NEWS:
        state.mountPointMainView = $('#js-mount-point-latest-following');
        break;
      case MAIN_PAGE_TYPE.ANCIENT_FOLLOWED_NEWS:
        state.mountPointMainView = $('ul._image-items');
        break;
      case MAIN_PAGE_TYPE.NEW_PROFILE:
      case MAIN_PAGE_TYPE.NEW_PROFILE_BOOKMARK:
      case MAIN_PAGE_TYPE.NEW_PROFILE_ILLUST:
      case MAIN_PAGE_TYPE.NEW_PROFILE_MANGA:
        await $ready(() => $('.g4R-bsH'));
        state.mountPointMainView = $('.g4R-bsH');
        break;
      case MAIN_PAGE_TYPE.SELF_BOOKMARK:
        state.mountPointMainView = $('.display_editable_works');
        break;
      default:
        break;
      }
    }
  },
};

var vuexStore = new Vuex.Store({
  actions: actions$1,
  getters: getters$3,
  modules,
  mutations: mutations$3,
  state: state$3,
});

//
var script = {
  props: {
    id: {
      default: '',
      type: String,
    },
  },
  // eslint-disable-next-line sort-keys
  data() {
    return {
      debounceId4sortInput: null,
      debounceId4tagsFilter: null,
      sortingOrderSwitchOn: false,
      usualList: [100, 500, 1000, 3000, 5000, 10000],
      usualSwitchOn: false,
    };
  },
  // eslint-disable-next-line sort-keys
  computed: {
    buttonMsg() {
      if (this.status.isEnded) {
        return this.$t('ctrlPanel.buttonEnd');
      } else if (this.status.isPaused) {
        return this.$t('ctrlPanel.buttonGo');
      } else {
        return this.$t('ctrlPanel.buttonPause');
      }
    },
    filters() {
      return this.$store.getters.filters;
    },
    isSelfBookmarkPage() {
      return this.$store.getters.isSelfBookmarkPage;
    },
    processedCount() {
      return this.$store.getters['pixiv/imageItemLibrary'].length;
    },
    sortingOrderMsg() {
      switch (this.xc.sort) {
      case SORT_TYPE.BOOKMARK_COUNT:
        return this.$t('ctrlPanel.sortByPopularity');
      case SORT_TYPE.ILLUST_ID:
        return this.$t('ctrlPanel.sortByDate');
      default:
        //ST.BOOKMARK_ID
        return this.$t('ctrlPanel.sortByBookmarkId');
      }
    },
    status() {
      return this.$store.getters['pixiv/status'];
    },
    statusClass() {
      const _s = this.status;
      return {
        end: _s.isEnded,
        go: _s.isPaused && !_s.isEnded,
        paused: !_s.isPaused && !_s.isEnded,
      };
    },
    xc() {
      return this.$store.getters.config;
    },
  },
  methods: {
    clickMainButton() {
      if (this.status.isPaused) {
        this.$store.dispatch('pixiv/start');
      } else {
        this.$store.dispatch('pixiv/pause');
      }
    },
    clickSortingOrder(event) {
      $print.debug('Koakuma#clickSortingOrder: event', event);

      const ct = event.currentTarget;
      switch (ct.id) {
      case 'koakuma-sorting-order-by-popularity':
        this.$store.commit('setConfig', { sort: SORT_TYPE.BOOKMARK_COUNT });
        break;
      case 'koakuma-sorting-order-by-bookmark-id':
        this.$store.commit('setConfig', { sort: SORT_TYPE.BOOKMARK_ID });
        break;
      default:
        this.$store.commit('setConfig', { sort: SORT_TYPE.ILLUST_ID });
        break;
      }

      this.$store.commit('saveConfig');
      this.$store.commit('applyConfig');

      this.sortingOrderSwitchOn = false;
    },
    clickUsual(event) {
      this.$store.commit('setFilters', {
        limit: toInt(event.currentTarget.textContent),
      });
      this.usualSwitchOn = false;
    },
    openCoverLayerInConfigMode() {
      this.$store.commit('coverLayer/open', { data: null, mode: 'config' });
    },
    optionsChange(event) {
      $print.debug('Koakuma#optionsChange: event', event);
      if (event.target.id === 'koakuma-options-width-compress') {
        this.$store.commit('setConfig', { fitwidth: false });
      } else if (event.target.id === 'koakuma-options-width-expand') {
        this.$store.commit('setConfig', { fitwidth: true });
      }
      this.$store.commit('saveConfig');
      this.$store.commit('applyConfig');
    },
    sortInputInput(event) {
      if (this.debounceId4sortInput) {
        clearTimeout(this.debounceId4sortInput);
      }
      this.debounceId4sortInput = setTimeout(() => {
        this.debounceId4sortInput = null;
        this.$store.commit('setFilters', {
          limit: Math.max(0, toInt(event.target.value)),
        });
      }, 500);
    },
    sortInputWheel(event) {
      if (event.deltaY < 0) {
        this.$store.commit('setFilters', {
          limit: toInt(event.target.value) + 20,
        });
      } else {
        this.$store.commit('setFilters', {
          limit: Math.max(0, toInt(event.target.value) - 20),
        });
      }
    },
    tagsFilterInput(event) {
      if (this.debounceId4tagsFilter) {
        clearTimeout(this.debounceId4tagsFilter);
      }
      this.debounceId4tagsFilter = setTimeout(() => {
        this.debounceId4tagsFilter = null;
        this.$store.commit('setFilters', {
          query: event.target.value,
        });
      }, 1500);
    },
  },
};

/* script */
            const __vue_script__ = script;
            
/* template */
var __vue_render__ = function() {
  var _vm = this;
  var _h = _vm.$createElement;
  var _c = _vm._self._c || _h;
  return _c("div", { ref: _vm.id, attrs: { id: _vm.id } }, [
    _c("div", { staticClass: "processed" }, [
      _vm._v(
        _vm._s(_vm.$t("ctrlPanel.processed", { count: _vm.processedCount }))
      )
    ]),
    _vm._v(" "),
    _c("div", { attrs: { id: "koakuma-bookmark-sort-block" } }, [
      _c(
        "label",
        {
          attrs: {
            id: "koakuma-bookmark-sort-label",
            for: "koakuma-bookmark-sort-input"
          }
        },
        [
          _c("span", [_vm._v("❤️")]),
          _vm._v(" "),
          _c("input", {
            attrs: {
              id: "koakuma-bookmark-sort-input",
              type: "number",
              min: "0",
              step: "1"
            },
            domProps: { value: _vm.filters.limit },
            on: {
              wheel: function($event) {
                $event.stopPropagation();
                $event.preventDefault();
                return _vm.sortInputWheel($event)
              },
              input: _vm.sortInputInput
            }
          })
        ]
      ),
      _vm._v(" "),
      _c(
        "a",
        {
          attrs: { id: "koakuma-bookmark-input-usual-switch", role: "button" },
          on: {
            click: function($event) {
              if (
                !("button" in $event) &&
                _vm._k($event.keyCode, "left", 37, $event.key, [
                  "Left",
                  "ArrowLeft"
                ])
              ) {
                return null
              }
              if ("button" in $event && $event.button !== 0) {
                return null
              }
              _vm.usualSwitchOn = !_vm.usualSwitchOn;
            }
          }
        },
        [_c("i", { staticClass: "fas fa-angle-down" })]
      ),
      _vm._v(" "),
      _c(
        "ul",
        {
          directives: [
            {
              name: "show",
              rawName: "v-show",
              value: _vm.usualSwitchOn,
              expression: "usualSwitchOn"
            }
          ],
          attrs: { id: "koakuma-bookmark-input-usual-list" }
        },
        _vm._l(_vm.usualList, function(usual) {
          return _c("li", { key: usual }, [
            _c("span", { staticClass: "sort-order-apply-indicator" }, [
              _vm._v("⮬")
            ]),
            _vm._v(" "),
            _c(
              "a",
              {
                staticClass: "usual-list-link",
                attrs: { role: "button" },
                on: {
                  click: function($event) {
                    if (
                      !("button" in $event) &&
                      _vm._k($event.keyCode, "left", 37, $event.key, [
                        "Left",
                        "ArrowLeft"
                      ])
                    ) {
                      return null
                    }
                    if ("button" in $event && $event.button !== 0) {
                      return null
                    }
                    return _vm.clickUsual($event)
                  }
                }
              },
              [_vm._v(_vm._s(usual))]
            )
          ])
        })
      )
    ]),
    _vm._v(" "),
    _c("div", [
      _c("input", {
        attrs: {
          id: "koakuma-bookmark-tags-filter-input",
          placeholder: _vm.$t("ctrlPanel.tagFilterQueryPlaceholder"),
          type: "text"
        },
        on: { input: _vm.tagsFilterInput }
      })
    ]),
    _vm._v(" "),
    _c("div", [
      _c(
        "button",
        {
          class: _vm.statusClass,
          attrs: { id: "koakuma-main-button", disabled: _vm.status.isEnded },
          on: {
            mouseup: function($event) {
              if (
                !("button" in $event) &&
                _vm._k($event.keyCode, "left", 37, $event.key, [
                  "Left",
                  "ArrowLeft"
                ])
              ) {
                return null
              }
              if ("button" in $event && $event.button !== 0) {
                return null
              }
              return _vm.clickMainButton($event)
            }
          }
        },
        [_vm._v("\n      " + _vm._s(_vm.buttonMsg) + "\n    ")]
      )
    ]),
    _vm._v(" "),
    _c("div", { attrs: { id: "koakuma-sorting-order-block" } }, [
      _c(
        "a",
        {
          attrs: { id: "koakuma-sorting-order-select-switch", role: "button" },
          on: {
            click: function($event) {
              if (
                !("button" in $event) &&
                _vm._k($event.keyCode, "left", 37, $event.key, [
                  "Left",
                  "ArrowLeft"
                ])
              ) {
                return null
              }
              if ("button" in $event && $event.button !== 0) {
                return null
              }
              _vm.sortingOrderSwitchOn = !_vm.sortingOrderSwitchOn;
            }
          }
        },
        [
          _c("output", {
            attrs: { id: "koakuma-sorting-order-select-output" },
            domProps: { innerHTML: _vm._s(_vm.sortingOrderMsg) }
          }),
          _vm._v(" "),
          _c("i", { staticClass: "fas fa-angle-down" })
        ]
      ),
      _vm._v(" "),
      _c(
        "ul",
        {
          directives: [
            {
              name: "show",
              rawName: "v-show",
              value: _vm.sortingOrderSwitchOn,
              expression: "sortingOrderSwitchOn"
            }
          ],
          attrs: { id: "koakuma-sorting-order-select-list" }
        },
        [
          _c("li", [
            _c("span", { staticClass: "sort-order-apply-indicator" }, [
              _vm._v("⮬")
            ]),
            _vm._v(" "),
            _c(
              "a",
              {
                staticClass: "sorting-order-link",
                attrs: {
                  id: "koakuma-sorting-order-by-popularity",
                  role: "button"
                },
                on: {
                  click: function($event) {
                    if (
                      !("button" in $event) &&
                      _vm._k($event.keyCode, "left", 37, $event.key, [
                        "Left",
                        "ArrowLeft"
                      ])
                    ) {
                      return null
                    }
                    if ("button" in $event && $event.button !== 0) {
                      return null
                    }
                    return _vm.clickSortingOrder($event)
                  }
                }
              },
              [_vm._v(_vm._s(_vm.$t("ctrlPanel.sortByPopularity")))]
            )
          ]),
          _vm._v(" "),
          _c("li", [
            _c("span", { staticClass: "sort-order-apply-indicator" }, [
              _vm._v("⮬")
            ]),
            _vm._v(" "),
            _c(
              "a",
              {
                staticClass: "sorting-order-link",
                attrs: { id: "koakuma-sorting-order-by-date", role: "button" },
                on: {
                  click: function($event) {
                    if (
                      !("button" in $event) &&
                      _vm._k($event.keyCode, "left", 37, $event.key, [
                        "Left",
                        "ArrowLeft"
                      ])
                    ) {
                      return null
                    }
                    if ("button" in $event && $event.button !== 0) {
                      return null
                    }
                    return _vm.clickSortingOrder($event)
                  }
                }
              },
              [_vm._v(_vm._s(_vm.$t("ctrlPanel.sortByDate")))]
            )
          ]),
          _vm._v(" "),
          _c(
            "li",
            {
              directives: [
                {
                  name: "show",
                  rawName: "v-show",
                  value: _vm.isSelfBookmarkPage,
                  expression: "isSelfBookmarkPage"
                }
              ]
            },
            [
              _c("span", { staticClass: "sort-order-apply-indicator" }, [
                _vm._v("⮬")
              ]),
              _vm._v(" "),
              _c(
                "a",
                {
                  staticClass: "sorting-order-link",
                  attrs: {
                    id: "koakuma-sorting-order-by-bookmark-id",
                    role: "button"
                  },
                  on: {
                    click: function($event) {
                      if (
                        !("button" in $event) &&
                        _vm._k($event.keyCode, "left", 37, $event.key, [
                          "Left",
                          "ArrowLeft"
                        ])
                      ) {
                        return null
                      }
                      if ("button" in $event && $event.button !== 0) {
                        return null
                      }
                      return _vm.clickSortingOrder($event)
                    }
                  }
                },
                [_vm._v(_vm._s(_vm.$t("ctrlPanel.sortByBookmarkId")))]
              )
            ]
          )
        ]
      )
    ]),
    _vm._v(" "),
    _c("div", { attrs: { id: "koakuma-options-block" } }, [
      _c("div", [
        _c("i", {
          directives: [
            {
              name: "show",
              rawName: "v-show",
              value: _vm.xc.fitwidth,
              expression: "xc.fitwidth"
            }
          ],
          staticClass: "fas fa-compress",
          attrs: { id: "koakuma-options-width-compress" },
          on: {
            click: function($event) {
              if (
                !("button" in $event) &&
                _vm._k($event.keyCode, "left", 37, $event.key, [
                  "Left",
                  "ArrowLeft"
                ])
              ) {
                return null
              }
              if ("button" in $event && $event.button !== 0) {
                return null
              }
              return _vm.optionsChange($event)
            }
          }
        }),
        _vm._v(" "),
        _c("i", {
          directives: [
            {
              name: "show",
              rawName: "v-show",
              value: !_vm.xc.fitwidth,
              expression: "!xc.fitwidth"
            }
          ],
          staticClass: "fas fa-expand",
          attrs: { id: "koakuma-options-width-expand" },
          on: {
            click: function($event) {
              if (
                !("button" in $event) &&
                _vm._k($event.keyCode, "left", 37, $event.key, [
                  "Left",
                  "ArrowLeft"
                ])
              ) {
                return null
              }
              if ("button" in $event && $event.button !== 0) {
                return null
              }
              return _vm.optionsChange($event)
            }
          }
        })
      ]),
      _vm._v(" "),
      _c("div", [
        _c("i", {
          staticClass: "fas fa-cog",
          attrs: { id: "koakuma-options-config" },
          on: {
            click: function($event) {
              if (
                !("button" in $event) &&
                _vm._k($event.keyCode, "left", 37, $event.key, [
                  "Left",
                  "ArrowLeft"
                ])
              ) {
                return null
              }
              if ("button" in $event && $event.button !== 0) {
                return null
              }
              return _vm.openCoverLayerInConfigMode($event)
            }
          }
        })
      ])
    ])
  ])
};
var __vue_staticRenderFns__ = [];
__vue_render__._withStripped = true;

  /* style */
  const __vue_inject_styles__ = function (inject) {
    if (!inject) return
    inject("data-v-a935f598_0", { source: "\na[data-v-a935f598] {\n  color: #258fb8;\n  text-decoration: none;\n}\na[role=\"button\"] > .fa-angle-down[data-v-a935f598] {\n  padding: 2px;\n}\n#Koakuma[data-v-a935f598] {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  position: sticky;\n  top: 0;\n  z-index: 3;\n  background-color: #eef;\n  box-shadow: 0 1px 1px #777;\n  padding: 4px;\n  color: #00186c;\n  font-size: 16px;\n}\n#Koakuma > div[data-v-a935f598] {\n  margin: 0 10px;\n  display: inline-flex;\n}\n#koakuma-bookmark-sort-label[data-v-a935f598] {\n  display: inline-flex !important;\n  align-items: center;\n  margin-right: 0;\n  border-radius: 3px 0 0 3px;\n  background-color: #cef;\n  color: rgb(0, 105, 177);\n  margin: 0 1px;\n  padding: 0 6px;\n}\n#koakuma-bookmark-sort-block[data-v-a935f598],\n#koakuma-sorting-order-block[data-v-a935f598] {\n  position: relative;\n  box-shadow: 0 0 1px #069;\n  border-radius: 4px;\n}\n#koakuma-sorting-order-block[data-v-a935f598] {\n  background-color: #cef;\n}\n#koakuma-bookmark-sort-input[data-v-a935f598] {\n  -moz-appearance: textfield;\n  border: none;\n  background-color: transparent;\n  padding: 0;\n  color: inherit;\n  font-size: 16px;\n  display: inline-block;\n  cursor: ns-resize;\n  text-align: center;\n  max-width: 50px;\n}\n#koakuma-bookmark-sort-input[data-v-a935f598]::-webkit-inner-spin-button,\n#koakuma-bookmark-sort-input[data-v-a935f598]::-webkit-outer-spin-button {\n  /* https://css-tricks.com/numeric-inputs-a-comparison-of-browser-defaults/ */\n  -webkit-appearance: none;\n  margin: 0;\n}\n#koakuma-bookmark-tags-filter-input[data-v-a935f598] {\n  margin: 0;\n  padding: 0 4px;\n  color: #333;\n  font-size: 12px;\n  border: 1px solid #becad7;\n  height: 20px;\n  min-width: 300px;\n}\n#koakuma-bookmark-tags-filter-input[data-v-a935f598]:focus {\n  background: #ffffcc;\n  outline: none;\n}\n#koakuma-bookmark-input-usual-switch[data-v-a935f598],\n#koakuma-sorting-order-select-switch[data-v-a935f598] {\n  background-color: #cef;\n  padding: 1px;\n  border-left: 1px solid #888;\n  border-radius: 0 3px 3px 0;\n  cursor: pointer;\n  display: inline-flex;\n  align-items: center;\n}\n#koakuma-sorting-order-select-switch[data-v-a935f598] {\n  border: none;\n  border-radius: 3px;\n}\n#koakuma-bookmark-input-usual-list[data-v-a935f598],\n#koakuma-sorting-order-select-list[data-v-a935f598] {\n  border-radius: 3px;\n  background-color: #cef;\n  box-shadow: 0 0 2px #069;\n  position: absolute;\n  top: 100%;\n  width: 100%;\n  margin-top: 1px;\n  list-style: none;\n  padding: 0;\n}\n#koakuma-sorting-order-select-list[data-v-a935f598] {\n  display: grid;\n  grid-auto-columns: max-content;\n  width: initial;\n}\n#koakuma-bookmark-input-usual-list > li[data-v-a935f598],\n#koakuma-sorting-order-select-list > li[data-v-a935f598] {\n  display: flex;\n  position: relative;\n  line-height: 24px;\n}\n#koakuma-bookmark-input-usual-list > li[data-v-a935f598]::after,\n#koakuma-sorting-order-select-list > li[data-v-a935f598]::after {\n  content: \"\";\n  box-shadow: 0 0 0 1px #89d8ff;\n  display: inline-block;\n  margin: 0;\n  height: 0;\n  line-height: 0;\n  font-size: 0;\n  position: absolute;\n  left: 0;\n  right: 0;\n  width: 100%;\n  transform: scaleX(0.8);\n}\n#koakuma-bookmark-input-usual-list > li[data-v-a935f598]:first-child::after,\n#koakuma-sorting-order-select-list > li[data-v-a935f598]:first-child::after {\n  box-shadow: none;\n}\n#koakuma-bookmark-input-usual-list .sort-order-apply-indicator[data-v-a935f598],\n#koakuma-sorting-order-select-list .sort-order-apply-indicator[data-v-a935f598] {\n  visibility: hidden;\n}\n#koakuma-bookmark-input-usual-list .sort-order-apply-indicator[data-v-a935f598] {\n  position: absolute;\n}\n#koakuma-bookmark-input-usual-list > li:hover .sort-order-apply-indicator[data-v-a935f598],\n#koakuma-sorting-order-select-list > li:hover .sort-order-apply-indicator[data-v-a935f598] {\n  visibility: visible;\n}\n.sort-order-apply-indicator[data-v-a935f598] {\n  display: block;\n  justify-content: center;\n  align-items: center;\n  font-weight: bolder;\n  padding: 0 4px;\n}\n.usual-list-link[data-v-a935f598],\n.sorting-order-link[data-v-a935f598] {\n  display: block;\n  cursor: pointer;\n  text-align: center;\n  flex: 1;\n}\n.sorting-order-link[data-v-a935f598] {\n  padding-right: 18px;\n}\n#koakuma-sorting-order-select-output[data-v-a935f598] {\n  padding: 0 16px;\n  display: flex;\n  align-items: center;\n}\n#koakuma-sorting-order-select[data-v-a935f598] {\n  font-size: 14px;\n}\n#koakuma-options-block > *[data-v-a935f598] {\n  margin: 0 5px;\n}\n#koakuma-main-button[data-v-a935f598] {\n  border: none;\n  padding: 2px 14px;\n  border-radius: 3px;\n  font-size: 16px;\n}\n#koakuma-main-button[data-v-a935f598]:enabled {\n  transform: translate(-1px, -1px);\n  box-shadow: 1px 1px 1px hsl(60, 0%, 30%);\n  cursor: pointer;\n}\n#koakuma-main-button[data-v-a935f598]:enabled:hover {\n  transform: translate(0);\n  box-shadow: none;\n}\n#koakuma-main-button[data-v-a935f598]:enabled:active {\n  transform: translate(1px, 1px);\n  box-shadow: -1px -1px 1px hsl(60, 0%, 30%);\n}\n#koakuma-main-button.go[data-v-a935f598] {\n  background-color: hsl(141, 100%, 50%);\n}\n#koakuma-main-button.paused[data-v-a935f598] {\n  background-color: hsl(60, 100%, 50%);\n}\n#koakuma-main-button.end[data-v-a935f598] {\n  background-color: #878787;\n  color: #fff;\n  opacity: 0.87;\n}\n#koakuma-options-width-compress[data-v-a935f598],\n#koakuma-options-width-expand[data-v-a935f598],\n#koakuma-options-config[data-v-a935f598] {\n  cursor: pointer;\n}\n", map: {"version":3,"sources":["/home/flandre/dev/Patchouli/src/components/CtrlPanel.vue"],"names":[],"mappings":";AAmQA;EACA,eAAA;EACA,sBAAA;CACA;AACA;EACA,aAAA;CACA;AACA;EACA,cAAA;EACA,wBAAA;EACA,oBAAA;EACA,iBAAA;EACA,OAAA;EACA,WAAA;EACA,uBAAA;EACA,2BAAA;EACA,aAAA;EACA,eAAA;EACA,gBAAA;CACA;AACA;EACA,eAAA;EACA,qBAAA;CACA;AACA;EACA,gCAAA;EACA,oBAAA;EACA,gBAAA;EACA,2BAAA;EACA,uBAAA;EACA,wBAAA;EACA,cAAA;EACA,eAAA;CACA;AACA;;EAEA,mBAAA;EACA,yBAAA;EACA,mBAAA;CACA;AACA;EACA,uBAAA;CACA;AACA;EACA,2BAAA;EACA,aAAA;EACA,8BAAA;EACA,WAAA;EACA,eAAA;EACA,gBAAA;EACA,sBAAA;EACA,kBAAA;EACA,mBAAA;EACA,gBAAA;CACA;AACA;;EAEA,6EAAA;EACA,yBAAA;EACA,UAAA;CACA;AACA;EACA,UAAA;EACA,eAAA;EACA,YAAA;EACA,gBAAA;EACA,0BAAA;EACA,aAAA;EACA,iBAAA;CACA;AACA;EACA,oBAAA;EACA,cAAA;CACA;AACA;;EAEA,uBAAA;EACA,aAAA;EACA,4BAAA;EACA,2BAAA;EACA,gBAAA;EACA,qBAAA;EACA,oBAAA;CACA;AACA;EACA,aAAA;EACA,mBAAA;CACA;AACA;;EAEA,mBAAA;EACA,uBAAA;EACA,yBAAA;EACA,mBAAA;EACA,UAAA;EACA,YAAA;EACA,gBAAA;EACA,iBAAA;EACA,WAAA;CACA;AACA;EACA,cAAA;EACA,+BAAA;EACA,eAAA;CACA;AACA;;EAEA,cAAA;EACA,mBAAA;EACA,kBAAA;CACA;AACA;;EAEA,YAAA;EACA,8BAAA;EACA,sBAAA;EACA,UAAA;EACA,UAAA;EACA,eAAA;EACA,aAAA;EACA,mBAAA;EACA,QAAA;EACA,SAAA;EACA,YAAA;EACA,uBAAA;CACA;AACA;;EAEA,iBAAA;CACA;AACA;;EAEA,mBAAA;CACA;AACA;EACA,mBAAA;CACA;AACA;;EAEA,oBAAA;CACA;AACA;EACA,eAAA;EACA,wBAAA;EACA,oBAAA;EACA,oBAAA;EACA,eAAA;CACA;AACA;;EAEA,eAAA;EACA,gBAAA;EACA,mBAAA;EACA,QAAA;CACA;AACA;EACA,oBAAA;CACA;AACA;EACA,gBAAA;EACA,cAAA;EACA,oBAAA;CACA;AACA;EACA,gBAAA;CACA;AACA;EACA,cAAA;CACA;AACA;EACA,aAAA;EACA,kBAAA;EACA,mBAAA;EACA,gBAAA;CACA;AACA;EACA,iCAAA;EACA,yCAAA;EACA,gBAAA;CACA;AACA;EACA,wBAAA;EACA,iBAAA;CACA;AACA;EACA,+BAAA;EACA,2CAAA;CACA;AACA;EACA,sCAAA;CACA;AACA;EACA,qCAAA;CACA;AACA;EACA,0BAAA;EACA,YAAA;EACA,cAAA;CACA;AACA;;;EAGA,gBAAA;CACA","file":"CtrlPanel.vue","sourcesContent":["<template>\n  <div\n    :id=\"id\"\n    :ref=\"id\">\n    <div class=\"processed\">{{ $t('ctrlPanel.processed', { count: processedCount }) }}</div>\n    <div id=\"koakuma-bookmark-sort-block\">\n      <label id=\"koakuma-bookmark-sort-label\" for=\"koakuma-bookmark-sort-input\">\n        <span>❤️</span>\n        <input\n          id=\"koakuma-bookmark-sort-input\"\n          :value=\"filters.limit\"\n          type=\"number\"\n          min=\"0\"\n          step=\"1\"\n          @wheel.stop.prevent=\"sortInputWheel\"\n          @input=\"sortInputInput\">\n      </label>\n      <a\n        id=\"koakuma-bookmark-input-usual-switch\"\n        role=\"button\"\n        @click.left=\"usualSwitchOn = !usualSwitchOn\">\n        <i class=\"fas fa-angle-down\"/>\n      </a>\n      <ul v-show=\"usualSwitchOn\" id=\"koakuma-bookmark-input-usual-list\">\n        <li v-for=\"usual in usualList\" :key=\"usual\">\n          <span class=\"sort-order-apply-indicator\">⮬</span>\n          <a\n            role=\"button\"\n            class=\"usual-list-link\"\n            @click.left=\"clickUsual\">{{ usual }}</a>\n        </li>\n      </ul>\n    </div>\n    <div>\n      <input\n        id=\"koakuma-bookmark-tags-filter-input\"\n        :placeholder=\"$t('ctrlPanel.tagFilterQueryPlaceholder')\"\n        type=\"text\"\n        @input=\"tagsFilterInput\">\n    </div>\n    <div>\n      <button\n        id=\"koakuma-main-button\"\n        :disabled=\"status.isEnded\"\n        :class=\"statusClass\"\n        @mouseup.left=\"clickMainButton\">\n        {{ buttonMsg }}\n      </button>\n    </div>\n    <div id=\"koakuma-sorting-order-block\">\n      <a\n        id=\"koakuma-sorting-order-select-switch\"\n        role=\"button\"\n        @click.left=\"sortingOrderSwitchOn = !sortingOrderSwitchOn\">\n        <output id=\"koakuma-sorting-order-select-output\" v-html=\"sortingOrderMsg\"/>\n        <i class=\"fas fa-angle-down\"/>\n      </a>\n      <ul v-show=\"sortingOrderSwitchOn\" id=\"koakuma-sorting-order-select-list\">\n        <li>\n          <span class=\"sort-order-apply-indicator\">⮬</span>\n          <a\n            id=\"koakuma-sorting-order-by-popularity\"\n            class=\"sorting-order-link\"\n            role=\"button\"\n            @click.left=\"clickSortingOrder\">{{ $t('ctrlPanel.sortByPopularity') }}</a>\n        </li>\n        <li>\n          <span class=\"sort-order-apply-indicator\">⮬</span>\n          <a\n            id=\"koakuma-sorting-order-by-date\"\n            class=\"sorting-order-link\"\n            role=\"button\"\n            @click.left=\"clickSortingOrder\">{{ $t('ctrlPanel.sortByDate') }}</a>\n        </li>\n        <li v-show=\"isSelfBookmarkPage\">\n          <span class=\"sort-order-apply-indicator\">⮬</span>\n          <a\n            id=\"koakuma-sorting-order-by-bookmark-id\"\n            class=\"sorting-order-link\"\n            role=\"button\"\n            @click.left=\"clickSortingOrder\">{{ $t('ctrlPanel.sortByBookmarkId') }}</a>\n        </li>\n      </ul>\n    </div>\n    <div id=\"koakuma-options-block\">\n      <div>\n        <i\n          v-show=\"xc.fitwidth\"\n          id=\"koakuma-options-width-compress\"\n          class=\"fas fa-compress\"\n          @click.left=\"optionsChange\"/>\n        <i\n          v-show=\"!xc.fitwidth\"\n          id=\"koakuma-options-width-expand\"\n          class=\"fas fa-expand\"\n          @click.left=\"optionsChange\"/>\n      </div>\n      <div>\n        <i\n          id=\"koakuma-options-config\"\n          class=\"fas fa-cog\"\n          @click.left=\"openCoverLayerInConfigMode\"/>\n      </div>\n    </div>\n  </div>\n</template>\n\n<script>\nimport { $print, toInt } from '../lib/utils';\nimport { SORT_TYPE as ST } from '../lib/enums';\nexport default {\n  props: {\n    id: {\n      default: '',\n      type: String,\n    },\n  },\n  // eslint-disable-next-line sort-keys\n  data() {\n    return {\n      debounceId4sortInput: null,\n      debounceId4tagsFilter: null,\n      sortingOrderSwitchOn: false,\n      usualList: [100, 500, 1000, 3000, 5000, 10000],\n      usualSwitchOn: false,\n    };\n  },\n  // eslint-disable-next-line sort-keys\n  computed: {\n    buttonMsg() {\n      if (this.status.isEnded) {\n        return this.$t('ctrlPanel.buttonEnd');\n      } else if (this.status.isPaused) {\n        return this.$t('ctrlPanel.buttonGo');\n      } else {\n        return this.$t('ctrlPanel.buttonPause');\n      }\n    },\n    filters() {\n      return this.$store.getters.filters;\n    },\n    isSelfBookmarkPage() {\n      return this.$store.getters.isSelfBookmarkPage;\n    },\n    processedCount() {\n      return this.$store.getters['pixiv/imageItemLibrary'].length;\n    },\n    sortingOrderMsg() {\n      switch (this.xc.sort) {\n      case ST.BOOKMARK_COUNT:\n        return this.$t('ctrlPanel.sortByPopularity');\n      case ST.ILLUST_ID:\n        return this.$t('ctrlPanel.sortByDate');\n      default:\n        //ST.BOOKMARK_ID\n        return this.$t('ctrlPanel.sortByBookmarkId');\n      }\n    },\n    status() {\n      return this.$store.getters['pixiv/status'];\n    },\n    statusClass() {\n      const _s = this.status;\n      return {\n        end: _s.isEnded,\n        go: _s.isPaused && !_s.isEnded,\n        paused: !_s.isPaused && !_s.isEnded,\n      };\n    },\n    xc() {\n      return this.$store.getters.config;\n    },\n  },\n  methods: {\n    clickMainButton() {\n      if (this.status.isPaused) {\n        this.$store.dispatch('pixiv/start');\n      } else {\n        this.$store.dispatch('pixiv/pause');\n      }\n    },\n    clickSortingOrder(event) {\n      $print.debug('Koakuma#clickSortingOrder: event', event);\n\n      const ct = event.currentTarget;\n      switch (ct.id) {\n      case 'koakuma-sorting-order-by-popularity':\n        this.$store.commit('setConfig', { sort: ST.BOOKMARK_COUNT });\n        break;\n      case 'koakuma-sorting-order-by-bookmark-id':\n        this.$store.commit('setConfig', { sort: ST.BOOKMARK_ID });\n        break;\n      default:\n        this.$store.commit('setConfig', { sort: ST.ILLUST_ID });\n        break;\n      }\n\n      this.$store.commit('saveConfig');\n      this.$store.commit('applyConfig');\n\n      this.sortingOrderSwitchOn = false;\n    },\n    clickUsual(event) {\n      this.$store.commit('setFilters', {\n        limit: toInt(event.currentTarget.textContent),\n      });\n      this.usualSwitchOn = false;\n    },\n    openCoverLayerInConfigMode() {\n      this.$store.commit('coverLayer/open', { data: null, mode: 'config' });\n    },\n    optionsChange(event) {\n      $print.debug('Koakuma#optionsChange: event', event);\n      if (event.target.id === 'koakuma-options-width-compress') {\n        this.$store.commit('setConfig', { fitwidth: false });\n      } else if (event.target.id === 'koakuma-options-width-expand') {\n        this.$store.commit('setConfig', { fitwidth: true });\n      }\n      this.$store.commit('saveConfig');\n      this.$store.commit('applyConfig');\n    },\n    sortInputInput(event) {\n      if (this.debounceId4sortInput) {\n        clearTimeout(this.debounceId4sortInput);\n      }\n      this.debounceId4sortInput = setTimeout(() => {\n        this.debounceId4sortInput = null;\n        this.$store.commit('setFilters', {\n          limit: Math.max(0, toInt(event.target.value)),\n        });\n      }, 500);\n    },\n    sortInputWheel(event) {\n      if (event.deltaY < 0) {\n        this.$store.commit('setFilters', {\n          limit: toInt(event.target.value) + 20,\n        });\n      } else {\n        this.$store.commit('setFilters', {\n          limit: Math.max(0, toInt(event.target.value) - 20),\n        });\n      }\n    },\n    tagsFilterInput(event) {\n      if (this.debounceId4tagsFilter) {\n        clearTimeout(this.debounceId4tagsFilter);\n      }\n      this.debounceId4tagsFilter = setTimeout(() => {\n        this.debounceId4tagsFilter = null;\n        this.$store.commit('setFilters', {\n          query: event.target.value,\n        });\n      }, 1500);\n    },\n  },\n};\n</script>\n\n<style scoped>\na {\n  color: #258fb8;\n  text-decoration: none;\n}\na[role=\"button\"] > .fa-angle-down {\n  padding: 2px;\n}\n#Koakuma {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  position: sticky;\n  top: 0;\n  z-index: 3;\n  background-color: #eef;\n  box-shadow: 0 1px 1px #777;\n  padding: 4px;\n  color: #00186c;\n  font-size: 16px;\n}\n#Koakuma > div {\n  margin: 0 10px;\n  display: inline-flex;\n}\n#koakuma-bookmark-sort-label {\n  display: inline-flex !important;\n  align-items: center;\n  margin-right: 0;\n  border-radius: 3px 0 0 3px;\n  background-color: #cef;\n  color: rgb(0, 105, 177);\n  margin: 0 1px;\n  padding: 0 6px;\n}\n#koakuma-bookmark-sort-block,\n#koakuma-sorting-order-block {\n  position: relative;\n  box-shadow: 0 0 1px #069;\n  border-radius: 4px;\n}\n#koakuma-sorting-order-block {\n  background-color: #cef;\n}\n#koakuma-bookmark-sort-input {\n  -moz-appearance: textfield;\n  border: none;\n  background-color: transparent;\n  padding: 0;\n  color: inherit;\n  font-size: 16px;\n  display: inline-block;\n  cursor: ns-resize;\n  text-align: center;\n  max-width: 50px;\n}\n#koakuma-bookmark-sort-input::-webkit-inner-spin-button,\n#koakuma-bookmark-sort-input::-webkit-outer-spin-button {\n  /* https://css-tricks.com/numeric-inputs-a-comparison-of-browser-defaults/ */\n  -webkit-appearance: none;\n  margin: 0;\n}\n#koakuma-bookmark-tags-filter-input {\n  margin: 0;\n  padding: 0 4px;\n  color: #333;\n  font-size: 12px;\n  border: 1px solid #becad7;\n  height: 20px;\n  min-width: 300px;\n}\n#koakuma-bookmark-tags-filter-input:focus {\n  background: #ffffcc;\n  outline: none;\n}\n#koakuma-bookmark-input-usual-switch,\n#koakuma-sorting-order-select-switch {\n  background-color: #cef;\n  padding: 1px;\n  border-left: 1px solid #888;\n  border-radius: 0 3px 3px 0;\n  cursor: pointer;\n  display: inline-flex;\n  align-items: center;\n}\n#koakuma-sorting-order-select-switch {\n  border: none;\n  border-radius: 3px;\n}\n#koakuma-bookmark-input-usual-list,\n#koakuma-sorting-order-select-list {\n  border-radius: 3px;\n  background-color: #cef;\n  box-shadow: 0 0 2px #069;\n  position: absolute;\n  top: 100%;\n  width: 100%;\n  margin-top: 1px;\n  list-style: none;\n  padding: 0;\n}\n#koakuma-sorting-order-select-list {\n  display: grid;\n  grid-auto-columns: max-content;\n  width: initial;\n}\n#koakuma-bookmark-input-usual-list > li,\n#koakuma-sorting-order-select-list > li {\n  display: flex;\n  position: relative;\n  line-height: 24px;\n}\n#koakuma-bookmark-input-usual-list > li::after,\n#koakuma-sorting-order-select-list > li::after {\n  content: \"\";\n  box-shadow: 0 0 0 1px #89d8ff;\n  display: inline-block;\n  margin: 0;\n  height: 0;\n  line-height: 0;\n  font-size: 0;\n  position: absolute;\n  left: 0;\n  right: 0;\n  width: 100%;\n  transform: scaleX(0.8);\n}\n#koakuma-bookmark-input-usual-list > li:first-child::after,\n#koakuma-sorting-order-select-list > li:first-child::after {\n  box-shadow: none;\n}\n#koakuma-bookmark-input-usual-list .sort-order-apply-indicator,\n#koakuma-sorting-order-select-list .sort-order-apply-indicator {\n  visibility: hidden;\n}\n#koakuma-bookmark-input-usual-list .sort-order-apply-indicator {\n  position: absolute;\n}\n#koakuma-bookmark-input-usual-list > li:hover .sort-order-apply-indicator,\n#koakuma-sorting-order-select-list > li:hover .sort-order-apply-indicator {\n  visibility: visible;\n}\n.sort-order-apply-indicator {\n  display: block;\n  justify-content: center;\n  align-items: center;\n  font-weight: bolder;\n  padding: 0 4px;\n}\n.usual-list-link,\n.sorting-order-link {\n  display: block;\n  cursor: pointer;\n  text-align: center;\n  flex: 1;\n}\n.sorting-order-link {\n  padding-right: 18px;\n}\n#koakuma-sorting-order-select-output {\n  padding: 0 16px;\n  display: flex;\n  align-items: center;\n}\n#koakuma-sorting-order-select {\n  font-size: 14px;\n}\n#koakuma-options-block > * {\n  margin: 0 5px;\n}\n#koakuma-main-button {\n  border: none;\n  padding: 2px 14px;\n  border-radius: 3px;\n  font-size: 16px;\n}\n#koakuma-main-button:enabled {\n  transform: translate(-1px, -1px);\n  box-shadow: 1px 1px 1px hsl(60, 0%, 30%);\n  cursor: pointer;\n}\n#koakuma-main-button:enabled:hover {\n  transform: translate(0);\n  box-shadow: none;\n}\n#koakuma-main-button:enabled:active {\n  transform: translate(1px, 1px);\n  box-shadow: -1px -1px 1px hsl(60, 0%, 30%);\n}\n#koakuma-main-button.go {\n  background-color: hsl(141, 100%, 50%);\n}\n#koakuma-main-button.paused {\n  background-color: hsl(60, 100%, 50%);\n}\n#koakuma-main-button.end {\n  background-color: #878787;\n  color: #fff;\n  opacity: 0.87;\n}\n#koakuma-options-width-compress,\n#koakuma-options-width-expand,\n#koakuma-options-config {\n  cursor: pointer;\n}\n</style>\n"]}, media: undefined });

  };
  /* scoped */
  const __vue_scope_id__ = "data-v-a935f598";
  /* module identifier */
  const __vue_module_identifier__ = undefined;
  /* functional template */
  const __vue_is_functional_template__ = false;
  /* component normalizer */
  function __vue_normalize__(
    template, style, script$$1,
    scope, functional, moduleIdentifier,
    createInjector, createInjectorSSR
  ) {
    const component = (typeof script$$1 === 'function' ? script$$1.options : script$$1) || {};

    // For security concerns, we use only base name in production mode.
    component.__file = "/home/flandre/dev/Patchouli/src/components/CtrlPanel.vue";

    if (!component.render) {
      component.render = template.render;
      component.staticRenderFns = template.staticRenderFns;
      component._compiled = true;

      if (functional) component.functional = true;
    }

    component._scopeId = scope;

    {
      let hook;
      if (style) {
        hook = function(context) {
          style.call(this, createInjector(context));
        };
      }

      if (hook !== undefined) {
        if (component.functional) {
          // register for functional component in vue file
          const originalRender = component.render;
          component.render = function renderWithStyleInjection(h, context) {
            hook.call(context);
            return originalRender(h, context)
          };
        } else {
          // inject component registration as beforeCreate hook
          const existing = component.beforeCreate;
          component.beforeCreate = existing ? [].concat(existing, hook) : [hook];
        }
      }
    }

    return component
  }
  /* style inject */
  function __vue_create_injector__() {
    const head = document.head || document.getElementsByTagName('head')[0];
    const styles = __vue_create_injector__.styles || (__vue_create_injector__.styles = {});
    const isOldIE =
      typeof navigator !== 'undefined' &&
      /msie [6-9]\\b/.test(navigator.userAgent.toLowerCase());

    return function addStyle(id, css) {
      if (document.querySelector('style[data-vue-ssr-id~="' + id + '"]')) return // SSR styles are present.

      const group = isOldIE ? css.media || 'default' : id;
      const style = styles[group] || (styles[group] = { ids: [], parts: [], element: undefined });

      if (!style.ids.includes(id)) {
        let code = css.source;
        let index = style.ids.length;

        style.ids.push(id);

        if (isOldIE) {
          style.element = style.element || document.querySelector('style[data-group=' + group + ']');
        }

        if (!style.element) {
          const el = style.element = document.createElement('style');
          el.type = 'text/css';

          if (css.media) el.setAttribute('media', css.media);
          if (isOldIE) {
            el.setAttribute('data-group', group);
            el.setAttribute('data-next-index', '0');
          }

          head.appendChild(el);
        }

        if (isOldIE) {
          index = parseInt(style.element.getAttribute('data-next-index'));
          style.element.setAttribute('data-next-index', index + 1);
        }

        if (style.element.styleSheet) {
          style.parts.push(code);
          style.element.styleSheet.cssText = style.parts
            .filter(Boolean)
            .join('\n');
        } else {
          const textNode = document.createTextNode(code);
          const nodes = style.element.childNodes;
          if (nodes[index]) style.element.removeChild(nodes[index]);
          if (nodes.length) style.element.insertBefore(textNode, nodes[index]);
          else style.element.appendChild(textNode);
        }
      }
    }
  }
  /* style inject SSR */
  

  
  var ctrlPanel = __vue_normalize__(
    { render: __vue_render__, staticRenderFns: __vue_staticRenderFns__ },
    __vue_inject_styles__,
    __vue_script__,
    __vue_scope_id__,
    __vue_is_functional_template__,
    __vue_module_identifier__,
    __vue_create_injector__,
    undefined
  );

const GMC = {
  async XHR(details) {
    const xhr = window.GM_xmlhttpRequest || (GM ? GM.xmlHttpRequest : null);
    if (!xhr) {
      return Promise.reject();
    }

    return new Promise((resolve, reject) => {
      Object.assign(details, {
        onabort: reject,
        onerror: reject,
        onload: resolve,
        ontimeout: reject,
      });
      xhr(details);
    });
  },
  async getValue(name, failv = null) {
    if (window.GM_getValue) {
      return Promise.resolve(GM_getValue(name) || failv);
    } else {
      return (await GM.getValue(name)) || failv;
    }
  },
  async setValue(name, value) {
    if (window.GM_setValue) {
      GM_setValue(name, value);
    } else {
      GM.setValue(name, value);
    }
  },
};

//

var script$1 = {
  computed: {
    bookmarkPageLink() {
      if (!this.xdata) {
        return '#';
      }
      return `bookmark_add.php?type=illust&illust_id=${this.xdata.illustId}`;
    },
    currentImageItem() {
      if (!this.xdata) {
        return null;
      }
      const lib = this.$store.getters['pixiv/imageItemLibrary'];
      const found = lib.find(i => i.illustId === this.xdata.illustId);
      return found ? found : null;
    },
    currentType() {
      if (!this.xdata) {
        return '';
      }
      return this.xdata.type;
    },
    inlineStyle() {
      const RIGHT_BOUND = 200; // magic number
      const position = this.xpos;
      const ow = document.body.offsetWidth;

      let style = `top: ${position.y}px;`;
      if (ow - position.x < RIGHT_BOUND) {
        style += `right: ${ow - position.x}px;`;
      } else {
        style += `left: ${position.x}px;`;
      }
      return style;
    },
    isDownloadable() {
      return (
        this.currentImageItem &&
        this.currentImageItem.illustPageCount === 1 &&
        !this.currentImageItem.isUgoira // unsupport ugoira currently
      );
    },
    isUgoira() {
      return this.currentImageItem && this.currentImageItem.isUgoira;
    },
    xdata() {
      return this.$store.getters['contextMenu/data'];
    },
    xpos() {
      return this.$store.getters['contextMenu/pos'];
    },
  },
  methods: {
    addToBlacklist() {
      if (this.currentImageItem) {
        const userId = this.currentImageItem.userId;
        const blacklist = this.$store.getters.config.blacklist;
        blacklist.push(userId);
        blacklist.sort((a, b) => a - b);
        this.$store.commit('setConfig', { blacklist });
        this.$store.commit('saveConfig');
      }
    },
    async downloadOne() {
      const imgUrl = this.currentImageItem.urls.original;
      const illustId = this.currentImageItem.illustId;
      const a = $el('a', { href: imgUrl });

      const filename = a.pathname.split('/').pop();
      const ext = filename
        .split('.')
        .pop()
        .toLowerCase();
      /* eslint-disable sort-keys */
      const response = await GMC.XHR({
        method: 'GET',
        url: imgUrl,
        // greasemonkey has no this API
        responseType: 'arraybuffer',
        // for greasemonkey
        binary: true,
        headers: {
          Referer: `https://www.pixiv.net/member_illust.php?mode=medium&illust_id=${illustId}`,
        },
      });
      /* eslint-enable sort-keys */

      if (ext === 'jpg' || ext === 'jpeg') {
        saveAs(new File([response.response], filename, { type: 'image/jpeg' }));
      } else if (ext === 'png') {
        saveAs(new File([response.response], filename, { type: 'image/png' }));
      }
    },
    async followUser() {
      if (this.currentImageItem) {
        const userId = this.currentImageItem.userId;

        if (await PixivAPI.postFollowUser(userId)) {
          this.$store.commit('editImgItem', {
            type: 'follow-user',
            userId: this.currentImageItem.userId,
          });
        }
      }
    },
    openPreview() {
      this.$store.commit('coverLayer/open', {
        data: this.currentImageItem,
        mode: 'preview',
      });
    },
    thumbUp() {
      if (this.currentImageItem) {
        PixivAPI.postIllustLike(this.currentImageItem.illustId);
      }
    },
  },
};

/* script */
            const __vue_script__$1 = script$1;
            
/* template */
var __vue_render__$1 = function() {
  var _vm = this;
  var _h = _vm.$createElement;
  var _c = _vm._self._c || _h;
  return _c(
    "div",
    { style: _vm.inlineStyle, attrs: { id: "patchouli-context-menu" } },
    [
      _c(
        "ul",
        {
          directives: [
            {
              name: "show",
              rawName: "v-show",
              value: _vm.currentType === "image-item-image",
              expression: "currentType === 'image-item-image'"
            }
          ]
        },
        [
          _c("li", [
            _c(
              "a",
              {
                attrs: { role: "button" },
                on: {
                  click: function($event) {
                    if (
                      !("button" in $event) &&
                      _vm._k($event.keyCode, "left", 37, $event.key, [
                        "Left",
                        "ArrowLeft"
                      ])
                    ) {
                      return null
                    }
                    if ("button" in $event && $event.button !== 0) {
                      return null
                    }
                    return _vm.thumbUp($event)
                  }
                }
              },
              [
                _c("i", { staticClass: "far fa-thumbs-up" }),
                _vm._v(
                  "\n        " +
                    _vm._s(_vm.$t("contextMenu.thumbUp")) +
                    "\n      "
                )
              ]
            )
          ]),
          _vm._v(" "),
          _c(
            "li",
            {
              directives: [
                {
                  name: "show",
                  rawName: "v-show",
                  value: _vm.isDownloadable,
                  expression: "isDownloadable"
                }
              ]
            },
            [
              _c(
                "a",
                {
                  attrs: { role: "button" },
                  on: {
                    click: function($event) {
                      if (
                        !("button" in $event) &&
                        _vm._k($event.keyCode, "left", 37, $event.key, [
                          "Left",
                          "ArrowLeft"
                        ])
                      ) {
                        return null
                      }
                      if ("button" in $event && $event.button !== 0) {
                        return null
                      }
                      return _vm.downloadOne($event)
                    }
                  }
                },
                [
                  _c("i", { staticClass: "fas fa-download" }),
                  _vm._v(
                    "\n        " +
                      _vm._s(_vm.$t("contextMenu.download")) +
                      "\n      "
                  )
                ]
              )
            ]
          ),
          _vm._v(" "),
          _c("li", [
            _c(
              "a",
              {
                attrs: { role: "button" },
                on: {
                  click: function($event) {
                    if (
                      !("button" in $event) &&
                      _vm._k($event.keyCode, "left", 37, $event.key, [
                        "Left",
                        "ArrowLeft"
                      ])
                    ) {
                      return null
                    }
                    if ("button" in $event && $event.button !== 0) {
                      return null
                    }
                    return _vm.openPreview($event)
                  }
                }
              },
              [
                _c("i", { staticClass: "fas fa-search-plus" }),
                _vm._v(
                  "\n        " +
                    _vm._s(_vm.$t("contextMenu.preview")) +
                    "\n      "
                )
              ]
            )
          ]),
          _vm._v(" "),
          _c("li", [
            _c(
              "a",
              {
                attrs: {
                  href: _vm.bookmarkPageLink,
                  role: "button",
                  target: "_blank"
                }
              },
              [
                _c("i", { staticClass: "far fa-bookmark" }),
                _vm._v(
                  "\n        " +
                    _vm._s(_vm.$t("contextMenu.openBookmarkPage")) +
                    "\n      "
                )
              ]
            )
          ])
        ]
      ),
      _vm._v(" "),
      _c(
        "ul",
        {
          directives: [
            {
              name: "show",
              rawName: "v-show",
              value: _vm.currentType === "image-item-title-user",
              expression: "currentType === 'image-item-title-user'"
            }
          ]
        },
        [
          _c("li", [
            _c(
              "a",
              {
                attrs: { role: "button" },
                on: {
                  click: function($event) {
                    if (
                      !("button" in $event) &&
                      _vm._k($event.keyCode, "left", 37, $event.key, [
                        "Left",
                        "ArrowLeft"
                      ])
                    ) {
                      return null
                    }
                    if ("button" in $event && $event.button !== 0) {
                      return null
                    }
                    return _vm.addToBlacklist($event)
                  }
                }
              },
              [
                _c("i", { staticClass: "far fa-eye-slash" }),
                _vm._v(
                  "\n        " +
                    _vm._s(_vm.$t("contextMenu.addToBlacklist")) +
                    "\n      "
                )
              ]
            )
          ]),
          _vm._v(" "),
          _c(
            "li",
            {
              directives: [
                {
                  name: "show",
                  rawName: "v-show",
                  value:
                    _vm.currentImageItem && !_vm.currentImageItem.isFollowed,
                  expression: "currentImageItem && !currentImageItem.isFollowed"
                }
              ]
            },
            [
              _c(
                "a",
                {
                  attrs: { role: "button" },
                  on: {
                    click: function($event) {
                      if (
                        !("button" in $event) &&
                        _vm._k($event.keyCode, "left", 37, $event.key, [
                          "Left",
                          "ArrowLeft"
                        ])
                      ) {
                        return null
                      }
                      if ("button" in $event && $event.button !== 0) {
                        return null
                      }
                      return _vm.followUser($event)
                    }
                  }
                },
                [
                  _c("i", { staticClass: "fas fa-rss" }),
                  _vm._v(
                    "\n        " +
                      _vm._s(_vm.$t("contextMenu.followUser")) +
                      "\n      "
                  )
                ]
              )
            ]
          )
        ]
      )
    ]
  )
};
var __vue_staticRenderFns__$1 = [];
__vue_render__$1._withStripped = true;

  /* style */
  const __vue_inject_styles__$1 = function (inject) {
    if (!inject) return
    inject("data-v-23e59ec8_0", { source: "\n#patchouli-context-menu[data-v-23e59ec8] {\n  box-sizing: border-box;\n  border: 1px solid #b28fce;\n  position: fixed;\n  z-index: 10;\n  background-color: #fff;\n  font-size: 16px;\n  overflow: hidden;\n  border-radius: 5px;\n}\n#patchouli-context-menu > ul[data-v-23e59ec8] {\n  margin: 0;\n  padding: 0;\n  line-height: 20px;\n}\n#patchouli-context-menu > ul > li[data-v-23e59ec8] {\n  display: flex;\n  align-items: center;\n}\n#patchouli-context-menu > ul a[data-v-23e59ec8] {\n  color: #85a;\n  padding: 3px;\n  flex: 1;\n  text-decoration: none;\n  white-space: nowrap;\n  display: inline-flex;\n  align-items: center;\n  text-align: center;\n}\n#patchouli-context-menu > ul a[data-v-23e59ec8]:hover {\n  background-color: #b28fce;\n  color: #fff;\n  cursor: pointer;\n}\n#patchouli-context-menu > ul i.far[data-v-23e59ec8],\n#patchouli-context-menu > ul i.fas[data-v-23e59ec8] {\n  height: 18px;\n  width: 18px;\n  margin: 0 4px;\n}\n", map: {"version":3,"sources":["/home/flandre/dev/Patchouli/src/components/ContextMenu.vue"],"names":[],"mappings":";AA+KA;EACA,uBAAA;EACA,0BAAA;EACA,gBAAA;EACA,YAAA;EACA,uBAAA;EACA,gBAAA;EACA,iBAAA;EACA,mBAAA;CACA;AACA;EACA,UAAA;EACA,WAAA;EACA,kBAAA;CACA;AACA;EACA,cAAA;EACA,oBAAA;CACA;AACA;EACA,YAAA;EACA,aAAA;EACA,QAAA;EACA,sBAAA;EACA,oBAAA;EACA,qBAAA;EACA,oBAAA;EACA,mBAAA;CACA;AACA;EACA,0BAAA;EACA,YAAA;EACA,gBAAA;CACA;AACA;;EAEA,aAAA;EACA,YAAA;EACA,cAAA;CACA","file":"ContextMenu.vue","sourcesContent":["<template>\n  <div id=\"patchouli-context-menu\" :style=\"inlineStyle\">\n    <ul v-show=\"currentType === 'image-item-image'\">\n      <li>\n        <a role=\"button\" @click.left=\"thumbUp\">\n          <i class=\"far fa-thumbs-up\"/>\n          {{ $t('contextMenu.thumbUp') }}\n        </a>\n      </li>\n      <li v-show=\"isDownloadable\">\n        <a role=\"button\" @click.left=\"downloadOne\">\n          <i class=\"fas fa-download\"/>\n          {{ $t('contextMenu.download') }}\n        </a>\n      </li>\n      <li>\n        <a role=\"button\" @click.left=\"openPreview\">\n          <i class=\"fas fa-search-plus\"/>\n          {{ $t('contextMenu.preview') }}\n        </a>\n      </li>\n      <li>\n        <a\n          :href=\"bookmarkPageLink\"\n          role=\"button\"\n          target=\"_blank\">\n          <i class=\"far fa-bookmark\"/>\n          {{ $t('contextMenu.openBookmarkPage') }}\n        </a>\n      </li>\n    </ul>\n    <ul v-show=\"currentType === 'image-item-title-user'\">\n      <li>\n        <a role=\"button\" @click.left=\"addToBlacklist\">\n          <i class=\"far fa-eye-slash\"/>\n          {{ $t('contextMenu.addToBlacklist') }}\n        </a>\n      </li>\n      <li v-show=\"currentImageItem && !currentImageItem.isFollowed\">\n        <a role=\"button\" @click.left=\"followUser\">\n          <i class=\"fas fa-rss\"/>\n          {{ $t('contextMenu.followUser') }}\n        </a>\n      </li>\n    </ul>\n  </div>\n</template>\n\n\n<script>\nimport { PixivAPI } from '../lib/pixiv';\nimport { $el } from '../lib/utils';\nimport GMC from '../lib/gmc';\n\nexport default {\n  computed: {\n    bookmarkPageLink() {\n      if (!this.xdata) {\n        return '#';\n      }\n      return `bookmark_add.php?type=illust&illust_id=${this.xdata.illustId}`;\n    },\n    currentImageItem() {\n      if (!this.xdata) {\n        return null;\n      }\n      const lib = this.$store.getters['pixiv/imageItemLibrary'];\n      const found = lib.find(i => i.illustId === this.xdata.illustId);\n      return found ? found : null;\n    },\n    currentType() {\n      if (!this.xdata) {\n        return '';\n      }\n      return this.xdata.type;\n    },\n    inlineStyle() {\n      const RIGHT_BOUND = 200; // magic number\n      const position = this.xpos;\n      const ow = document.body.offsetWidth;\n\n      let style = `top: ${position.y}px;`;\n      if (ow - position.x < RIGHT_BOUND) {\n        style += `right: ${ow - position.x}px;`;\n      } else {\n        style += `left: ${position.x}px;`;\n      }\n      return style;\n    },\n    isDownloadable() {\n      return (\n        this.currentImageItem &&\n        this.currentImageItem.illustPageCount === 1 &&\n        !this.currentImageItem.isUgoira // unsupport ugoira currently\n      );\n    },\n    isUgoira() {\n      return this.currentImageItem && this.currentImageItem.isUgoira;\n    },\n    xdata() {\n      return this.$store.getters['contextMenu/data'];\n    },\n    xpos() {\n      return this.$store.getters['contextMenu/pos'];\n    },\n  },\n  methods: {\n    addToBlacklist() {\n      if (this.currentImageItem) {\n        const userId = this.currentImageItem.userId;\n        const blacklist = this.$store.getters.config.blacklist;\n        blacklist.push(userId);\n        blacklist.sort((a, b) => a - b);\n        this.$store.commit('setConfig', { blacklist });\n        this.$store.commit('saveConfig');\n      }\n    },\n    async downloadOne() {\n      const imgUrl = this.currentImageItem.urls.original;\n      const illustId = this.currentImageItem.illustId;\n      const a = $el('a', { href: imgUrl });\n\n      const filename = a.pathname.split('/').pop();\n      const ext = filename\n        .split('.')\n        .pop()\n        .toLowerCase();\n      /* eslint-disable sort-keys */\n      const response = await GMC.XHR({\n        method: 'GET',\n        url: imgUrl,\n        // greasemonkey has no this API\n        responseType: 'arraybuffer',\n        // for greasemonkey\n        binary: true,\n        headers: {\n          Referer: `https://www.pixiv.net/member_illust.php?mode=medium&illust_id=${illustId}`,\n        },\n      });\n      /* eslint-enable sort-keys */\n\n      if (ext === 'jpg' || ext === 'jpeg') {\n        saveAs(new File([response.response], filename, { type: 'image/jpeg' }));\n      } else if (ext === 'png') {\n        saveAs(new File([response.response], filename, { type: 'image/png' }));\n      }\n    },\n    async followUser() {\n      if (this.currentImageItem) {\n        const userId = this.currentImageItem.userId;\n\n        if (await PixivAPI.postFollowUser(userId)) {\n          this.$store.commit('editImgItem', {\n            type: 'follow-user',\n            userId: this.currentImageItem.userId,\n          });\n        }\n      }\n    },\n    openPreview() {\n      this.$store.commit('coverLayer/open', {\n        data: this.currentImageItem,\n        mode: 'preview',\n      });\n    },\n    thumbUp() {\n      if (this.currentImageItem) {\n        PixivAPI.postIllustLike(this.currentImageItem.illustId);\n      }\n    },\n  },\n};\n</script>\n\n<style scoped>\n#patchouli-context-menu {\n  box-sizing: border-box;\n  border: 1px solid #b28fce;\n  position: fixed;\n  z-index: 10;\n  background-color: #fff;\n  font-size: 16px;\n  overflow: hidden;\n  border-radius: 5px;\n}\n#patchouli-context-menu > ul {\n  margin: 0;\n  padding: 0;\n  line-height: 20px;\n}\n#patchouli-context-menu > ul > li {\n  display: flex;\n  align-items: center;\n}\n#patchouli-context-menu > ul a {\n  color: #85a;\n  padding: 3px;\n  flex: 1;\n  text-decoration: none;\n  white-space: nowrap;\n  display: inline-flex;\n  align-items: center;\n  text-align: center;\n}\n#patchouli-context-menu > ul a:hover {\n  background-color: #b28fce;\n  color: #fff;\n  cursor: pointer;\n}\n#patchouli-context-menu > ul i.far,\n#patchouli-context-menu > ul i.fas {\n  height: 18px;\n  width: 18px;\n  margin: 0 4px;\n}\n</style>\n"]}, media: undefined });

  };
  /* scoped */
  const __vue_scope_id__$1 = "data-v-23e59ec8";
  /* module identifier */
  const __vue_module_identifier__$1 = undefined;
  /* functional template */
  const __vue_is_functional_template__$1 = false;
  /* component normalizer */
  function __vue_normalize__$1(
    template, style, script,
    scope, functional, moduleIdentifier,
    createInjector, createInjectorSSR
  ) {
    const component = (typeof script === 'function' ? script.options : script) || {};

    // For security concerns, we use only base name in production mode.
    component.__file = "/home/flandre/dev/Patchouli/src/components/ContextMenu.vue";

    if (!component.render) {
      component.render = template.render;
      component.staticRenderFns = template.staticRenderFns;
      component._compiled = true;

      if (functional) component.functional = true;
    }

    component._scopeId = scope;

    {
      let hook;
      if (style) {
        hook = function(context) {
          style.call(this, createInjector(context));
        };
      }

      if (hook !== undefined) {
        if (component.functional) {
          // register for functional component in vue file
          const originalRender = component.render;
          component.render = function renderWithStyleInjection(h, context) {
            hook.call(context);
            return originalRender(h, context)
          };
        } else {
          // inject component registration as beforeCreate hook
          const existing = component.beforeCreate;
          component.beforeCreate = existing ? [].concat(existing, hook) : [hook];
        }
      }
    }

    return component
  }
  /* style inject */
  function __vue_create_injector__$1() {
    const head = document.head || document.getElementsByTagName('head')[0];
    const styles = __vue_create_injector__$1.styles || (__vue_create_injector__$1.styles = {});
    const isOldIE =
      typeof navigator !== 'undefined' &&
      /msie [6-9]\\b/.test(navigator.userAgent.toLowerCase());

    return function addStyle(id, css) {
      if (document.querySelector('style[data-vue-ssr-id~="' + id + '"]')) return // SSR styles are present.

      const group = isOldIE ? css.media || 'default' : id;
      const style = styles[group] || (styles[group] = { ids: [], parts: [], element: undefined });

      if (!style.ids.includes(id)) {
        let code = css.source;
        let index = style.ids.length;

        style.ids.push(id);

        if (isOldIE) {
          style.element = style.element || document.querySelector('style[data-group=' + group + ']');
        }

        if (!style.element) {
          const el = style.element = document.createElement('style');
          el.type = 'text/css';

          if (css.media) el.setAttribute('media', css.media);
          if (isOldIE) {
            el.setAttribute('data-group', group);
            el.setAttribute('data-next-index', '0');
          }

          head.appendChild(el);
        }

        if (isOldIE) {
          index = parseInt(style.element.getAttribute('data-next-index'));
          style.element.setAttribute('data-next-index', index + 1);
        }

        if (style.element.styleSheet) {
          style.parts.push(code);
          style.element.styleSheet.cssText = style.parts
            .filter(Boolean)
            .join('\n');
        } else {
          const textNode = document.createTextNode(code);
          const nodes = style.element.childNodes;
          if (nodes[index]) style.element.removeChild(nodes[index]);
          if (nodes.length) style.element.insertBefore(textNode, nodes[index]);
          else style.element.appendChild(textNode);
        }
      }
    }
  }
  /* style inject SSR */
  

  
  var ContextMenu = __vue_normalize__$1(
    { render: __vue_render__$1, staticRenderFns: __vue_staticRenderFns__$1 },
    __vue_inject_styles__$1,
    __vue_script__$1,
    __vue_scope_id__$1,
    __vue_is_functional_template__$1,
    __vue_module_identifier__$1,
    __vue_create_injector__$1,
    undefined
  );

//
//
//
//
//
//
//
//
//
//
//
//
//
//

var script$2 = {
  props: {
    size: {
      default: 48,
      type: Number,
    },
  },
  // eslint-disable-next-line sort-keys
  computed: {
    inlineStyle() {
      return `height: ${this.size}px; width: ${this.size}px;`;
    },
  },
};

/* script */
            const __vue_script__$2 = script$2;
            
/* template */
var __vue_render__$2 = function() {
  var _vm = this;
  var _h = _vm.$createElement;
  var _c = _vm._self._c || _h;
  return _c(
    "svg",
    {
      staticClass: "ugoira-icon",
      style: _vm.inlineStyle,
      attrs: { viewBox: "0 0 24 24" }
    },
    [
      _c("circle", {
        staticClass: "ugoira-icon-circle",
        attrs: { cx: "12", cy: "12", r: "10" }
      }),
      _vm._v(" "),
      _c("path", {
        attrs: {
          d:
            "M9,8.74841664 L9,15.2515834 C9,15.8038681 9.44771525,16.2515834 10,16.2515834 C10.1782928,16.2515834 10.3533435,16.2039156 10.5070201,16.1135176 L16.0347118,12.8619342 C16.510745,12.5819147 16.6696454,11.969013 16.3896259,11.4929799 C16.3034179,11.3464262 16.1812655,11.2242738 16.0347118,11.1380658 L10.5070201,7.88648243 C10.030987,7.60646294 9.41808527,7.76536339 9.13806578,8.24139652 C9.04766776,8.39507316 9,8.57012386 9,8.74841664 Z"
        }
      })
    ]
  )
};
var __vue_staticRenderFns__$2 = [];
__vue_render__$2._withStripped = true;

  /* style */
  const __vue_inject_styles__$2 = function (inject) {
    if (!inject) return
    inject("data-v-f6964bfe_0", { source: "\n.ugoira-icon-circle[data-v-f6964bfe] {\n  fill: #000;\n  fill-opacity: 0.4;\n}\n.ugoira-icon[data-v-f6964bfe] {\n  fill: #fff;\n  font-size: 0;\n  line-height: 0;\n  stroke: none;\n  vertical-align: middle;\n}\n", map: {"version":3,"sources":["/home/flandre/dev/Patchouli/src/components/IconUgoiraPlay.vue"],"names":[],"mappings":";AAgCA;EACA,WAAA;EACA,kBAAA;CACA;AACA;EACA,WAAA;EACA,aAAA;EACA,eAAA;EACA,aAAA;EACA,uBAAA;CACA","file":"IconUgoiraPlay.vue","sourcesContent":["<template>\n  <svg\n    :style=\"inlineStyle\"\n    viewBox=\"0 0 24 24\"\n    class=\"ugoira-icon\">\n    <circle\n      class=\"ugoira-icon-circle\"\n      cx=\"12\"\n      cy=\"12\"\n      r=\"10\"/>\n    <path d=\"M9,8.74841664 L9,15.2515834 C9,15.8038681 9.44771525,16.2515834 10,16.2515834 C10.1782928,16.2515834 10.3533435,16.2039156 10.5070201,16.1135176 L16.0347118,12.8619342 C16.510745,12.5819147 16.6696454,11.969013 16.3896259,11.4929799 C16.3034179,11.3464262 16.1812655,11.2242738 16.0347118,11.1380658 L10.5070201,7.88648243 C10.030987,7.60646294 9.41808527,7.76536339 9.13806578,8.24139652 C9.04766776,8.39507316 9,8.57012386 9,8.74841664 Z\"/>\n  </svg>\n</template>\n\n<script>\nexport default {\n  props: {\n    size: {\n      default: 48,\n      type: Number,\n    },\n  },\n  // eslint-disable-next-line sort-keys\n  computed: {\n    inlineStyle() {\n      return `height: ${this.size}px; width: ${this.size}px;`;\n    },\n  },\n};\n</script>\n\n<style scoped>\n.ugoira-icon-circle {\n  fill: #000;\n  fill-opacity: 0.4;\n}\n.ugoira-icon {\n  fill: #fff;\n  font-size: 0;\n  line-height: 0;\n  stroke: none;\n  vertical-align: middle;\n}\n</style>\n\n\n\n"]}, media: undefined });

  };
  /* scoped */
  const __vue_scope_id__$2 = "data-v-f6964bfe";
  /* module identifier */
  const __vue_module_identifier__$2 = undefined;
  /* functional template */
  const __vue_is_functional_template__$2 = false;
  /* component normalizer */
  function __vue_normalize__$2(
    template, style, script,
    scope, functional, moduleIdentifier,
    createInjector, createInjectorSSR
  ) {
    const component = (typeof script === 'function' ? script.options : script) || {};

    // For security concerns, we use only base name in production mode.
    component.__file = "/home/flandre/dev/Patchouli/src/components/IconUgoiraPlay.vue";

    if (!component.render) {
      component.render = template.render;
      component.staticRenderFns = template.staticRenderFns;
      component._compiled = true;

      if (functional) component.functional = true;
    }

    component._scopeId = scope;

    {
      let hook;
      if (style) {
        hook = function(context) {
          style.call(this, createInjector(context));
        };
      }

      if (hook !== undefined) {
        if (component.functional) {
          // register for functional component in vue file
          const originalRender = component.render;
          component.render = function renderWithStyleInjection(h, context) {
            hook.call(context);
            return originalRender(h, context)
          };
        } else {
          // inject component registration as beforeCreate hook
          const existing = component.beforeCreate;
          component.beforeCreate = existing ? [].concat(existing, hook) : [hook];
        }
      }
    }

    return component
  }
  /* style inject */
  function __vue_create_injector__$2() {
    const head = document.head || document.getElementsByTagName('head')[0];
    const styles = __vue_create_injector__$2.styles || (__vue_create_injector__$2.styles = {});
    const isOldIE =
      typeof navigator !== 'undefined' &&
      /msie [6-9]\\b/.test(navigator.userAgent.toLowerCase());

    return function addStyle(id, css) {
      if (document.querySelector('style[data-vue-ssr-id~="' + id + '"]')) return // SSR styles are present.

      const group = isOldIE ? css.media || 'default' : id;
      const style = styles[group] || (styles[group] = { ids: [], parts: [], element: undefined });

      if (!style.ids.includes(id)) {
        let code = css.source;
        let index = style.ids.length;

        style.ids.push(id);

        if (isOldIE) {
          style.element = style.element || document.querySelector('style[data-group=' + group + ']');
        }

        if (!style.element) {
          const el = style.element = document.createElement('style');
          el.type = 'text/css';

          if (css.media) el.setAttribute('media', css.media);
          if (isOldIE) {
            el.setAttribute('data-group', group);
            el.setAttribute('data-next-index', '0');
          }

          head.appendChild(el);
        }

        if (isOldIE) {
          index = parseInt(style.element.getAttribute('data-next-index'));
          style.element.setAttribute('data-next-index', index + 1);
        }

        if (style.element.styleSheet) {
          style.parts.push(code);
          style.element.styleSheet.cssText = style.parts
            .filter(Boolean)
            .join('\n');
        } else {
          const textNode = document.createTextNode(code);
          const nodes = style.element.childNodes;
          if (nodes[index]) style.element.removeChild(nodes[index]);
          if (nodes.length) style.element.insertBefore(textNode, nodes[index]);
          else style.element.appendChild(textNode);
        }
      }
    }
  }
  /* style inject SSR */
  

  
  var IconUgoiraPlay = __vue_normalize__$2(
    { render: __vue_render__$2, staticRenderFns: __vue_staticRenderFns__$2 },
    __vue_inject_styles__$2,
    __vue_script__$2,
    __vue_scope_id__$2,
    __vue_is_functional_template__$2,
    __vue_module_identifier__$2,
    __vue_create_injector__$2,
    undefined
  );

//
//
//
//
//
//
//
//
//
//
//
//

var script$3 = {
  props: {
    actived: {
      default: false,
      type: Boolean,
    },
  },
};

/* script */
            const __vue_script__$3 = script$3;
            
/* template */
var __vue_render__$3 = function() {
  var _vm = this;
  var _h = _vm.$createElement;
  var _c = _vm._self._c || _h;
  return _c(
    "svg",
    {
      staticClass: "i-effect",
      class: _vm.actived ? "f-active" : "f-inactive",
      attrs: { viewBox: "0 0 32 32", width: "32", height: "32" }
    },
    [
      _c("path", {
        attrs: {
          d:
            "M21,5.5 C24.8659932,5.5 28,8.63400675 28,12.5 C28,18.2694439 24.2975093,23.1517313 17.2206059,27.1100183 C16.4622493,27.5342993 15.5379984,27.5343235 14.779626,27.110148 C7.70250208,23.1517462 4,18.2694529 4,12.5 C4,8.63400691 7.13400681,5.5 11,5.5 C12.829814,5.5 14.6210123,6.4144028 16,7.8282366 C17.3789877,6.4144028 19.170186,5.5 21,5.5 Z"
        }
      }),
      _vm._v(" "),
      _c("path", {
        attrs: {
          d:
            "M16,11.3317089 C15.0857201,9.28334665 13.0491506,7.5 11,7.5 C8.23857625,7.5 6,9.73857647 6,12.5 C6,17.4386065 9.2519779,21.7268174 15.7559337,25.3646328 C15.9076021,25.4494645 16.092439,25.4494644 16.2441073,25.3646326 C22.7480325,21.7268037 26,17.4385986 26,12.5 C26,9.73857625 23.7614237,7.5 21,7.5 C18.9508494,7.5 16.9142799,9.28334665 16,11.3317089 Z"
        }
      })
    ]
  )
};
var __vue_staticRenderFns__$3 = [];
__vue_render__$3._withStripped = true;

  /* style */
  const __vue_inject_styles__$3 = function (inject) {
    if (!inject) return
    inject("data-v-2a37bd30_0", { source: "\n.f-active[data-v-2a37bd30] {\n  fill: #ff4060;\n}\n.f-inactive[data-v-2a37bd30] {\n  fill: #fff;\n}\n.f-inactive > path[data-v-2a37bd30]:first-child {\n  fill: #333;\n}\n.i-effect[data-v-2a37bd30] {\n  box-sizing: border-box;\n  font-size: 0;\n  line-height: 0;\n  -webkit-transition: fill 0.2s, stroke 0.2s;\n  transition: fill 0.2s, stroke 0.2s;\n  vertical-align: top;\n}\n", map: {"version":3,"sources":["/home/flandre/dev/Patchouli/src/components/IconBookmarkHeart.vue"],"names":[],"mappings":";AAwBA;EACA,cAAA;CACA;AACA;EACA,WAAA;CACA;AACA;EACA,WAAA;CACA;AACA;EACA,uBAAA;EACA,aAAA;EACA,eAAA;EACA,2CAAA;EACA,mCAAA;EACA,oBAAA;CACA","file":"IconBookmarkHeart.vue","sourcesContent":["<template>\n  <svg\n    :class=\"actived?'f-active':'f-inactive'\"\n    class=\"i-effect\"\n    viewBox=\"0 0 32 32\"\n    width=\"32\"\n    height=\"32\">\n    <path d=\"M21,5.5 C24.8659932,5.5 28,8.63400675 28,12.5 C28,18.2694439 24.2975093,23.1517313 17.2206059,27.1100183 C16.4622493,27.5342993 15.5379984,27.5343235 14.779626,27.110148 C7.70250208,23.1517462 4,18.2694529 4,12.5 C4,8.63400691 7.13400681,5.5 11,5.5 C12.829814,5.5 14.6210123,6.4144028 16,7.8282366 C17.3789877,6.4144028 19.170186,5.5 21,5.5 Z\"/>\n    <path d=\"M16,11.3317089 C15.0857201,9.28334665 13.0491506,7.5 11,7.5 C8.23857625,7.5 6,9.73857647 6,12.5 C6,17.4386065 9.2519779,21.7268174 15.7559337,25.3646328 C15.9076021,25.4494645 16.092439,25.4494644 16.2441073,25.3646326 C22.7480325,21.7268037 26,17.4385986 26,12.5 C26,9.73857625 23.7614237,7.5 21,7.5 C18.9508494,7.5 16.9142799,9.28334665 16,11.3317089 Z\"/>\n  </svg>\n</template>\n\n<script>\nexport default {\n  props: {\n    actived: {\n      default: false,\n      type: Boolean,\n    },\n  },\n};\n</script>\n\n<style scoped>\n.f-active {\n  fill: #ff4060;\n}\n.f-inactive {\n  fill: #fff;\n}\n.f-inactive > path:first-child {\n  fill: #333;\n}\n.i-effect {\n  box-sizing: border-box;\n  font-size: 0;\n  line-height: 0;\n  -webkit-transition: fill 0.2s, stroke 0.2s;\n  transition: fill 0.2s, stroke 0.2s;\n  vertical-align: top;\n}\n</style>\n\n\n\n"]}, media: undefined });

  };
  /* scoped */
  const __vue_scope_id__$3 = "data-v-2a37bd30";
  /* module identifier */
  const __vue_module_identifier__$3 = undefined;
  /* functional template */
  const __vue_is_functional_template__$3 = false;
  /* component normalizer */
  function __vue_normalize__$3(
    template, style, script,
    scope, functional, moduleIdentifier,
    createInjector, createInjectorSSR
  ) {
    const component = (typeof script === 'function' ? script.options : script) || {};

    // For security concerns, we use only base name in production mode.
    component.__file = "/home/flandre/dev/Patchouli/src/components/IconBookmarkHeart.vue";

    if (!component.render) {
      component.render = template.render;
      component.staticRenderFns = template.staticRenderFns;
      component._compiled = true;

      if (functional) component.functional = true;
    }

    component._scopeId = scope;

    {
      let hook;
      if (style) {
        hook = function(context) {
          style.call(this, createInjector(context));
        };
      }

      if (hook !== undefined) {
        if (component.functional) {
          // register for functional component in vue file
          const originalRender = component.render;
          component.render = function renderWithStyleInjection(h, context) {
            hook.call(context);
            return originalRender(h, context)
          };
        } else {
          // inject component registration as beforeCreate hook
          const existing = component.beforeCreate;
          component.beforeCreate = existing ? [].concat(existing, hook) : [hook];
        }
      }
    }

    return component
  }
  /* style inject */
  function __vue_create_injector__$3() {
    const head = document.head || document.getElementsByTagName('head')[0];
    const styles = __vue_create_injector__$3.styles || (__vue_create_injector__$3.styles = {});
    const isOldIE =
      typeof navigator !== 'undefined' &&
      /msie [6-9]\\b/.test(navigator.userAgent.toLowerCase());

    return function addStyle(id, css) {
      if (document.querySelector('style[data-vue-ssr-id~="' + id + '"]')) return // SSR styles are present.

      const group = isOldIE ? css.media || 'default' : id;
      const style = styles[group] || (styles[group] = { ids: [], parts: [], element: undefined });

      if (!style.ids.includes(id)) {
        let code = css.source;
        let index = style.ids.length;

        style.ids.push(id);

        if (isOldIE) {
          style.element = style.element || document.querySelector('style[data-group=' + group + ']');
        }

        if (!style.element) {
          const el = style.element = document.createElement('style');
          el.type = 'text/css';

          if (css.media) el.setAttribute('media', css.media);
          if (isOldIE) {
            el.setAttribute('data-group', group);
            el.setAttribute('data-next-index', '0');
          }

          head.appendChild(el);
        }

        if (isOldIE) {
          index = parseInt(style.element.getAttribute('data-next-index'));
          style.element.setAttribute('data-next-index', index + 1);
        }

        if (style.element.styleSheet) {
          style.parts.push(code);
          style.element.styleSheet.cssText = style.parts
            .filter(Boolean)
            .join('\n');
        } else {
          const textNode = document.createTextNode(code);
          const nodes = style.element.childNodes;
          if (nodes[index]) style.element.removeChild(nodes[index]);
          if (nodes.length) style.element.insertBefore(textNode, nodes[index]);
          else style.element.appendChild(textNode);
        }
      }
    }
  }
  /* style inject SSR */
  

  
  var IconBookmarkHeart = __vue_normalize__$3(
    { render: __vue_render__$3, staticRenderFns: __vue_staticRenderFns__$3 },
    __vue_inject_styles__$3,
    __vue_script__$3,
    __vue_scope_id__$3,
    __vue_is_functional_template__$3,
    __vue_module_identifier__$3,
    __vue_create_injector__$3,
    undefined
  );

//

var script$4 = {
  components: { IconBookmarkHeart, IconUgoiraPlay },
  props: {
    bookmarkId: {
      default: '',
      type: String,
    },
    illustId: {
      default: '',
      type: String,
    },
    illustPageCount: {
      default: 1,
      type: Number,
    },
    imgUrl: {
      default: '',
      type: String,
    },
    isBookmarked: {
      default: false,
      type: Boolean,
    },
    isUgoira: {
      default: false,
      type: Boolean,
    },
  },
  // eslint-disable-next-line sort-keys
  data() {
    return {
      selfIsBookmarked: this.isBookmarked,
      ugoiraMeta: null,
      ugoiraPlayed: false,
      ugoiraPlayer: null,
    };
  },
  // eslint-disable-next-line sort-keys
  computed: {
    canHoverPlay() {
      return this.$store.getters.config.hoverPlay;
    },
    illustPageUrl() {
      return `/member_illust.php?mode=medium&illust_id=${this.illustId}`;
    },
    isSelfBookmarkPage() {
      return this.$store.getters.isSelfBookmarkPage;
    },
  },
  mounted() {
    this.$nextTick(async() => {
      if (this.isUgoira && this.canHoverPlay) {
        this.ugoiraMeta = await PixivAPI.getIllustUgoiraMetaData(this.illustId);
      }
    });
  },
  // eslint-disable-next-line sort-keys
  methods: {
    activateContextMenu(event) {
      $print.debug('DefaultImageItemImage#activateContextMenu', event);
      if (this.$store.state.config.contextMenu) {
        event.preventDefault();

        const payload = {
          data: {
            illustId: this.illustId,
            type: 'image-item-image',
          },
          position: {
            x: event.clientX,
            y: event.clientY,
          },
        };

        this.$store.commit('contextMenu/activate', payload);
      }
    },
    controlUgoira(event) {
      if (!this.ugoiraMeta) {
        return;
      }
      if (!this.ugoiraPlayer) {
        try {
          this.ugoiraPlayer = new ZipImagePlayer({
            autosize: true,
            canvas: this.$refs.smallUgoiraPreview,
            chunkSize: 300000,
            loop: true,
            metadata: this.ugoiraMeta,
            source: this.ugoiraMeta.src,
          });
        } catch (error) {
          $print.error(error);
        }
      }
      if (this.canHoverPlay) {
        if (event.type === 'mouseenter') {
          this.ugoiraPlayed = true;
          this.ugoiraPlayer.play();
        } else {
          this.ugoiraPlayed = false;
          this.ugoiraPlayer.pause();
          this.ugoiraPlayer.rewind();
        }
      }
    },
    async oneClickBookmarkAdd() {
      if (!this.selfIsBookmarked) {
        if (await PixivAPI.postRPCAddBookmark(this.illustId)) {
          this.selfIsBookmarked = true;
        }
      } else {
        // this.bookmarkId might be empty...
        // Because RPC API has no bookmarkId returned...
        let bookmarkId = this.bookmarkId;
        if (!bookmarkId) {
          const data = await PixivAPI.getIllustBookmarkData(this.illustId);
          bookmarkId = data.bookmarkData.id;
        }
        if (await PixivAPI.postRPCDeleteBookmark(bookmarkId)) {
          this.selfIsBookmarked = false;
        }
      }
    },
  },
};

/* script */
            const __vue_script__$4 = script$4;
            
/* template */
var __vue_render__$4 = function() {
  var _vm = this;
  var _h = _vm.$createElement;
  var _c = _vm._self._c || _h;
  return _c("div", { staticClass: "image-item-image" }, [
    _c(
      "a",
      {
        staticClass: "image-flexbox",
        attrs: { href: _vm.illustPageUrl, rel: "noopener" },
        on: {
          contextmenu: function($event) {
            return _vm.activateContextMenu($event)
          },
          mouseenter: _vm.controlUgoira,
          mouseleave: _vm.controlUgoira
        }
      },
      [
        _vm.illustPageCount > 1
          ? _c("div", { staticClass: "top-right-slot" }, [
              _c("span", [
                _c("i", { staticClass: "far fa-images" }),
                _vm._v("\n        " + _vm._s(_vm.illustPageCount))
              ])
            ])
          : _vm._e(),
        _vm._v(" "),
        _c("img", {
          directives: [
            {
              name: "show",
              rawName: "v-show",
              value: !_vm.ugoiraPlayed,
              expression: "!ugoiraPlayed"
            }
          ],
          attrs: { "data-src": _vm.imgUrl, src: _vm.imgUrl }
        }),
        _vm._v(" "),
        _vm.isUgoira
          ? _c("IconUgoiraPlay", {
              directives: [
                {
                  name: "show",
                  rawName: "v-show",
                  value: !_vm.ugoiraPlayed,
                  expression: "!ugoiraPlayed"
                }
              ],
              attrs: { size: 60 }
            })
          : _vm._e(),
        _vm._v(" "),
        _vm.isUgoira
          ? _c("canvas", {
              directives: [
                {
                  name: "show",
                  rawName: "v-show",
                  value: _vm.ugoiraPlayed,
                  expression: "ugoiraPlayed"
                }
              ],
              ref: "smallUgoiraPreview"
            })
          : _vm._e()
      ],
      1
    ),
    _vm._v(" "),
    _c(
      "div",
      { staticClass: "bookmark-heart-block" },
      [
        _c("IconBookmarkHeart", {
          attrs: { actived: _vm.selfIsBookmarked },
          on: {
            click: function($event) {
              if (
                !("button" in $event) &&
                _vm._k($event.keyCode, "left", 37, $event.key, [
                  "Left",
                  "ArrowLeft"
                ])
              ) {
                return null
              }
              if ("button" in $event && $event.button !== 0) {
                return null
              }
              $event.preventDefault();
              $event.stopPropagation();
              return _vm.oneClickBookmarkAdd($event)
            }
          }
        })
      ],
      1
    ),
    _vm._v(" "),
    _vm.isSelfBookmarkPage
      ? _c("div", { staticClass: "bookmark-input-container" }, [
          _c("input", {
            attrs: { type: "checkbox", name: "book_id[]" },
            domProps: { value: _vm.bookmarkId }
          })
        ])
      : _vm._e()
  ])
};
var __vue_staticRenderFns__$4 = [];
__vue_render__$4._withStripped = true;

  /* style */
  const __vue_inject_styles__$4 = function (inject) {
    if (!inject) return
    inject("data-v-5165e7fc_0", { source: "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n/*\n@pixiv.override.css\n:root {\n  --default-image-item-image-square-size: 184px;\n}\n*/\n.image-item-image[data-v-5165e7fc] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  position: relative;\n}\n.image-flexbox[data-v-5165e7fc] {\n  display: flex;\n  flex-flow: column;\n  justify-content: center;\n  align-items: center;\n  z-index: 0;\n  border: 1px solid rgba(0, 0, 0, 0.04);\n  position: relative;\n  height: var(--default-image-item-image-square-size);\n  width: var(--default-image-item-image-square-size);\n}\n.image-flexbox[data-v-5165e7fc]:hover {\n  text-decoration: none;\n}\n.top-right-slot[data-v-5165e7fc] {\n  flex: none;\n  display: flex;\n  align-items: center;\n  z-index: 1;\n  box-sizing: border-box;\n  margin: 0 0 -24px auto;\n  padding: 6px;\n  height: 24px;\n  background: #000;\n  background: rgba(0, 0, 0, 0.4);\n  border-radius: 0 0 0 4px;\n  color: #fff;\n  font-size: 12px;\n  line-height: 1;\n  font-weight: 700;\n}\n.ugoira-icon[data-v-5165e7fc] {\n  position: absolute;\n}\nimg[data-v-5165e7fc],\ncanvas[data-v-5165e7fc] {\n  max-height: 100%;\n  max-width: 100%;\n}\n.bookmark-input-container[data-v-5165e7fc] {\n  position: absolute;\n  left: 0;\n  top: 0;\n  background: rgba(0, 0, 0, 0.4);\n  padding: 6px;\n  border-radius: 0 0 4px 0;\n}\n.bookmark-heart-block[data-v-5165e7fc] {\n  position: absolute;\n  bottom: 0;\n  right: 0;\n}\n", map: {"version":3,"sources":["/home/flandre/dev/Patchouli/src/components/DefaultImageItemImage.vue"],"names":[],"mappings":";;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;AA+KA;;;;;EAKA;AACA;EACA,cAAA;EACA,oBAAA;EACA,wBAAA;EACA,mBAAA;CACA;AACA;EACA,cAAA;EACA,kBAAA;EACA,wBAAA;EACA,oBAAA;EACA,WAAA;EACA,sCAAA;EACA,mBAAA;EACA,oDAAA;EACA,mDAAA;CACA;AACA;EACA,sBAAA;CACA;AACA;EACA,WAAA;EACA,cAAA;EACA,oBAAA;EACA,WAAA;EACA,uBAAA;EACA,uBAAA;EACA,aAAA;EACA,aAAA;EACA,iBAAA;EACA,+BAAA;EACA,yBAAA;EACA,YAAA;EACA,gBAAA;EACA,eAAA;EACA,iBAAA;CACA;AACA;EACA,mBAAA;CACA;AACA;;EAEA,iBAAA;EACA,gBAAA;CACA;AACA;EACA,mBAAA;EACA,QAAA;EACA,OAAA;EACA,+BAAA;EACA,aAAA;EACA,yBAAA;CACA;AACA;EACA,mBAAA;EACA,UAAA;EACA,SAAA;CACA","file":"DefaultImageItemImage.vue","sourcesContent":["<template>\n  <div class=\"image-item-image\">\n    <a\n      :href=\"illustPageUrl\"\n      class=\"image-flexbox\"\n      rel=\"noopener\"\n      @click.right=\"activateContextMenu\"\n      @mouseenter=\"controlUgoira\"\n      @mouseleave=\"controlUgoira\">\n\n      <div v-if=\"illustPageCount > 1\" class=\"top-right-slot\">\n        <span><i class=\"far fa-images\"/>\n          {{ illustPageCount }}</span>\n      </div>\n\n      <img\n        v-show=\"!ugoiraPlayed\"\n        :data-src=\"imgUrl\"\n        :src=\"imgUrl\">\n      <IconUgoiraPlay\n        v-if=\"isUgoira\"\n        v-show=\"!ugoiraPlayed\"\n        :size=\"60\"/>\n      <canvas\n        v-if=\"isUgoira\"\n        v-show=\"ugoiraPlayed\"\n        ref=\"smallUgoiraPreview\"/>\n    </a>\n    <div class=\"bookmark-heart-block\">\n      <IconBookmarkHeart :actived=\"selfIsBookmarked\" @click.left.prevent.stop=\"oneClickBookmarkAdd\"/>\n    </div>\n    <div v-if=\"isSelfBookmarkPage\" class=\"bookmark-input-container\">\n      <input\n        :value=\"bookmarkId\"\n        type=\"checkbox\"\n        name=\"book_id[]\">\n    </div>\n  </div>\n</template>\n\n<script>\nimport { $print } from '../lib/utils';\nimport { PixivAPI } from '../lib/pixiv';\nimport IconUgoiraPlay from './IconUgoiraPlay.vue';\nimport IconBookmarkHeart from './IconBookmarkHeart.vue';\n\nexport default {\n  components: { IconBookmarkHeart, IconUgoiraPlay },\n  props: {\n    bookmarkId: {\n      default: '',\n      type: String,\n    },\n    illustId: {\n      default: '',\n      type: String,\n    },\n    illustPageCount: {\n      default: 1,\n      type: Number,\n    },\n    imgUrl: {\n      default: '',\n      type: String,\n    },\n    isBookmarked: {\n      default: false,\n      type: Boolean,\n    },\n    isUgoira: {\n      default: false,\n      type: Boolean,\n    },\n  },\n  // eslint-disable-next-line sort-keys\n  data() {\n    return {\n      selfIsBookmarked: this.isBookmarked,\n      ugoiraMeta: null,\n      ugoiraPlayed: false,\n      ugoiraPlayer: null,\n    };\n  },\n  // eslint-disable-next-line sort-keys\n  computed: {\n    canHoverPlay() {\n      return this.$store.getters.config.hoverPlay;\n    },\n    illustPageUrl() {\n      return `/member_illust.php?mode=medium&illust_id=${this.illustId}`;\n    },\n    isSelfBookmarkPage() {\n      return this.$store.getters.isSelfBookmarkPage;\n    },\n  },\n  mounted() {\n    this.$nextTick(async() => {\n      if (this.isUgoira && this.canHoverPlay) {\n        this.ugoiraMeta = await PixivAPI.getIllustUgoiraMetaData(this.illustId);\n      }\n    });\n  },\n  // eslint-disable-next-line sort-keys\n  methods: {\n    activateContextMenu(event) {\n      $print.debug('DefaultImageItemImage#activateContextMenu', event);\n      if (this.$store.state.config.contextMenu) {\n        event.preventDefault();\n\n        const payload = {\n          data: {\n            illustId: this.illustId,\n            type: 'image-item-image',\n          },\n          position: {\n            x: event.clientX,\n            y: event.clientY,\n          },\n        };\n\n        this.$store.commit('contextMenu/activate', payload);\n      }\n    },\n    controlUgoira(event) {\n      if (!this.ugoiraMeta) {\n        return;\n      }\n      if (!this.ugoiraPlayer) {\n        try {\n          this.ugoiraPlayer = new ZipImagePlayer({\n            autosize: true,\n            canvas: this.$refs.smallUgoiraPreview,\n            chunkSize: 300000,\n            loop: true,\n            metadata: this.ugoiraMeta,\n            source: this.ugoiraMeta.src,\n          });\n        } catch (error) {\n          $print.error(error);\n        }\n      }\n      if (this.canHoverPlay) {\n        if (event.type === 'mouseenter') {\n          this.ugoiraPlayed = true;\n          this.ugoiraPlayer.play();\n        } else {\n          this.ugoiraPlayed = false;\n          this.ugoiraPlayer.pause();\n          this.ugoiraPlayer.rewind();\n        }\n      }\n    },\n    async oneClickBookmarkAdd() {\n      if (!this.selfIsBookmarked) {\n        if (await PixivAPI.postRPCAddBookmark(this.illustId)) {\n          this.selfIsBookmarked = true;\n        }\n      } else {\n        // this.bookmarkId might be empty...\n        // Because RPC API has no bookmarkId returned...\n        let bookmarkId = this.bookmarkId;\n        if (!bookmarkId) {\n          const data = await PixivAPI.getIllustBookmarkData(this.illustId);\n          bookmarkId = data.bookmarkData.id;\n        }\n        if (await PixivAPI.postRPCDeleteBookmark(bookmarkId)) {\n          this.selfIsBookmarked = false;\n        }\n      }\n    },\n  },\n};\n</script>\n\n<style scoped>\n/*\n@pixiv.override.css\n:root {\n  --default-image-item-image-square-size: 184px;\n}\n*/\n.image-item-image {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  position: relative;\n}\n.image-flexbox {\n  display: flex;\n  flex-flow: column;\n  justify-content: center;\n  align-items: center;\n  z-index: 0;\n  border: 1px solid rgba(0, 0, 0, 0.04);\n  position: relative;\n  height: var(--default-image-item-image-square-size);\n  width: var(--default-image-item-image-square-size);\n}\n.image-flexbox:hover {\n  text-decoration: none;\n}\n.top-right-slot {\n  flex: none;\n  display: flex;\n  align-items: center;\n  z-index: 1;\n  box-sizing: border-box;\n  margin: 0 0 -24px auto;\n  padding: 6px;\n  height: 24px;\n  background: #000;\n  background: rgba(0, 0, 0, 0.4);\n  border-radius: 0 0 0 4px;\n  color: #fff;\n  font-size: 12px;\n  line-height: 1;\n  font-weight: 700;\n}\n.ugoira-icon {\n  position: absolute;\n}\nimg,\ncanvas {\n  max-height: 100%;\n  max-width: 100%;\n}\n.bookmark-input-container {\n  position: absolute;\n  left: 0;\n  top: 0;\n  background: rgba(0, 0, 0, 0.4);\n  padding: 6px;\n  border-radius: 0 0 4px 0;\n}\n.bookmark-heart-block {\n  position: absolute;\n  bottom: 0;\n  right: 0;\n}\n</style>\n"]}, media: undefined });

  };
  /* scoped */
  const __vue_scope_id__$4 = "data-v-5165e7fc";
  /* module identifier */
  const __vue_module_identifier__$4 = undefined;
  /* functional template */
  const __vue_is_functional_template__$4 = false;
  /* component normalizer */
  function __vue_normalize__$4(
    template, style, script,
    scope, functional, moduleIdentifier,
    createInjector, createInjectorSSR
  ) {
    const component = (typeof script === 'function' ? script.options : script) || {};

    // For security concerns, we use only base name in production mode.
    component.__file = "/home/flandre/dev/Patchouli/src/components/DefaultImageItemImage.vue";

    if (!component.render) {
      component.render = template.render;
      component.staticRenderFns = template.staticRenderFns;
      component._compiled = true;

      if (functional) component.functional = true;
    }

    component._scopeId = scope;

    {
      let hook;
      if (style) {
        hook = function(context) {
          style.call(this, createInjector(context));
        };
      }

      if (hook !== undefined) {
        if (component.functional) {
          // register for functional component in vue file
          const originalRender = component.render;
          component.render = function renderWithStyleInjection(h, context) {
            hook.call(context);
            return originalRender(h, context)
          };
        } else {
          // inject component registration as beforeCreate hook
          const existing = component.beforeCreate;
          component.beforeCreate = existing ? [].concat(existing, hook) : [hook];
        }
      }
    }

    return component
  }
  /* style inject */
  function __vue_create_injector__$4() {
    const head = document.head || document.getElementsByTagName('head')[0];
    const styles = __vue_create_injector__$4.styles || (__vue_create_injector__$4.styles = {});
    const isOldIE =
      typeof navigator !== 'undefined' &&
      /msie [6-9]\\b/.test(navigator.userAgent.toLowerCase());

    return function addStyle(id, css) {
      if (document.querySelector('style[data-vue-ssr-id~="' + id + '"]')) return // SSR styles are present.

      const group = isOldIE ? css.media || 'default' : id;
      const style = styles[group] || (styles[group] = { ids: [], parts: [], element: undefined });

      if (!style.ids.includes(id)) {
        let code = css.source;
        let index = style.ids.length;

        style.ids.push(id);

        if (isOldIE) {
          style.element = style.element || document.querySelector('style[data-group=' + group + ']');
        }

        if (!style.element) {
          const el = style.element = document.createElement('style');
          el.type = 'text/css';

          if (css.media) el.setAttribute('media', css.media);
          if (isOldIE) {
            el.setAttribute('data-group', group);
            el.setAttribute('data-next-index', '0');
          }

          head.appendChild(el);
        }

        if (isOldIE) {
          index = parseInt(style.element.getAttribute('data-next-index'));
          style.element.setAttribute('data-next-index', index + 1);
        }

        if (style.element.styleSheet) {
          style.parts.push(code);
          style.element.styleSheet.cssText = style.parts
            .filter(Boolean)
            .join('\n');
        } else {
          const textNode = document.createTextNode(code);
          const nodes = style.element.childNodes;
          if (nodes[index]) style.element.removeChild(nodes[index]);
          if (nodes.length) style.element.insertBefore(textNode, nodes[index]);
          else style.element.appendChild(textNode);
        }
      }
    }
  }
  /* style inject SSR */
  

  
  var DefaultImageItemImage = __vue_normalize__$4(
    { render: __vue_render__$4, staticRenderFns: __vue_staticRenderFns__$4 },
    __vue_inject_styles__$4,
    __vue_script__$4,
    __vue_scope_id__$4,
    __vue_is_functional_template__$4,
    __vue_module_identifier__$4,
    __vue_create_injector__$4,
    undefined
  );

//

var script$5 = {
  props: {
    bookmarkCount: {
      default: 0,
      type: Number,
    },
    illustId: {
      default: '',
      type: String,
    },
    illustTitle: {
      default: '',
      type: String,
    },
    isFollowed: {
      default: false,
      type: Boolean,
    },
    profileImgUrl: {
      default: '',
      type: String,
    },
    userId: {
      default: '',
      type: String,
    },
    userName: {
      default: '',
      type: String,
    },
  },
  // eslint-disable-next-line sort-keys
  computed: {
    bookmarkDetailUrl() {
      return `/bookmark_detail.php?illust_id=${this.illustId}`;
    },
    bookmarkTooltipMsg() {
      return this.$t('mainView.bookmarkTooltip', {
        count: this.bookmarkCount,
      });
    },
    illustPageUrl() {
      return `/member_illust.php?mode=medium&illust_id=${this.illustId}`;
    },
    isEnableUserTooltip() {
      return this.$store.state.config.userTooltip;
    },
    profileImgStyle() {
      return {
        backgroundImage: `url(${this.profileImgUrl})`,
      };
    },
    userPageUrl() {
      return `/member_illust.php?id=${this.userId}`;
    },
  },
  methods: {
    activateContextMenu(event) {
      $print.debug('DefaultImageItemTitle#activateContextMenu', event);
      if (this.$store.state.config.contextMenu) {
        event.preventDefault();

        const payload = {
          position: {
            x: event.clientX,
            y: event.clientY,
          },
        };

        const ct = event.currentTarget;
        if (ct.classList.contains('user-info')) {
          payload.data = {
            illustId: this.illustId,
            type: 'image-item-title-user',
          };
        } else {
          payload.data = {
            illustId: this.illustId,
            type: 'image-item-image',
          };
        }

        this.$store.commit('contextMenu/activate', payload);
      }
    },
  },
};

/* script */
            const __vue_script__$5 = script$5;
            
/* template */
var __vue_render__$5 = function() {
  var _vm = this;
  var _h = _vm.$createElement;
  var _c = _vm._self._c || _h;
  return _c("figcaption", { staticClass: "image-item-title-user" }, [
    _c("ul", [
      _c(
        "li",
        {
          staticClass: "title-text",
          on: {
            contextmenu: function($event) {
              return _vm.activateContextMenu($event)
            }
          }
        },
        [
          _c(
            "a",
            { attrs: { href: _vm.illustPageUrl, title: _vm.illustTitle } },
            [_vm._v(_vm._s(_vm.illustTitle))]
          )
        ]
      ),
      _vm._v(" "),
      _c(
        "li",
        {
          staticClass: "user-info",
          on: {
            contextmenu: function($event) {
              return _vm.activateContextMenu($event)
            }
          }
        },
        [
          _c(
            "a",
            {
              staticClass: "user-link",
              class: _vm.isEnableUserTooltip ? "ui-profile-popup" : "",
              attrs: {
                href: _vm.userPageUrl,
                title: _vm.userName,
                "data-user_id": _vm.userId,
                "data-user_name": _vm.userName,
                target: "_blank"
              }
            },
            [
              _c("span", {
                staticClass: "user-img",
                style: _vm.profileImgStyle
              }),
              _vm._v(" "),
              _c("span", [_vm._v(_vm._s(_vm.userName))])
            ]
          ),
          _vm._v(" "),
          _vm.isFollowed ? _c("i", { staticClass: "fas fa-rss" }) : _vm._e()
        ]
      ),
      _vm._v(" "),
      _vm.bookmarkCount > 0
        ? _c("li", [
            _c("ul", { staticClass: "count-list" }, [
              _c("li", [
                _c(
                  "a",
                  {
                    staticClass: "_ui-tooltip bookmark-count",
                    attrs: {
                      href: _vm.bookmarkDetailUrl,
                      "data-tooltip": _vm.$t("mainView.bookmarkTooltip", {
                        count: _vm.bookmarkCount
                      })
                    }
                  },
                  [
                    _c("i", { staticClass: "_icon _bookmark-icon-inline" }),
                    _vm._v(
                      "\n            " +
                        _vm._s(_vm.bookmarkCount) +
                        "\n          "
                    )
                  ]
                )
              ])
            ])
          ])
        : _vm._e()
    ])
  ])
};
var __vue_staticRenderFns__$5 = [];
__vue_render__$5._withStripped = true;

  /* style */
  const __vue_inject_styles__$5 = function (inject) {
    if (!inject) return
    inject("data-v-6cfe9952_0", { source: "\n.image-item-title-user[data-v-6cfe9952] {\n  max-width: 100%;\n  margin: 8px auto;\n  text-align: center;\n  color: #333;\n  font-size: 12px;\n  line-height: 1;\n}\n.title-text[data-v-6cfe9952] {\n  margin: 4px 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  font-weight: 700;\n}\n.user-info[data-v-6cfe9952] {\n  display: inline-flex;\n  align-items: center;\n}\n.user-link[data-v-6cfe9952] {\n  font-size: 12px;\n  display: inline-flex;\n  align-items: center;\n}\n.user-img[data-v-6cfe9952] {\n  width: 20px;\n  height: 20px;\n  display: inline-block;\n  background-size: cover;\n  border-radius: 50%;\n  margin-right: 4px;\n}\ni.fa-rss[data-v-6cfe9952] {\n  display: inline-block;\n  margin-left: 4px;\n  width: 16px;\n  height: 16px;\n  color: dodgerblue;\n}\n", map: {"version":3,"sources":["/home/flandre/dev/Patchouli/src/components/DefaultImageItemTitle.vue"],"names":[],"mappings":";AAoIA;EACA,gBAAA;EACA,iBAAA;EACA,mBAAA;EACA,YAAA;EACA,gBAAA;EACA,eAAA;CACA;AACA;EACA,cAAA;EACA,iBAAA;EACA,wBAAA;EACA,oBAAA;EACA,iBAAA;CACA;AACA;EACA,qBAAA;EACA,oBAAA;CACA;AACA;EACA,gBAAA;EACA,qBAAA;EACA,oBAAA;CACA;AACA;EACA,YAAA;EACA,aAAA;EACA,sBAAA;EACA,uBAAA;EACA,mBAAA;EACA,kBAAA;CACA;AACA;EACA,sBAAA;EACA,iBAAA;EACA,YAAA;EACA,aAAA;EACA,kBAAA;CACA","file":"DefaultImageItemTitle.vue","sourcesContent":["<template>\n  <figcaption class=\"image-item-title-user\">\n    <ul>\n      <li class=\"title-text\" @click.right=\"activateContextMenu\">\n        <a :href=\"illustPageUrl\" :title=\"illustTitle\">{{ illustTitle }}</a>\n      </li>\n      <li\n        class=\"user-info\"\n        @click.right=\"activateContextMenu\">\n        <a\n          :href=\"userPageUrl\"\n          :title=\"userName\"\n          :data-user_id=\"userId\"\n          :data-user_name=\"userName\"\n          :class=\"isEnableUserTooltip ? 'ui-profile-popup' : ''\"\n          class=\"user-link\"\n          target=\"_blank\">\n          <span :style=\"profileImgStyle\" class=\"user-img\"/>\n          <span>{{ userName }}</span>\n        </a>\n        <i v-if=\"isFollowed\" class=\"fas fa-rss\"/>\n      </li>\n      <li v-if=\"bookmarkCount > 0\">\n        <ul class=\"count-list\">\n          <li>\n            <a\n              :href=\"bookmarkDetailUrl\"\n              :data-tooltip=\"$t('mainView.bookmarkTooltip', { count: bookmarkCount })\"\n              class=\"_ui-tooltip bookmark-count\">\n              <i class=\"_icon _bookmark-icon-inline\"/>\n              {{ bookmarkCount }}\n            </a>\n          </li>\n        </ul>\n      </li>\n    </ul>\n  </figcaption>\n</template>\n\n<script>\nimport { $print } from '../lib/utils';\n\nexport default {\n  props: {\n    bookmarkCount: {\n      default: 0,\n      type: Number,\n    },\n    illustId: {\n      default: '',\n      type: String,\n    },\n    illustTitle: {\n      default: '',\n      type: String,\n    },\n    isFollowed: {\n      default: false,\n      type: Boolean,\n    },\n    profileImgUrl: {\n      default: '',\n      type: String,\n    },\n    userId: {\n      default: '',\n      type: String,\n    },\n    userName: {\n      default: '',\n      type: String,\n    },\n  },\n  // eslint-disable-next-line sort-keys\n  computed: {\n    bookmarkDetailUrl() {\n      return `/bookmark_detail.php?illust_id=${this.illustId}`;\n    },\n    bookmarkTooltipMsg() {\n      return this.$t('mainView.bookmarkTooltip', {\n        count: this.bookmarkCount,\n      });\n    },\n    illustPageUrl() {\n      return `/member_illust.php?mode=medium&illust_id=${this.illustId}`;\n    },\n    isEnableUserTooltip() {\n      return this.$store.state.config.userTooltip;\n    },\n    profileImgStyle() {\n      return {\n        backgroundImage: `url(${this.profileImgUrl})`,\n      };\n    },\n    userPageUrl() {\n      return `/member_illust.php?id=${this.userId}`;\n    },\n  },\n  methods: {\n    activateContextMenu(event) {\n      $print.debug('DefaultImageItemTitle#activateContextMenu', event);\n      if (this.$store.state.config.contextMenu) {\n        event.preventDefault();\n\n        const payload = {\n          position: {\n            x: event.clientX,\n            y: event.clientY,\n          },\n        };\n\n        const ct = event.currentTarget;\n        if (ct.classList.contains('user-info')) {\n          payload.data = {\n            illustId: this.illustId,\n            type: 'image-item-title-user',\n          };\n        } else {\n          payload.data = {\n            illustId: this.illustId,\n            type: 'image-item-image',\n          };\n        }\n\n        this.$store.commit('contextMenu/activate', payload);\n      }\n    },\n  },\n};\n</script>\n\n<style scoped>\n.image-item-title-user {\n  max-width: 100%;\n  margin: 8px auto;\n  text-align: center;\n  color: #333;\n  font-size: 12px;\n  line-height: 1;\n}\n.title-text {\n  margin: 4px 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  font-weight: 700;\n}\n.user-info {\n  display: inline-flex;\n  align-items: center;\n}\n.user-link {\n  font-size: 12px;\n  display: inline-flex;\n  align-items: center;\n}\n.user-img {\n  width: 20px;\n  height: 20px;\n  display: inline-block;\n  background-size: cover;\n  border-radius: 50%;\n  margin-right: 4px;\n}\ni.fa-rss {\n  display: inline-block;\n  margin-left: 4px;\n  width: 16px;\n  height: 16px;\n  color: dodgerblue;\n}\n</style>\n"]}, media: undefined });

  };
  /* scoped */
  const __vue_scope_id__$5 = "data-v-6cfe9952";
  /* module identifier */
  const __vue_module_identifier__$5 = undefined;
  /* functional template */
  const __vue_is_functional_template__$5 = false;
  /* component normalizer */
  function __vue_normalize__$5(
    template, style, script,
    scope, functional, moduleIdentifier,
    createInjector, createInjectorSSR
  ) {
    const component = (typeof script === 'function' ? script.options : script) || {};

    // For security concerns, we use only base name in production mode.
    component.__file = "/home/flandre/dev/Patchouli/src/components/DefaultImageItemTitle.vue";

    if (!component.render) {
      component.render = template.render;
      component.staticRenderFns = template.staticRenderFns;
      component._compiled = true;

      if (functional) component.functional = true;
    }

    component._scopeId = scope;

    {
      let hook;
      if (style) {
        hook = function(context) {
          style.call(this, createInjector(context));
        };
      }

      if (hook !== undefined) {
        if (component.functional) {
          // register for functional component in vue file
          const originalRender = component.render;
          component.render = function renderWithStyleInjection(h, context) {
            hook.call(context);
            return originalRender(h, context)
          };
        } else {
          // inject component registration as beforeCreate hook
          const existing = component.beforeCreate;
          component.beforeCreate = existing ? [].concat(existing, hook) : [hook];
        }
      }
    }

    return component
  }
  /* style inject */
  function __vue_create_injector__$5() {
    const head = document.head || document.getElementsByTagName('head')[0];
    const styles = __vue_create_injector__$5.styles || (__vue_create_injector__$5.styles = {});
    const isOldIE =
      typeof navigator !== 'undefined' &&
      /msie [6-9]\\b/.test(navigator.userAgent.toLowerCase());

    return function addStyle(id, css) {
      if (document.querySelector('style[data-vue-ssr-id~="' + id + '"]')) return // SSR styles are present.

      const group = isOldIE ? css.media || 'default' : id;
      const style = styles[group] || (styles[group] = { ids: [], parts: [], element: undefined });

      if (!style.ids.includes(id)) {
        let code = css.source;
        let index = style.ids.length;

        style.ids.push(id);

        if (isOldIE) {
          style.element = style.element || document.querySelector('style[data-group=' + group + ']');
        }

        if (!style.element) {
          const el = style.element = document.createElement('style');
          el.type = 'text/css';

          if (css.media) el.setAttribute('media', css.media);
          if (isOldIE) {
            el.setAttribute('data-group', group);
            el.setAttribute('data-next-index', '0');
          }

          head.appendChild(el);
        }

        if (isOldIE) {
          index = parseInt(style.element.getAttribute('data-next-index'));
          style.element.setAttribute('data-next-index', index + 1);
        }

        if (style.element.styleSheet) {
          style.parts.push(code);
          style.element.styleSheet.cssText = style.parts
            .filter(Boolean)
            .join('\n');
        } else {
          const textNode = document.createTextNode(code);
          const nodes = style.element.childNodes;
          if (nodes[index]) style.element.removeChild(nodes[index]);
          if (nodes.length) style.element.insertBefore(textNode, nodes[index]);
          else style.element.appendChild(textNode);
        }
      }
    }
  }
  /* style inject SSR */
  

  
  var DefaultImageItemTitle = __vue_normalize__$5(
    { render: __vue_render__$5, staticRenderFns: __vue_staticRenderFns__$5 },
    __vue_inject_styles__$5,
    __vue_script__$5,
    __vue_scope_id__$5,
    __vue_is_functional_template__$5,
    __vue_module_identifier__$5,
    __vue_create_injector__$5,
    undefined
  );

//

var script$6 = {
  components: { DefaultImageItemImage, DefaultImageItemTitle },
  props: {
    bookmarkCount: {
      default: 0,
      type: Number,
    },
    bookmarkId: {
      default: '',
      type: String,
    },
    illustId: {
      default: '',
      type: String,
    },
    illustPageCount: {
      default: 1,
      type: Number,
    },
    illustTitle: {
      default: '',
      type: String,
    },
    imgUrl: {
      default: '',
      type: String,
    },
    isBookmarked: {
      default: false,
      type: Boolean,
    },
    isFollowed: {
      default: false,
      type: Boolean,
    },
    isUgoira: {
      default: false,
      type: Boolean,
    },
    profileImgUrl: {
      default: '',
      type: String,
    },
    userId: {
      default: '',
      type: String,
    },
    userName: {
      default: '',
      type: String,
    },
  },
};

/* script */
            const __vue_script__$6 = script$6;
            
/* template */
var __vue_render__$6 = function() {
  var _vm = this;
  var _h = _vm.$createElement;
  var _c = _vm._self._c || _h;
  return _c("div", { staticClass: "image-item" }, [
    _c(
      "figure",
      { staticClass: "image-item-inner" },
      [
        _c("DefaultImageItemImage", {
          attrs: {
            "img-url": _vm.imgUrl,
            "illust-id": _vm.illustId,
            "illust-page-count": _vm.illustPageCount,
            "is-ugoira": _vm.isUgoira,
            "is-bookmarked": _vm.isBookmarked,
            "bookmark-id": _vm.bookmarkId
          }
        }),
        _vm._v(" "),
        _c("DefaultImageItemTitle", {
          attrs: {
            "illust-id": _vm.illustId,
            "illust-title": _vm.illustTitle,
            "user-name": _vm.userName,
            "user-id": _vm.userId,
            "is-followed": _vm.isFollowed,
            "profile-img-url": _vm.profileImgUrl,
            "bookmark-count": _vm.bookmarkCount
          }
        })
      ],
      1
    )
  ])
};
var __vue_staticRenderFns__$6 = [];
__vue_render__$6._withStripped = true;

  /* style */
  const __vue_inject_styles__$6 = function (inject) {
    if (!inject) return
    inject("data-v-2ff3eadc_0", { source: "\n.image-item[data-v-2ff3eadc] {\n  display: flex;\n  justify-content: center;\n  margin: 0 0 30px 0;\n  padding: 10px;\n  height: auto;\n  width: 200px;\n}\n.image-item-inner[data-v-2ff3eadc] {\n  display: flex;\n  flex-flow: column;\n  max-width: 100%;\n  max-height: 300px;\n}\n", map: {"version":3,"sources":["/home/flandre/dev/Patchouli/src/components/DefaultImageItem.vue"],"names":[],"mappings":";AAkFA;EACA,cAAA;EACA,wBAAA;EACA,mBAAA;EACA,cAAA;EACA,aAAA;EACA,aAAA;CACA;AACA;EACA,cAAA;EACA,kBAAA;EACA,gBAAA;EACA,kBAAA;CACA","file":"DefaultImageItem.vue","sourcesContent":["<template>\n  <div class=\"image-item\">\n    <figure class=\"image-item-inner\">\n      <DefaultImageItemImage\n        :img-url=\"imgUrl\"\n        :illust-id=\"illustId\"\n        :illust-page-count=\"illustPageCount\"\n        :is-ugoira=\"isUgoira\"\n        :is-bookmarked=\"isBookmarked\"\n        :bookmark-id=\"bookmarkId\"/>\n      <DefaultImageItemTitle\n        :illust-id=\"illustId\"\n        :illust-title=\"illustTitle\"\n        :user-name=\"userName\"\n        :user-id=\"userId\"\n        :is-followed=\"isFollowed\"\n        :profile-img-url=\"profileImgUrl\"\n        :bookmark-count=\"bookmarkCount\"/>\n    </figure>\n  </div>\n</template>\n\n<script>\nimport DefaultImageItemImage from './DefaultImageItemImage.vue';\nimport DefaultImageItemTitle from './DefaultImageItemTitle.vue';\n\nexport default {\n  components: { DefaultImageItemImage, DefaultImageItemTitle },\n  props: {\n    bookmarkCount: {\n      default: 0,\n      type: Number,\n    },\n    bookmarkId: {\n      default: '',\n      type: String,\n    },\n    illustId: {\n      default: '',\n      type: String,\n    },\n    illustPageCount: {\n      default: 1,\n      type: Number,\n    },\n    illustTitle: {\n      default: '',\n      type: String,\n    },\n    imgUrl: {\n      default: '',\n      type: String,\n    },\n    isBookmarked: {\n      default: false,\n      type: Boolean,\n    },\n    isFollowed: {\n      default: false,\n      type: Boolean,\n    },\n    isUgoira: {\n      default: false,\n      type: Boolean,\n    },\n    profileImgUrl: {\n      default: '',\n      type: String,\n    },\n    userId: {\n      default: '',\n      type: String,\n    },\n    userName: {\n      default: '',\n      type: String,\n    },\n  },\n};\n</script>\n\n<style scoped>\n.image-item {\n  display: flex;\n  justify-content: center;\n  margin: 0 0 30px 0;\n  padding: 10px;\n  height: auto;\n  width: 200px;\n}\n.image-item-inner {\n  display: flex;\n  flex-flow: column;\n  max-width: 100%;\n  max-height: 300px;\n}\n</style>\n"]}, media: undefined });

  };
  /* scoped */
  const __vue_scope_id__$6 = "data-v-2ff3eadc";
  /* module identifier */
  const __vue_module_identifier__$6 = undefined;
  /* functional template */
  const __vue_is_functional_template__$6 = false;
  /* component normalizer */
  function __vue_normalize__$6(
    template, style, script,
    scope, functional, moduleIdentifier,
    createInjector, createInjectorSSR
  ) {
    const component = (typeof script === 'function' ? script.options : script) || {};

    // For security concerns, we use only base name in production mode.
    component.__file = "/home/flandre/dev/Patchouli/src/components/DefaultImageItem.vue";

    if (!component.render) {
      component.render = template.render;
      component.staticRenderFns = template.staticRenderFns;
      component._compiled = true;

      if (functional) component.functional = true;
    }

    component._scopeId = scope;

    {
      let hook;
      if (style) {
        hook = function(context) {
          style.call(this, createInjector(context));
        };
      }

      if (hook !== undefined) {
        if (component.functional) {
          // register for functional component in vue file
          const originalRender = component.render;
          component.render = function renderWithStyleInjection(h, context) {
            hook.call(context);
            return originalRender(h, context)
          };
        } else {
          // inject component registration as beforeCreate hook
          const existing = component.beforeCreate;
          component.beforeCreate = existing ? [].concat(existing, hook) : [hook];
        }
      }
    }

    return component
  }
  /* style inject */
  function __vue_create_injector__$6() {
    const head = document.head || document.getElementsByTagName('head')[0];
    const styles = __vue_create_injector__$6.styles || (__vue_create_injector__$6.styles = {});
    const isOldIE =
      typeof navigator !== 'undefined' &&
      /msie [6-9]\\b/.test(navigator.userAgent.toLowerCase());

    return function addStyle(id, css) {
      if (document.querySelector('style[data-vue-ssr-id~="' + id + '"]')) return // SSR styles are present.

      const group = isOldIE ? css.media || 'default' : id;
      const style = styles[group] || (styles[group] = { ids: [], parts: [], element: undefined });

      if (!style.ids.includes(id)) {
        let code = css.source;
        let index = style.ids.length;

        style.ids.push(id);

        if (isOldIE) {
          style.element = style.element || document.querySelector('style[data-group=' + group + ']');
        }

        if (!style.element) {
          const el = style.element = document.createElement('style');
          el.type = 'text/css';

          if (css.media) el.setAttribute('media', css.media);
          if (isOldIE) {
            el.setAttribute('data-group', group);
            el.setAttribute('data-next-index', '0');
          }

          head.appendChild(el);
        }

        if (isOldIE) {
          index = parseInt(style.element.getAttribute('data-next-index'));
          style.element.setAttribute('data-next-index', index + 1);
        }

        if (style.element.styleSheet) {
          style.parts.push(code);
          style.element.styleSheet.cssText = style.parts
            .filter(Boolean)
            .join('\n');
        } else {
          const textNode = document.createTextNode(code);
          const nodes = style.element.childNodes;
          if (nodes[index]) style.element.removeChild(nodes[index]);
          if (nodes.length) style.element.insertBefore(textNode, nodes[index]);
          else style.element.appendChild(textNode);
        }
      }
    }
  }
  /* style inject SSR */
  

  
  var DefaultImageItem = __vue_normalize__$6(
    { render: __vue_render__$6, staticRenderFns: __vue_staticRenderFns__$6 },
    __vue_inject_styles__$6,
    __vue_script__$6,
    __vue_scope_id__$6,
    __vue_is_functional_template__$6,
    __vue_module_identifier__$6,
    __vue_create_injector__$6,
    undefined
  );

//

var script$7 = {
  components: { DefaultImageItem },
  computed: {
    defaultProcessedLibrary() {
      const { shows, hides } = this.displayIndices;
      const iiLib = this.$store.getters['pixiv/imageItemLibrary'];

      return shows.concat(hides).map(idx => iiLib[idx]);
    },
    displayIndices() {
      return this.$store.getters['pixiv/defaultDisplayIndices'];
    },
    imageToShowCount() {
      const { shows } = this.displayIndices;
      return shows.length;
    },
  },
};

/* script */
            const __vue_script__$7 = script$7;
            
/* template */
var __vue_render__$7 = function() {
  var _vm = this;
  var _h = _vm.$createElement;
  var _c = _vm._self._c || _h;
  return _c(
    "div",
    { attrs: { id: "patchouli-default-image-item-page" } },
    _vm._l(_vm.defaultProcessedLibrary, function(d, index) {
      return _c("DefaultImageItem", {
        directives: [
          {
            name: "show",
            rawName: "v-show",
            value: index < _vm.imageToShowCount,
            expression: "index < imageToShowCount"
          }
        ],
        key: d.illustId,
        attrs: {
          "img-url": d.urls.thumb,
          "illust-id": d.illustId,
          "illust-title": d.illustTitle,
          "illust-page-count": d.illustPageCount,
          "is-ugoira": d.isUgoira,
          "user-name": d.userName,
          "user-id": d.userId,
          "profile-img-url": d.profileImg,
          "bookmark-count": d.bookmarkCount,
          "is-bookmarked": d.isBookmarked,
          "is-followed": d.isFollowed,
          "bookmark-id": d.bookmarkId
        }
      })
    })
  )
};
var __vue_staticRenderFns__$7 = [];
__vue_render__$7._withStripped = true;

  /* style */
  const __vue_inject_styles__$7 = function (inject) {
    if (!inject) return
    inject("data-v-ebe2fb1e_0", { source: "\n#patchouli-default-image-item-page[data-v-ebe2fb1e] {\n  display: flex;\n  flex-flow: wrap;\n  justify-content: space-around;\n}\n", map: {"version":3,"sources":["/home/flandre/dev/Patchouli/src/components/DefaultImageItemPage.vue"],"names":[],"mappings":";AA6CA;EACA,cAAA;EACA,gBAAA;EACA,8BAAA;CACA","file":"DefaultImageItemPage.vue","sourcesContent":["<template>\n  <div id=\"patchouli-default-image-item-page\">\n    <DefaultImageItem\n      v-for=\"(d, index) in defaultProcessedLibrary\"\n      v-show=\"index < imageToShowCount\"\n      :key=\"d.illustId\"\n      :img-url=\"d.urls.thumb\"\n      :illust-id=\"d.illustId\"\n      :illust-title=\"d.illustTitle\"\n      :illust-page-count=\"d.illustPageCount\"\n      :is-ugoira=\"d.isUgoira\"\n      :user-name=\"d.userName\"\n      :user-id=\"d.userId\"\n      :profile-img-url=\"d.profileImg\"\n      :bookmark-count=\"d.bookmarkCount\"\n      :is-bookmarked=\"d.isBookmarked\"\n      :is-followed=\"d.isFollowed\"\n      :bookmark-id=\"d.bookmarkId\" />\n  </div>\n</template>\n\n<script>\nimport DefaultImageItem from './DefaultImageItem.vue';\n\nexport default {\n  components: { DefaultImageItem },\n  computed: {\n    defaultProcessedLibrary() {\n      const { shows, hides } = this.displayIndices;\n      const iiLib = this.$store.getters['pixiv/imageItemLibrary'];\n\n      return shows.concat(hides).map(idx => iiLib[idx]);\n    },\n    displayIndices() {\n      return this.$store.getters['pixiv/defaultDisplayIndices'];\n    },\n    imageToShowCount() {\n      const { shows } = this.displayIndices;\n      return shows.length;\n    },\n  },\n};\n</script>\n\n<style scoped>\n#patchouli-default-image-item-page {\n  display: flex;\n  flex-flow: wrap;\n  justify-content: space-around;\n}\n</style>\n\n\n"]}, media: undefined });

  };
  /* scoped */
  const __vue_scope_id__$7 = "data-v-ebe2fb1e";
  /* module identifier */
  const __vue_module_identifier__$7 = undefined;
  /* functional template */
  const __vue_is_functional_template__$7 = false;
  /* component normalizer */
  function __vue_normalize__$7(
    template, style, script,
    scope, functional, moduleIdentifier,
    createInjector, createInjectorSSR
  ) {
    const component = (typeof script === 'function' ? script.options : script) || {};

    // For security concerns, we use only base name in production mode.
    component.__file = "/home/flandre/dev/Patchouli/src/components/DefaultImageItemPage.vue";

    if (!component.render) {
      component.render = template.render;
      component.staticRenderFns = template.staticRenderFns;
      component._compiled = true;

      if (functional) component.functional = true;
    }

    component._scopeId = scope;

    {
      let hook;
      if (style) {
        hook = function(context) {
          style.call(this, createInjector(context));
        };
      }

      if (hook !== undefined) {
        if (component.functional) {
          // register for functional component in vue file
          const originalRender = component.render;
          component.render = function renderWithStyleInjection(h, context) {
            hook.call(context);
            return originalRender(h, context)
          };
        } else {
          // inject component registration as beforeCreate hook
          const existing = component.beforeCreate;
          component.beforeCreate = existing ? [].concat(existing, hook) : [hook];
        }
      }
    }

    return component
  }
  /* style inject */
  function __vue_create_injector__$7() {
    const head = document.head || document.getElementsByTagName('head')[0];
    const styles = __vue_create_injector__$7.styles || (__vue_create_injector__$7.styles = {});
    const isOldIE =
      typeof navigator !== 'undefined' &&
      /msie [6-9]\\b/.test(navigator.userAgent.toLowerCase());

    return function addStyle(id, css) {
      if (document.querySelector('style[data-vue-ssr-id~="' + id + '"]')) return // SSR styles are present.

      const group = isOldIE ? css.media || 'default' : id;
      const style = styles[group] || (styles[group] = { ids: [], parts: [], element: undefined });

      if (!style.ids.includes(id)) {
        let code = css.source;
        let index = style.ids.length;

        style.ids.push(id);

        if (isOldIE) {
          style.element = style.element || document.querySelector('style[data-group=' + group + ']');
        }

        if (!style.element) {
          const el = style.element = document.createElement('style');
          el.type = 'text/css';

          if (css.media) el.setAttribute('media', css.media);
          if (isOldIE) {
            el.setAttribute('data-group', group);
            el.setAttribute('data-next-index', '0');
          }

          head.appendChild(el);
        }

        if (isOldIE) {
          index = parseInt(style.element.getAttribute('data-next-index'));
          style.element.setAttribute('data-next-index', index + 1);
        }

        if (style.element.styleSheet) {
          style.parts.push(code);
          style.element.styleSheet.cssText = style.parts
            .filter(Boolean)
            .join('\n');
        } else {
          const textNode = document.createTextNode(code);
          const nodes = style.element.childNodes;
          if (nodes[index]) style.element.removeChild(nodes[index]);
          if (nodes.length) style.element.insertBefore(textNode, nodes[index]);
          else style.element.appendChild(textNode);
        }
      }
    }
  }
  /* style inject SSR */
  

  
  var DefaultImageItemPage = __vue_normalize__$7(
    { render: __vue_render__$7, staticRenderFns: __vue_staticRenderFns__$7 },
    __vue_inject_styles__$7,
    __vue_script__$7,
    __vue_scope_id__$7,
    __vue_is_functional_template__$7,
    __vue_module_identifier__$7,
    __vue_create_injector__$7,
    undefined
  );

//
//
//
//
//
//
//
//
//

var script$8 = {
  props: {
    illustPageCount: {
      default: 1,
      type: Number,
    },
  },
};

/* script */
            const __vue_script__$8 = script$8;
            
/* template */
var __vue_render__$8 = function() {
  var _vm = this;
  var _h = _vm.$createElement;
  var _c = _vm._self._c || _h;
  return _c("div", { staticClass: "icon-multiple-indicator" }, [
    _c(
      "svg",
      { staticClass: "icon-multiple-svg", attrs: { viewBox: "0 0 9 10" } },
      [
        _c("path", {
          attrs: {
            d:
              "M8,3 C8.55228475,3 9,3.44771525 9,4 L9,9 C9,9.55228475 8.55228475,10 8,10 L3,10 C2.44771525,10 2,9.55228475 2,9 L6,9 C7.1045695,9 8,8.1045695 8,7 L8,3 Z M1,1 L6,1 C6.55228475,1 7,1.44771525 7,2 L7,7 C7,7.55228475 6.55228475,8 6,8 L1,8 C0.44771525,8 0,7.55228475 0,7 L0,2 C0,1.44771525 0.44771525,1 1,1 Z"
          }
        })
      ]
    ),
    _vm._v(" "),
    _c("span", { staticClass: "illust-page-count" }, [
      _vm._v(_vm._s(_vm.illustPageCount))
    ])
  ])
};
var __vue_staticRenderFns__$8 = [];
__vue_render__$8._withStripped = true;

  /* style */
  const __vue_inject_styles__$8 = function (inject) {
    if (!inject) return
    inject("data-v-7c086544_0", { source: "\n.icon-multiple-indicator[data-v-7c086544] {\n  align-items: center;\n  background: rgba(0, 0, 0, 0.4);\n  border-radius: 10px;\n  box-sizing: border-box;\n  display: flex;\n  flex: none;\n  height: 20px;\n  margin: 2px 2px -20px auto;\n  padding: 5px 6px;\n  z-index: 1;\n  color: #fff;\n  font-size: 10px;\n  font-weight: 700;\n  line-height: 1;\n}\n.icon-multiple-svg[data-v-7c086544] {\n  fill: #fff;\n  font-size: 0;\n  height: 10px;\n  line-height: 0;\n  stroke: none;\n  width: 9px;\n}\n.illust-page-count[data-v-7c086544] {\n  margin-left: 2px;\n}\n", map: {"version":3,"sources":["/home/flandre/dev/Patchouli/src/components/IndicatorMultiple.vue"],"names":[],"mappings":";AAqBA;EACA,oBAAA;EACA,+BAAA;EACA,oBAAA;EACA,uBAAA;EACA,cAAA;EACA,WAAA;EACA,aAAA;EACA,2BAAA;EACA,iBAAA;EACA,WAAA;EACA,YAAA;EACA,gBAAA;EACA,iBAAA;EACA,eAAA;CACA;AACA;EACA,WAAA;EACA,aAAA;EACA,aAAA;EACA,eAAA;EACA,aAAA;EACA,WAAA;CACA;AACA;EACA,iBAAA;CACA","file":"IndicatorMultiple.vue","sourcesContent":["<template>\n  <div class=\"icon-multiple-indicator\">\n    <svg viewBox=\"0 0 9 10\" class=\"icon-multiple-svg\">\n      <path d=\"M8,3 C8.55228475,3 9,3.44771525 9,4 L9,9 C9,9.55228475 8.55228475,10 8,10 L3,10 C2.44771525,10 2,9.55228475 2,9 L6,9 C7.1045695,9 8,8.1045695 8,7 L8,3 Z M1,1 L6,1 C6.55228475,1 7,1.44771525 7,2 L7,7 C7,7.55228475 6.55228475,8 6,8 L1,8 C0.44771525,8 0,7.55228475 0,7 L0,2 C0,1.44771525 0.44771525,1 1,1 Z\"/>\n    </svg>\n    <span class=\"illust-page-count\">{{ illustPageCount }}</span>\n  </div>\n</template>\n\n<script>\nexport default {\n  props: {\n    illustPageCount: {\n      default: 1,\n      type: Number,\n    },\n  },\n};\n</script>\n\n<style scoped>\n.icon-multiple-indicator {\n  align-items: center;\n  background: rgba(0, 0, 0, 0.4);\n  border-radius: 10px;\n  box-sizing: border-box;\n  display: flex;\n  flex: none;\n  height: 20px;\n  margin: 2px 2px -20px auto;\n  padding: 5px 6px;\n  z-index: 1;\n  color: #fff;\n  font-size: 10px;\n  font-weight: 700;\n  line-height: 1;\n}\n.icon-multiple-svg {\n  fill: #fff;\n  font-size: 0;\n  height: 10px;\n  line-height: 0;\n  stroke: none;\n  width: 9px;\n}\n.illust-page-count {\n  margin-left: 2px;\n}\n</style>\n\n"]}, media: undefined });

  };
  /* scoped */
  const __vue_scope_id__$8 = "data-v-7c086544";
  /* module identifier */
  const __vue_module_identifier__$8 = undefined;
  /* functional template */
  const __vue_is_functional_template__$8 = false;
  /* component normalizer */
  function __vue_normalize__$8(
    template, style, script,
    scope, functional, moduleIdentifier,
    createInjector, createInjectorSSR
  ) {
    const component = (typeof script === 'function' ? script.options : script) || {};

    // For security concerns, we use only base name in production mode.
    component.__file = "/home/flandre/dev/Patchouli/src/components/IndicatorMultiple.vue";

    if (!component.render) {
      component.render = template.render;
      component.staticRenderFns = template.staticRenderFns;
      component._compiled = true;

      if (functional) component.functional = true;
    }

    component._scopeId = scope;

    {
      let hook;
      if (style) {
        hook = function(context) {
          style.call(this, createInjector(context));
        };
      }

      if (hook !== undefined) {
        if (component.functional) {
          // register for functional component in vue file
          const originalRender = component.render;
          component.render = function renderWithStyleInjection(h, context) {
            hook.call(context);
            return originalRender(h, context)
          };
        } else {
          // inject component registration as beforeCreate hook
          const existing = component.beforeCreate;
          component.beforeCreate = existing ? [].concat(existing, hook) : [hook];
        }
      }
    }

    return component
  }
  /* style inject */
  function __vue_create_injector__$8() {
    const head = document.head || document.getElementsByTagName('head')[0];
    const styles = __vue_create_injector__$8.styles || (__vue_create_injector__$8.styles = {});
    const isOldIE =
      typeof navigator !== 'undefined' &&
      /msie [6-9]\\b/.test(navigator.userAgent.toLowerCase());

    return function addStyle(id, css) {
      if (document.querySelector('style[data-vue-ssr-id~="' + id + '"]')) return // SSR styles are present.

      const group = isOldIE ? css.media || 'default' : id;
      const style = styles[group] || (styles[group] = { ids: [], parts: [], element: undefined });

      if (!style.ids.includes(id)) {
        let code = css.source;
        let index = style.ids.length;

        style.ids.push(id);

        if (isOldIE) {
          style.element = style.element || document.querySelector('style[data-group=' + group + ']');
        }

        if (!style.element) {
          const el = style.element = document.createElement('style');
          el.type = 'text/css';

          if (css.media) el.setAttribute('media', css.media);
          if (isOldIE) {
            el.setAttribute('data-group', group);
            el.setAttribute('data-next-index', '0');
          }

          head.appendChild(el);
        }

        if (isOldIE) {
          index = parseInt(style.element.getAttribute('data-next-index'));
          style.element.setAttribute('data-next-index', index + 1);
        }

        if (style.element.styleSheet) {
          style.parts.push(code);
          style.element.styleSheet.cssText = style.parts
            .filter(Boolean)
            .join('\n');
        } else {
          const textNode = document.createTextNode(code);
          const nodes = style.element.childNodes;
          if (nodes[index]) style.element.removeChild(nodes[index]);
          if (nodes.length) style.element.insertBefore(textNode, nodes[index]);
          else style.element.appendChild(textNode);
        }
      }
    }
  }
  /* style inject SSR */
  

  
  var IndicatorMultiple = __vue_normalize__$8(
    { render: __vue_render__$8, staticRenderFns: __vue_staticRenderFns__$8 },
    __vue_inject_styles__$8,
    __vue_script__$8,
    __vue_scope_id__$8,
    __vue_is_functional_template__$8,
    __vue_module_identifier__$8,
    __vue_create_injector__$8,
    undefined
  );

//

var script$9 = {
  components: { IconBookmarkHeart, IconUgoiraPlay, IndicatorMultiple },
  props: {
    bookmarkCount: {
      default: 0,
      type: Number,
    },
    bookmarkId: {
      default: '',
      type: String,
    },
    illustId: {
      default: '',
      type: String,
    },
    illustPageCount: {
      default: 1,
      type: Number,
    },
    illustTitle: {
      default: '',
      type: String,
    },
    isBookmarked: {
      default: false,
      type: Boolean,
    },
    isFollowed: {
      default: false,
      type: Boolean,
    },
    isUgoira: {
      default: false,
      type: Boolean,
    },
    profileImgUrl: {
      default: '',
      type: String,
    },
    showUserProfile: {
      default: true,
      type: Boolean,
    },
    thumbImgUrl: {
      default: '',
      type: String,
    },
    userId: {
      default: '',
      type: String,
    },
    userName: {
      default: '',
      type: String,
    },
  },
  // eslint-disable-next-line sort-keys
  data() {
    return {
      selfBookmarkId: this.bookmarkId,
      selfIsBookmarked: this.isBookmarked,
      ugoiraMeta: null,
      ugoiraPlayed: false,
      ugoiraPlayer: null,
    };
  },
  // eslint-disable-next-line sort-keys
  computed: {
    canHoverPlay() {
      return this.$store.getters.config.hoverPlay;
    },
    illustMainImgStyle() {
      return {
        backgroundImage: this.ugoiraPlayed ? 'none' : `url(${this.thumbImgUrl})`,
      };
    },
    illustPageUrl() {
      return `/member_illust.php?mode=medium&illust_id=${this.illustId}`;
    },
    profileImgStyle() {
      return {
        backgroundImage: `url(${this.profileImgUrl})`,
      };
    },
    userPageUrl() {
      return `/member_illust.php?id=${this.userId}`;
    },
  },
  mounted() {
    this.$nextTick(async() => {
      if (this.isUgoira && this.canHoverPlay) {
        this.ugoiraMeta = await PixivAPI.getIllustUgoiraMetaData(this.illustId);
      }
    });
  },
  // eslint-disable-next-line sort-keys
  methods: {
    activateContextMenu(event) {
      $print.debug('NewDefaultImageItem#activateContextMenu', event);
      if (this.$store.getters.config.contextMenu) {
        event.preventDefault();

        const payload = {
          position: {
            x: event.clientX,
            y: event.clientY,
          },
        };

        const ct = event.currentTarget;
        if (ct.classList.contains('user-profile-name')) {
          payload.data = {
            illustId: this.illustId,
            type: 'image-item-title-user',
          };
        } else {
          payload.data = {
            illustId: this.illustId,
            type: 'image-item-image',
          };
        }

        this.$store.commit('contextMenu/activate', payload);
      }
    },
    controlUgoira(event) {
      if (!this.ugoiraMeta) {
        return;
      }
      if (!this.ugoiraPlayer) {
        try {
          this.ugoiraPlayer = new ZipImagePlayer({
            autosize: true,
            canvas: this.$refs.smallUgoiraPreview,
            chunkSize: 300000,
            loop: true,
            metadata: this.ugoiraMeta,
            source: this.ugoiraMeta.src,
          });
        } catch (error) {
          $print.error(error);
        }
      }
      if (this.canHoverPlay) {
        if (event.type === 'mouseenter') {
          this.ugoiraPlayed = true;
          this.ugoiraPlayer.play();
        } else {
          this.ugoiraPlayed = false;
          this.ugoiraPlayer.pause();
          this.ugoiraPlayer.rewind();
        }
      }
    },
    async oneClickBookmarkAdd() {
      if (!this.selfIsBookmarked) {
        if (await PixivAPI.postRPCAddBookmark(this.illustId)) {
          this.selfIsBookmarked = true;
        }
      } else {
        // this.selfBookmarkId might be empty...
        // Because RPC API has no bookmarkId returned...
        if (!this.selfBookmarkId) {
          const data = await PixivAPI.getIllustBookmarkData(this.illustId);
          this.selfBookmarkId = data.bookmarkData.id;
        }
        if (await PixivAPI.postRPCDeleteBookmark(this.selfBookmarkId)) {
          this.selfIsBookmarked = false;
        }
      }
    },
  },
};

/* script */
            const __vue_script__$9 = script$9;
            
/* template */
var __vue_render__$9 = function() {
  var _vm = this;
  var _h = _vm.$createElement;
  var _c = _vm._self._c || _h;
  return _c("li", { staticClass: "illust-item-root" }, [
    _c(
      "a",
      {
        staticClass: "illust-main",
        attrs: { href: _vm.illustPageUrl },
        on: {
          contextmenu: function($event) {
            return _vm.activateContextMenu($event)
          },
          mouseenter: _vm.controlUgoira,
          mouseleave: _vm.controlUgoira
        }
      },
      [
        _c(
          "div",
          { staticClass: "illust-main-indicators" },
          [
            _vm.illustPageCount > 1
              ? _c("IndicatorMultiple", {
                  attrs: { "illust-page-count": _vm.illustPageCount }
                })
              : _vm._e()
          ],
          1
        ),
        _vm._v(" "),
        _c(
          "div",
          { staticClass: "illust-main-img", style: _vm.illustMainImgStyle },
          [
            _vm.isUgoira
              ? _c("IconUgoiraPlay", {
                  directives: [
                    {
                      name: "show",
                      rawName: "v-show",
                      value: !_vm.ugoiraPlayed,
                      expression: "!ugoiraPlayed"
                    }
                  ]
                })
              : _vm._e(),
            _vm._v(" "),
            _vm.isUgoira
              ? _c("canvas", {
                  directives: [
                    {
                      name: "show",
                      rawName: "v-show",
                      value: _vm.ugoiraPlayed,
                      expression: "ugoiraPlayed"
                    }
                  ],
                  ref: "smallUgoiraPreview",
                  staticClass: "illust-main-ugoira"
                })
              : _vm._e()
          ],
          1
        )
      ]
    ),
    _vm._v(" "),
    _c("div", { staticClass: "illust-buttons" }, [
      _c("div", [
        _c(
          "button",
          {
            attrs: { type: "button" },
            on: {
              click: function($event) {
                if (
                  !("button" in $event) &&
                  _vm._k($event.keyCode, "left", 37, $event.key, [
                    "Left",
                    "ArrowLeft"
                  ])
                ) {
                  return null
                }
                if ("button" in $event && $event.button !== 0) {
                  return null
                }
                $event.preventDefault();
                $event.stopPropagation();
                return _vm.oneClickBookmarkAdd($event)
              }
            }
          },
          [
            _c("IconBookmarkHeart", {
              attrs: { actived: _vm.selfIsBookmarked }
            })
          ],
          1
        )
      ])
    ]),
    _vm._v(" "),
    _c(
      "a",
      {
        staticClass: "illust-title",
        attrs: { href: _vm.illustPageUrl },
        on: {
          contextmenu: function($event) {
            return _vm.activateContextMenu($event)
          }
        }
      },
      [_vm._v(_vm._s(_vm.illustTitle))]
    ),
    _vm._v(" "),
    _c(
      "div",
      {
        directives: [
          {
            name: "show",
            rawName: "v-show",
            value: _vm.showUserProfile,
            expression: "showUserProfile"
          }
        ],
        staticClass: "user-profile"
      },
      [
        _c("div", [
          _c("a", {
            staticClass: "user-profile-img",
            style: _vm.profileImgStyle,
            attrs: { href: _vm.illustPageUrl }
          })
        ]),
        _vm._v(" "),
        _c(
          "a",
          {
            staticClass: "user-profile-name",
            attrs: { href: _vm.userPageUrl },
            on: {
              contextmenu: function($event) {
                return _vm.activateContextMenu($event)
              }
            }
          },
          [_vm._v(_vm._s(_vm.userName))]
        ),
        _vm._v(" "),
        _vm.isFollowed
          ? _c("i", { staticClass: "fas fa-rss user-followed-indicator" })
          : _vm._e()
      ]
    ),
    _vm._v(" "),
    _c(
      "div",
      {
        directives: [
          {
            name: "show",
            rawName: "v-show",
            value: _vm.bookmarkCount > 0,
            expression: "bookmarkCount > 0"
          }
        ],
        staticClass: "illust-popularity"
      },
      [_c("span", [_vm._v(_vm._s(_vm.bookmarkCount))])]
    )
  ])
};
var __vue_staticRenderFns__$9 = [];
__vue_render__$9._withStripped = true;

  /* style */
  const __vue_inject_styles__$9 = function (inject) {
    if (!inject) return
    inject("data-v-0ca010a8_0", { source: "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n/*\n@pixiv.override.css\n:root {\n  --new-default-image-item-square-size: 184px;\n}\n*/\n.illust-item-root[data-v-0ca010a8] {\n  margin: 0 12px 24px;\n}\n.illust-main[data-v-0ca010a8] {\n  text-decoration: none;\n}\n.illust-main-indicators[data-v-0ca010a8] {\n  display: flex;\n  position: absolute;\n  width: var(--new-default-image-item-square-size);\n  justify-content: end;\n}\n.illust-main-img[data-v-0ca010a8] {\n  align-items: center;\n  background-color: #fff;\n  background-position: 50%;\n  background-repeat: no-repeat;\n  background-size: cover;\n  border-radius: 4px;\n  display: flex;\n  height: var(--new-default-image-item-square-size);\n  justify-content: center;\n  margin-bottom: 8px;\n  position: relative;\n  width: var(--new-default-image-item-square-size);\n}\n.illust-main-img[data-v-0ca010a8]::before {\n  background-color: rgba(0, 0, 0, 0.02);\n  content: \"\";\n  display: block;\n  height: 100%;\n  left: 0;\n  position: absolute;\n  top: 0;\n  width: 100%;\n}\n.illust-main-ugoira[data-v-0ca010a8] {\n  object-fit: contain;\n  height: var(--new-default-image-item-square-size);\n  width: var(--new-default-image-item-square-size);\n}\n.illust-buttons[data-v-0ca010a8] {\n  display: flex;\n  height: 32px;\n  justify-content: flex-end;\n  margin-bottom: 8px;\n  margin-top: -40px;\n}\n.illust-buttons > div[data-v-0ca010a8] {\n  z-index: 1;\n}\n.illust-buttons > div > button[data-v-0ca010a8] {\n  background: none;\n  border: none;\n  box-sizing: content-box;\n  cursor: pointer;\n  display: inline-block;\n  height: 32px;\n  line-height: 1;\n  padding: 0;\n}\n.illust-title[data-v-0ca010a8] {\n  color: #177082;\n  display: block;\n  font-size: 14px;\n  font-weight: 700;\n  line-height: 1;\n  margin: 0 0 4px;\n  overflow: hidden;\n  text-decoration: none;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  width: var(--new-default-image-item-square-size);\n}\n.user-profile[data-v-0ca010a8] {\n  align-items: center;\n  display: flex;\n  width: var(--new-default-image-item-square-size);\n  margin-bottom: 4px;\n}\n.user-profile > div[data-v-0ca010a8] {\n  display: inline-block;\n  margin-right: 4px;\n}\n.user-profile-img[data-v-0ca010a8] {\n  background-size: cover;\n  border-radius: 50%;\n  display: block;\n  flex: none;\n  position: relative;\n  overflow: hidden;\n  width: 16px;\n  height: 16px;\n}\n.user-profile-name[data-v-0ca010a8] {\n  color: #999;\n  font-size: 12px;\n  line-height: 1;\n  overflow: hidden;\n  text-decoration: none;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  flex: 1;\n}\n.user-followed-indicator[data-v-0ca010a8] {\n  display: inline-block;\n  margin-left: 4px;\n  width: 16px;\n  height: 16px;\n  color: dodgerblue;\n}\n.illust-popularity[data-v-0ca010a8] {\n  display: flex;\n  width: 100%;\n  justify-content: center;\n}\n.illust-popularity > span[data-v-0ca010a8] {\n  background-color: #cef;\n  color: rgb(0, 105, 177);\n  padding: 2px 8px;\n  border-radius: 8px;\n  font-weight: bold;\n}\n.illust-popularity > span[data-v-0ca010a8]::before {\n  content: \"❤️\";\n  margin-right: 4px;\n}\n", map: {"version":3,"sources":["/home/flandre/dev/Patchouli/src/components/NewDefaultImageItem.vue"],"names":[],"mappings":";;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;AA2OA;;;;;EAKA;AACA;EACA,oBAAA;CACA;AACA;EACA,sBAAA;CACA;AACA;EACA,cAAA;EACA,mBAAA;EACA,iDAAA;EACA,qBAAA;CACA;AACA;EACA,oBAAA;EACA,uBAAA;EACA,yBAAA;EACA,6BAAA;EACA,uBAAA;EACA,mBAAA;EACA,cAAA;EACA,kDAAA;EACA,wBAAA;EACA,mBAAA;EACA,mBAAA;EACA,iDAAA;CACA;AACA;EACA,sCAAA;EACA,YAAA;EACA,eAAA;EACA,aAAA;EACA,QAAA;EACA,mBAAA;EACA,OAAA;EACA,YAAA;CACA;AACA;EACA,oBAAA;EACA,kDAAA;EACA,iDAAA;CACA;AACA;EACA,cAAA;EACA,aAAA;EACA,0BAAA;EACA,mBAAA;EACA,kBAAA;CACA;AACA;EACA,WAAA;CACA;AACA;EACA,iBAAA;EACA,aAAA;EACA,wBAAA;EACA,gBAAA;EACA,sBAAA;EACA,aAAA;EACA,eAAA;EACA,WAAA;CACA;AACA;EACA,eAAA;EACA,eAAA;EACA,gBAAA;EACA,iBAAA;EACA,eAAA;EACA,gBAAA;EACA,iBAAA;EACA,sBAAA;EACA,wBAAA;EACA,oBAAA;EACA,iDAAA;CACA;AACA;EACA,oBAAA;EACA,cAAA;EACA,iDAAA;EACA,mBAAA;CACA;AACA;EACA,sBAAA;EACA,kBAAA;CACA;AACA;EACA,uBAAA;EACA,mBAAA;EACA,eAAA;EACA,WAAA;EACA,mBAAA;EACA,iBAAA;EACA,YAAA;EACA,aAAA;CACA;AACA;EACA,YAAA;EACA,gBAAA;EACA,eAAA;EACA,iBAAA;EACA,sBAAA;EACA,wBAAA;EACA,oBAAA;EACA,QAAA;CACA;AACA;EACA,sBAAA;EACA,iBAAA;EACA,YAAA;EACA,aAAA;EACA,kBAAA;CACA;AACA;EACA,cAAA;EACA,YAAA;EACA,wBAAA;CACA;AACA;EACA,uBAAA;EACA,wBAAA;EACA,iBAAA;EACA,mBAAA;EACA,kBAAA;CACA;AACA;EACA,cAAA;EACA,kBAAA;CACA","file":"NewDefaultImageItem.vue","sourcesContent":["<template>\n  <li class=\"illust-item-root\">\n    <a\n      :href=\"illustPageUrl\"\n      class=\"illust-main\"\n      @click.right=\"activateContextMenu\"\n      @mouseenter=\"controlUgoira\"\n      @mouseleave=\"controlUgoira\">\n      <div class=\"illust-main-indicators\">\n        <IndicatorMultiple v-if=\"illustPageCount > 1\" :illust-page-count=\"illustPageCount\"/>\n      </div>\n      <div\n        :style=\"illustMainImgStyle\"\n        class=\"illust-main-img\">\n        <IconUgoiraPlay v-if=\"isUgoira\" v-show=\"!ugoiraPlayed\"/>\n        <canvas\n          v-if=\"isUgoira\"\n          v-show=\"ugoiraPlayed\"\n          ref=\"smallUgoiraPreview\"\n          class=\"illust-main-ugoira\"/>\n      </div>\n    </a>\n    <div class=\"illust-buttons\">\n      <div>\n        <button type=\"button\" @click.left.prevent.stop=\"oneClickBookmarkAdd\">\n          <IconBookmarkHeart :actived=\"selfIsBookmarked\"/>\n        </button>\n      </div>\n    </div>\n    <a\n      :href=\"illustPageUrl\"\n      class=\"illust-title\"\n      @click.right=\"activateContextMenu\">{{ illustTitle }}</a>\n    <div v-show=\"showUserProfile\" class=\"user-profile\">\n      <div>\n        <a\n          :href=\"illustPageUrl\"\n          :style=\"profileImgStyle\"\n          class=\"user-profile-img\"/>\n      </div>\n      <a\n        :href=\"userPageUrl\"\n        class=\"user-profile-name\"\n        @click.right=\"activateContextMenu\">{{ userName }}</a>\n      <i v-if=\"isFollowed\" class=\"fas fa-rss user-followed-indicator\"/>\n    </div>\n    <div v-show=\"bookmarkCount > 0\" class=\"illust-popularity\">\n      <span>{{ bookmarkCount }}</span>\n    </div>\n  </li>\n</template>\n\n<script>\nimport IconBookmarkHeart from './IconBookmarkHeart.vue';\nimport IconUgoiraPlay from './IconUgoiraPlay.vue';\nimport IndicatorMultiple from './IndicatorMultiple.vue';\nimport { $print } from '../lib/utils';\nimport { PixivAPI } from '../lib/pixiv';\n\nexport default {\n  components: { IconBookmarkHeart, IconUgoiraPlay, IndicatorMultiple },\n  props: {\n    bookmarkCount: {\n      default: 0,\n      type: Number,\n    },\n    bookmarkId: {\n      default: '',\n      type: String,\n    },\n    illustId: {\n      default: '',\n      type: String,\n    },\n    illustPageCount: {\n      default: 1,\n      type: Number,\n    },\n    illustTitle: {\n      default: '',\n      type: String,\n    },\n    isBookmarked: {\n      default: false,\n      type: Boolean,\n    },\n    isFollowed: {\n      default: false,\n      type: Boolean,\n    },\n    isUgoira: {\n      default: false,\n      type: Boolean,\n    },\n    profileImgUrl: {\n      default: '',\n      type: String,\n    },\n    showUserProfile: {\n      default: true,\n      type: Boolean,\n    },\n    thumbImgUrl: {\n      default: '',\n      type: String,\n    },\n    userId: {\n      default: '',\n      type: String,\n    },\n    userName: {\n      default: '',\n      type: String,\n    },\n  },\n  // eslint-disable-next-line sort-keys\n  data() {\n    return {\n      selfBookmarkId: this.bookmarkId,\n      selfIsBookmarked: this.isBookmarked,\n      ugoiraMeta: null,\n      ugoiraPlayed: false,\n      ugoiraPlayer: null,\n    };\n  },\n  // eslint-disable-next-line sort-keys\n  computed: {\n    canHoverPlay() {\n      return this.$store.getters.config.hoverPlay;\n    },\n    illustMainImgStyle() {\n      return {\n        backgroundImage: this.ugoiraPlayed ? 'none' : `url(${this.thumbImgUrl})`,\n      };\n    },\n    illustPageUrl() {\n      return `/member_illust.php?mode=medium&illust_id=${this.illustId}`;\n    },\n    profileImgStyle() {\n      return {\n        backgroundImage: `url(${this.profileImgUrl})`,\n      };\n    },\n    userPageUrl() {\n      return `/member_illust.php?id=${this.userId}`;\n    },\n  },\n  mounted() {\n    this.$nextTick(async() => {\n      if (this.isUgoira && this.canHoverPlay) {\n        this.ugoiraMeta = await PixivAPI.getIllustUgoiraMetaData(this.illustId);\n      }\n    });\n  },\n  // eslint-disable-next-line sort-keys\n  methods: {\n    activateContextMenu(event) {\n      $print.debug('NewDefaultImageItem#activateContextMenu', event);\n      if (this.$store.getters.config.contextMenu) {\n        event.preventDefault();\n\n        const payload = {\n          position: {\n            x: event.clientX,\n            y: event.clientY,\n          },\n        };\n\n        const ct = event.currentTarget;\n        if (ct.classList.contains('user-profile-name')) {\n          payload.data = {\n            illustId: this.illustId,\n            type: 'image-item-title-user',\n          };\n        } else {\n          payload.data = {\n            illustId: this.illustId,\n            type: 'image-item-image',\n          };\n        }\n\n        this.$store.commit('contextMenu/activate', payload);\n      }\n    },\n    controlUgoira(event) {\n      if (!this.ugoiraMeta) {\n        return;\n      }\n      if (!this.ugoiraPlayer) {\n        try {\n          this.ugoiraPlayer = new ZipImagePlayer({\n            autosize: true,\n            canvas: this.$refs.smallUgoiraPreview,\n            chunkSize: 300000,\n            loop: true,\n            metadata: this.ugoiraMeta,\n            source: this.ugoiraMeta.src,\n          });\n        } catch (error) {\n          $print.error(error);\n        }\n      }\n      if (this.canHoverPlay) {\n        if (event.type === 'mouseenter') {\n          this.ugoiraPlayed = true;\n          this.ugoiraPlayer.play();\n        } else {\n          this.ugoiraPlayed = false;\n          this.ugoiraPlayer.pause();\n          this.ugoiraPlayer.rewind();\n        }\n      }\n    },\n    async oneClickBookmarkAdd() {\n      if (!this.selfIsBookmarked) {\n        if (await PixivAPI.postRPCAddBookmark(this.illustId)) {\n          this.selfIsBookmarked = true;\n        }\n      } else {\n        // this.selfBookmarkId might be empty...\n        // Because RPC API has no bookmarkId returned...\n        if (!this.selfBookmarkId) {\n          const data = await PixivAPI.getIllustBookmarkData(this.illustId);\n          this.selfBookmarkId = data.bookmarkData.id;\n        }\n        if (await PixivAPI.postRPCDeleteBookmark(this.selfBookmarkId)) {\n          this.selfIsBookmarked = false;\n        }\n      }\n    },\n  },\n};\n</script>\n\n<style scoped>\n/*\n@pixiv.override.css\n:root {\n  --new-default-image-item-square-size: 184px;\n}\n*/\n.illust-item-root {\n  margin: 0 12px 24px;\n}\n.illust-main {\n  text-decoration: none;\n}\n.illust-main-indicators {\n  display: flex;\n  position: absolute;\n  width: var(--new-default-image-item-square-size);\n  justify-content: end;\n}\n.illust-main-img {\n  align-items: center;\n  background-color: #fff;\n  background-position: 50%;\n  background-repeat: no-repeat;\n  background-size: cover;\n  border-radius: 4px;\n  display: flex;\n  height: var(--new-default-image-item-square-size);\n  justify-content: center;\n  margin-bottom: 8px;\n  position: relative;\n  width: var(--new-default-image-item-square-size);\n}\n.illust-main-img::before {\n  background-color: rgba(0, 0, 0, 0.02);\n  content: \"\";\n  display: block;\n  height: 100%;\n  left: 0;\n  position: absolute;\n  top: 0;\n  width: 100%;\n}\n.illust-main-ugoira {\n  object-fit: contain;\n  height: var(--new-default-image-item-square-size);\n  width: var(--new-default-image-item-square-size);\n}\n.illust-buttons {\n  display: flex;\n  height: 32px;\n  justify-content: flex-end;\n  margin-bottom: 8px;\n  margin-top: -40px;\n}\n.illust-buttons > div {\n  z-index: 1;\n}\n.illust-buttons > div > button {\n  background: none;\n  border: none;\n  box-sizing: content-box;\n  cursor: pointer;\n  display: inline-block;\n  height: 32px;\n  line-height: 1;\n  padding: 0;\n}\n.illust-title {\n  color: #177082;\n  display: block;\n  font-size: 14px;\n  font-weight: 700;\n  line-height: 1;\n  margin: 0 0 4px;\n  overflow: hidden;\n  text-decoration: none;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  width: var(--new-default-image-item-square-size);\n}\n.user-profile {\n  align-items: center;\n  display: flex;\n  width: var(--new-default-image-item-square-size);\n  margin-bottom: 4px;\n}\n.user-profile > div {\n  display: inline-block;\n  margin-right: 4px;\n}\n.user-profile-img {\n  background-size: cover;\n  border-radius: 50%;\n  display: block;\n  flex: none;\n  position: relative;\n  overflow: hidden;\n  width: 16px;\n  height: 16px;\n}\n.user-profile-name {\n  color: #999;\n  font-size: 12px;\n  line-height: 1;\n  overflow: hidden;\n  text-decoration: none;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  flex: 1;\n}\n.user-followed-indicator {\n  display: inline-block;\n  margin-left: 4px;\n  width: 16px;\n  height: 16px;\n  color: dodgerblue;\n}\n.illust-popularity {\n  display: flex;\n  width: 100%;\n  justify-content: center;\n}\n.illust-popularity > span {\n  background-color: #cef;\n  color: rgb(0, 105, 177);\n  padding: 2px 8px;\n  border-radius: 8px;\n  font-weight: bold;\n}\n.illust-popularity > span::before {\n  content: \"❤️\";\n  margin-right: 4px;\n}\n</style>\n\n\n"]}, media: undefined });

  };
  /* scoped */
  const __vue_scope_id__$9 = "data-v-0ca010a8";
  /* module identifier */
  const __vue_module_identifier__$9 = undefined;
  /* functional template */
  const __vue_is_functional_template__$9 = false;
  /* component normalizer */
  function __vue_normalize__$9(
    template, style, script,
    scope, functional, moduleIdentifier,
    createInjector, createInjectorSSR
  ) {
    const component = (typeof script === 'function' ? script.options : script) || {};

    // For security concerns, we use only base name in production mode.
    component.__file = "/home/flandre/dev/Patchouli/src/components/NewDefaultImageItem.vue";

    if (!component.render) {
      component.render = template.render;
      component.staticRenderFns = template.staticRenderFns;
      component._compiled = true;

      if (functional) component.functional = true;
    }

    component._scopeId = scope;

    {
      let hook;
      if (style) {
        hook = function(context) {
          style.call(this, createInjector(context));
        };
      }

      if (hook !== undefined) {
        if (component.functional) {
          // register for functional component in vue file
          const originalRender = component.render;
          component.render = function renderWithStyleInjection(h, context) {
            hook.call(context);
            return originalRender(h, context)
          };
        } else {
          // inject component registration as beforeCreate hook
          const existing = component.beforeCreate;
          component.beforeCreate = existing ? [].concat(existing, hook) : [hook];
        }
      }
    }

    return component
  }
  /* style inject */
  function __vue_create_injector__$9() {
    const head = document.head || document.getElementsByTagName('head')[0];
    const styles = __vue_create_injector__$9.styles || (__vue_create_injector__$9.styles = {});
    const isOldIE =
      typeof navigator !== 'undefined' &&
      /msie [6-9]\\b/.test(navigator.userAgent.toLowerCase());

    return function addStyle(id, css) {
      if (document.querySelector('style[data-vue-ssr-id~="' + id + '"]')) return // SSR styles are present.

      const group = isOldIE ? css.media || 'default' : id;
      const style = styles[group] || (styles[group] = { ids: [], parts: [], element: undefined });

      if (!style.ids.includes(id)) {
        let code = css.source;
        let index = style.ids.length;

        style.ids.push(id);

        if (isOldIE) {
          style.element = style.element || document.querySelector('style[data-group=' + group + ']');
        }

        if (!style.element) {
          const el = style.element = document.createElement('style');
          el.type = 'text/css';

          if (css.media) el.setAttribute('media', css.media);
          if (isOldIE) {
            el.setAttribute('data-group', group);
            el.setAttribute('data-next-index', '0');
          }

          head.appendChild(el);
        }

        if (isOldIE) {
          index = parseInt(style.element.getAttribute('data-next-index'));
          style.element.setAttribute('data-next-index', index + 1);
        }

        if (style.element.styleSheet) {
          style.parts.push(code);
          style.element.styleSheet.cssText = style.parts
            .filter(Boolean)
            .join('\n');
        } else {
          const textNode = document.createTextNode(code);
          const nodes = style.element.childNodes;
          if (nodes[index]) style.element.removeChild(nodes[index]);
          if (nodes.length) style.element.insertBefore(textNode, nodes[index]);
          else style.element.appendChild(textNode);
        }
      }
    }
  }
  /* style inject SSR */
  

  
  var NewDefaultImageItem = __vue_normalize__$9(
    { render: __vue_render__$9, staticRenderFns: __vue_staticRenderFns__$9 },
    __vue_inject_styles__$9,
    __vue_script__$9,
    __vue_scope_id__$9,
    __vue_is_functional_template__$9,
    __vue_module_identifier__$9,
    __vue_create_injector__$9,
    undefined
  );

//
//
//
//
//
//
//
//
//
//
//
//
//
//
//

var script$a = {};

/* script */
            const __vue_script__$a = script$a;
            
/* template */
var __vue_render__$a = function() {
  var _vm = this;
  var _h = _vm.$createElement;
  var _c = _vm._self._c || _h;
  return _vm._m(0)
};
var __vue_staticRenderFns__$a = [
  function() {
    var _vm = this;
    var _h = _vm.$createElement;
    var _c = _vm._self._c || _h;
    return _c("div", { staticClass: "sk-cube-grid" }, [
      _c("div", { staticClass: "sk-cube sk-cube1" }),
      _vm._v(" "),
      _c("div", { staticClass: "sk-cube sk-cube2" }),
      _vm._v(" "),
      _c("div", { staticClass: "sk-cube sk-cube3" }),
      _vm._v(" "),
      _c("div", { staticClass: "sk-cube sk-cube4" }),
      _vm._v(" "),
      _c("div", { staticClass: "sk-cube sk-cube5" }),
      _vm._v(" "),
      _c("div", { staticClass: "sk-cube sk-cube6" }),
      _vm._v(" "),
      _c("div", { staticClass: "sk-cube sk-cube7" }),
      _vm._v(" "),
      _c("div", { staticClass: "sk-cube sk-cube8" }),
      _vm._v(" "),
      _c("div", { staticClass: "sk-cube sk-cube9" })
    ])
  }
];
__vue_render__$a._withStripped = true;

  /* style */
  const __vue_inject_styles__$a = function (inject) {
    if (!inject) return
    inject("data-v-3f445ab8_0", { source: "\n.sk-cube-grid[data-v-3f445ab8] {\n  width: var(--loading-icon-size);\n  height: var(--loading-icon-size);\n  margin: 100px auto;\n}\n.sk-cube-grid .sk-cube[data-v-3f445ab8] {\n  width: 33%;\n  height: 33%;\n  background-color: var(--loading-icon-color);\n  float: left;\n  -webkit-animation: sk-cubeGridScaleDelay-data-v-3f445ab8 1.3s infinite ease-in-out;\n  animation: sk-cubeGridScaleDelay-data-v-3f445ab8 1.3s infinite ease-in-out;\n}\n.sk-cube-grid .sk-cube1[data-v-3f445ab8] {\n  -webkit-animation-delay: 0.2s;\n  animation-delay: 0.2s;\n}\n.sk-cube-grid .sk-cube2[data-v-3f445ab8] {\n  -webkit-animation-delay: 0.3s;\n  animation-delay: 0.3s;\n}\n.sk-cube-grid .sk-cube3[data-v-3f445ab8] {\n  -webkit-animation-delay: 0.4s;\n  animation-delay: 0.4s;\n}\n.sk-cube-grid .sk-cube4[data-v-3f445ab8] {\n  -webkit-animation-delay: 0.1s;\n  animation-delay: 0.1s;\n}\n.sk-cube-grid .sk-cube5[data-v-3f445ab8] {\n  -webkit-animation-delay: 0.2s;\n  animation-delay: 0.2s;\n}\n.sk-cube-grid .sk-cube6[data-v-3f445ab8] {\n  -webkit-animation-delay: 0.3s;\n  animation-delay: 0.3s;\n}\n.sk-cube-grid .sk-cube7[data-v-3f445ab8] {\n  -webkit-animation-delay: 0s;\n  animation-delay: 0s;\n}\n.sk-cube-grid .sk-cube8[data-v-3f445ab8] {\n  -webkit-animation-delay: 0.1s;\n  animation-delay: 0.1s;\n}\n.sk-cube-grid .sk-cube9[data-v-3f445ab8] {\n  -webkit-animation-delay: 0.2s;\n  animation-delay: 0.2s;\n}\n@-webkit-keyframes sk-cubeGridScaleDelay-data-v-3f445ab8 {\n0%,\n  70%,\n  100% {\n    -webkit-transform: scale3D(1, 1, 1);\n    transform: scale3D(1, 1, 1);\n}\n35% {\n    -webkit-transform: scale3D(0, 0, 1);\n    transform: scale3D(0, 0, 1);\n}\n}\n@keyframes sk-cubeGridScaleDelay-data-v-3f445ab8 {\n0%,\n  70%,\n  100% {\n    -webkit-transform: scale3D(1, 1, 1);\n    transform: scale3D(1, 1, 1);\n}\n35% {\n    -webkit-transform: scale3D(0, 0, 1);\n    transform: scale3D(0, 0, 1);\n}\n}\n", map: {"version":3,"sources":["/home/flandre/dev/Patchouli/src/components/IconLoadingSpin.vue"],"names":[],"mappings":";AAoBA;EACA,gCAAA;EACA,iCAAA;EACA,mBAAA;CACA;AAEA;EACA,WAAA;EACA,YAAA;EACA,4CAAA;EACA,YAAA;EACA,mFAAA;EACA,2EAAA;CACA;AACA;EACA,8BAAA;EACA,sBAAA;CACA;AACA;EACA,8BAAA;EACA,sBAAA;CACA;AACA;EACA,8BAAA;EACA,sBAAA;CACA;AACA;EACA,8BAAA;EACA,sBAAA;CACA;AACA;EACA,8BAAA;EACA,sBAAA;CACA;AACA;EACA,8BAAA;EACA,sBAAA;CACA;AACA;EACA,4BAAA;EACA,oBAAA;CACA;AACA;EACA,8BAAA;EACA,sBAAA;CACA;AACA;EACA,8BAAA;EACA,sBAAA;CACA;AAEA;AACA;;;IAGA,oCAAA;IACA,4BAAA;CACA;AACA;IACA,oCAAA;IACA,4BAAA;CACA;CACA;AAEA;AACA;;;IAGA,oCAAA;IACA,4BAAA;CACA;AACA;IACA,oCAAA;IACA,4BAAA;CACA;CACA","file":"IconLoadingSpin.vue","sourcesContent":["<template>\n  <!-- copy from: https://github.com/tobiasahlin/SpinKit -->\n  <div class=\"sk-cube-grid\">\n    <div class=\"sk-cube sk-cube1\"/>\n    <div class=\"sk-cube sk-cube2\"/>\n    <div class=\"sk-cube sk-cube3\"/>\n    <div class=\"sk-cube sk-cube4\"/>\n    <div class=\"sk-cube sk-cube5\"/>\n    <div class=\"sk-cube sk-cube6\"/>\n    <div class=\"sk-cube sk-cube7\"/>\n    <div class=\"sk-cube sk-cube8\"/>\n    <div class=\"sk-cube sk-cube9\"/>\n  </div>\n</template>\n\n<script>\nexport default {};\n</script>\n\n<style scoped>\n.sk-cube-grid {\n  width: var(--loading-icon-size);\n  height: var(--loading-icon-size);\n  margin: 100px auto;\n}\n\n.sk-cube-grid .sk-cube {\n  width: 33%;\n  height: 33%;\n  background-color: var(--loading-icon-color);\n  float: left;\n  -webkit-animation: sk-cubeGridScaleDelay 1.3s infinite ease-in-out;\n  animation: sk-cubeGridScaleDelay 1.3s infinite ease-in-out;\n}\n.sk-cube-grid .sk-cube1 {\n  -webkit-animation-delay: 0.2s;\n  animation-delay: 0.2s;\n}\n.sk-cube-grid .sk-cube2 {\n  -webkit-animation-delay: 0.3s;\n  animation-delay: 0.3s;\n}\n.sk-cube-grid .sk-cube3 {\n  -webkit-animation-delay: 0.4s;\n  animation-delay: 0.4s;\n}\n.sk-cube-grid .sk-cube4 {\n  -webkit-animation-delay: 0.1s;\n  animation-delay: 0.1s;\n}\n.sk-cube-grid .sk-cube5 {\n  -webkit-animation-delay: 0.2s;\n  animation-delay: 0.2s;\n}\n.sk-cube-grid .sk-cube6 {\n  -webkit-animation-delay: 0.3s;\n  animation-delay: 0.3s;\n}\n.sk-cube-grid .sk-cube7 {\n  -webkit-animation-delay: 0s;\n  animation-delay: 0s;\n}\n.sk-cube-grid .sk-cube8 {\n  -webkit-animation-delay: 0.1s;\n  animation-delay: 0.1s;\n}\n.sk-cube-grid .sk-cube9 {\n  -webkit-animation-delay: 0.2s;\n  animation-delay: 0.2s;\n}\n\n@-webkit-keyframes sk-cubeGridScaleDelay {\n  0%,\n  70%,\n  100% {\n    -webkit-transform: scale3D(1, 1, 1);\n    transform: scale3D(1, 1, 1);\n  }\n  35% {\n    -webkit-transform: scale3D(0, 0, 1);\n    transform: scale3D(0, 0, 1);\n  }\n}\n\n@keyframes sk-cubeGridScaleDelay {\n  0%,\n  70%,\n  100% {\n    -webkit-transform: scale3D(1, 1, 1);\n    transform: scale3D(1, 1, 1);\n  }\n  35% {\n    -webkit-transform: scale3D(0, 0, 1);\n    transform: scale3D(0, 0, 1);\n  }\n}\n</style>\n\n\n"]}, media: undefined });

  };
  /* scoped */
  const __vue_scope_id__$a = "data-v-3f445ab8";
  /* module identifier */
  const __vue_module_identifier__$a = undefined;
  /* functional template */
  const __vue_is_functional_template__$a = false;
  /* component normalizer */
  function __vue_normalize__$a(
    template, style, script,
    scope, functional, moduleIdentifier,
    createInjector, createInjectorSSR
  ) {
    const component = (typeof script === 'function' ? script.options : script) || {};

    // For security concerns, we use only base name in production mode.
    component.__file = "/home/flandre/dev/Patchouli/src/components/IconLoadingSpin.vue";

    if (!component.render) {
      component.render = template.render;
      component.staticRenderFns = template.staticRenderFns;
      component._compiled = true;

      if (functional) component.functional = true;
    }

    component._scopeId = scope;

    {
      let hook;
      if (style) {
        hook = function(context) {
          style.call(this, createInjector(context));
        };
      }

      if (hook !== undefined) {
        if (component.functional) {
          // register for functional component in vue file
          const originalRender = component.render;
          component.render = function renderWithStyleInjection(h, context) {
            hook.call(context);
            return originalRender(h, context)
          };
        } else {
          // inject component registration as beforeCreate hook
          const existing = component.beforeCreate;
          component.beforeCreate = existing ? [].concat(existing, hook) : [hook];
        }
      }
    }

    return component
  }
  /* style inject */
  function __vue_create_injector__$a() {
    const head = document.head || document.getElementsByTagName('head')[0];
    const styles = __vue_create_injector__$a.styles || (__vue_create_injector__$a.styles = {});
    const isOldIE =
      typeof navigator !== 'undefined' &&
      /msie [6-9]\\b/.test(navigator.userAgent.toLowerCase());

    return function addStyle(id, css) {
      if (document.querySelector('style[data-vue-ssr-id~="' + id + '"]')) return // SSR styles are present.

      const group = isOldIE ? css.media || 'default' : id;
      const style = styles[group] || (styles[group] = { ids: [], parts: [], element: undefined });

      if (!style.ids.includes(id)) {
        let code = css.source;
        let index = style.ids.length;

        style.ids.push(id);

        if (isOldIE) {
          style.element = style.element || document.querySelector('style[data-group=' + group + ']');
        }

        if (!style.element) {
          const el = style.element = document.createElement('style');
          el.type = 'text/css';

          if (css.media) el.setAttribute('media', css.media);
          if (isOldIE) {
            el.setAttribute('data-group', group);
            el.setAttribute('data-next-index', '0');
          }

          head.appendChild(el);
        }

        if (isOldIE) {
          index = parseInt(style.element.getAttribute('data-next-index'));
          style.element.setAttribute('data-next-index', index + 1);
        }

        if (style.element.styleSheet) {
          style.parts.push(code);
          style.element.styleSheet.cssText = style.parts
            .filter(Boolean)
            .join('\n');
        } else {
          const textNode = document.createTextNode(code);
          const nodes = style.element.childNodes;
          if (nodes[index]) style.element.removeChild(nodes[index]);
          if (nodes.length) style.element.insertBefore(textNode, nodes[index]);
          else style.element.appendChild(textNode);
        }
      }
    }
  }
  /* style inject SSR */
  

  
  var IconLoadingSpin = __vue_normalize__$a(
    { render: __vue_render__$a, staticRenderFns: __vue_staticRenderFns__$a },
    __vue_inject_styles__$a,
    __vue_script__$a,
    __vue_scope_id__$a,
    __vue_is_functional_template__$a,
    __vue_module_identifier__$a,
    __vue_create_injector__$a,
    undefined
  );

//

var script$b = {
  components: { IconLoadingSpin, NewDefaultImageItem },
  data() {
    return {
      routeIsInited: Array(NPP_TYPE_COUNT).fill(false),
    };
  },
  // eslint-disable-next-line sort-keys
  computed: {
    displayIndices() {
      return this.$store.getters['pixiv/nppDisplayIndices'];
    },
    hasNoResult() {
      return !this.imageToShowCount;
    },
    imageToShowCount() {
      const { shows } = this.displayIndices;
      return shows.length;
    },
    isSelfBookmarkPage() {
      return this.$store.getters.isSelfBookmarkPage;
    },
    nppProcessedLibrary() {
      const { shows, hides } = this.displayIndices;
      const iiLib = this.$store.getters['pixiv/imageItemLibrary'];

      return shows.concat(hides).map(idx => iiLib[idx]);
    },
    nppType() {
      return this.$store.getters['pixiv/nppType'];
    },
    rest() {
      return this.$store.getters.sp.rest;
    },
    status() {
      return this.$store.getters['pixiv/status'];
    },
    uid() {
      return this.$store.getters.sp.id;
    },
  },
  mounted() {
    this.$nextTick(() => {
      this.routeIsInited[this.nppType] = true;
    });
  },
  // eslint-disable-next-line sort-keys
  methods: {
    async clickRoute(event) {
      await this.$store.dispatch('pixiv/pause');
      const tid = event.currentTarget.id;
      const thref = event.currentTarget.href;

      if (this.isSamePath(location.href, thref)) {
        return;
      }

      history.pushState(null, '', thref);

      switch (tid) {
      case 'patchouli-npp-all':
        this.$store.commit('setMainPageType', {
          forceSet: MAIN_PAGE_TYPE.NEW_PROFILE,
        });
        break;
      case 'patchouli-npp-illust':
        this.$store.commit('setMainPageType', {
          forceSet: MAIN_PAGE_TYPE.NEW_PROFILE_ILLUST,
        });
        break;
      case 'patchouli-npp-manga':
        this.$store.commit('setMainPageType', {
          forceSet: MAIN_PAGE_TYPE.NEW_PROFILE_MANGA,
        });
        break;
      case 'patchouli-npp-bookmark':
      case 'patchouli-npp-view-bookmark-switch-public':
      case 'patchouli-npp-view-bookmark-switch-private':
        this.$store.commit('updateSearchParam');
        this.$store.commit('setMainPageType', {
          forceSet: MAIN_PAGE_TYPE.NEW_PROFILE_BOOKMARK,
        });
        break;
      default:
        break;
      }
      if (!this.routeIsInited[this.nppType]) {
        this.$store.dispatch('pixiv/start', { force: true, times: 1 });
        this.routeIsInited[this.nppType] = true;
      }
    },
    isSamePath(href0, href1) {
      const a0 = $el('a', { href: href0 });
      const a1 = $el('a', { href: href1 });
      if (a0.pathname !== a1.pathname) {
        return false;
      }
      const sp0 = new URLSearchParams(a0.search);
      const sp1 = new URLSearchParams(a1.search);
      const keysSet = new Set([...sp0.keys(), ...sp1.keys()]);
      for (const k of keysSet) {
        if (sp0.get(k) !== sp1.get(k)) {
          return false;
        }
      }
      return true;
    },
  },
};

/* script */
            const __vue_script__$b = script$b;
            
/* template */
var __vue_render__$b = function() {
  var _vm = this;
  var _h = _vm.$createElement;
  var _c = _vm._self._c || _h;
  return _c("div", { attrs: { id: "patchouli-new-profile-page" } }, [
    _c("nav", { attrs: { id: "patchouli-npp-nav" } }, [
      _c(
        "a",
        {
          class: { current: _vm.nppType === 0 },
          attrs: { id: "patchouli-npp-all", href: "/member.php?id=" + _vm.uid },
          on: {
            click: function($event) {
              if (
                !("button" in $event) &&
                _vm._k($event.keyCode, "left", 37, $event.key, [
                  "Left",
                  "ArrowLeft"
                ])
              ) {
                return null
              }
              if ("button" in $event && $event.button !== 0) {
                return null
              }
              $event.preventDefault();
              return _vm.clickRoute($event)
            }
          }
        },
        [_vm._v(_vm._s(_vm.$t("mainView.newProfilePage.contents")))]
      ),
      _vm._v(" "),
      _c(
        "a",
        {
          class: { current: _vm.nppType === 1 },
          attrs: {
            id: "patchouli-npp-illust",
            href: "/member_illust.php?id=" + _vm.uid + "&type=illust"
          },
          on: {
            click: function($event) {
              if (
                !("button" in $event) &&
                _vm._k($event.keyCode, "left", 37, $event.key, [
                  "Left",
                  "ArrowLeft"
                ])
              ) {
                return null
              }
              if ("button" in $event && $event.button !== 0) {
                return null
              }
              $event.preventDefault();
              return _vm.clickRoute($event)
            }
          }
        },
        [_vm._v(_vm._s(_vm.$t("mainView.newProfilePage.illustrations")))]
      ),
      _vm._v(" "),
      _c(
        "a",
        {
          class: { current: _vm.nppType === 2 },
          attrs: {
            id: "patchouli-npp-manga",
            href: "/member_illust.php?id=" + _vm.uid + "&type=manga"
          },
          on: {
            click: function($event) {
              if (
                !("button" in $event) &&
                _vm._k($event.keyCode, "left", 37, $event.key, [
                  "Left",
                  "ArrowLeft"
                ])
              ) {
                return null
              }
              if ("button" in $event && $event.button !== 0) {
                return null
              }
              $event.preventDefault();
              return _vm.clickRoute($event)
            }
          }
        },
        [_vm._v(_vm._s(_vm.$t("mainView.newProfilePage.manga")))]
      ),
      _vm._v(" "),
      _c(
        "a",
        {
          class: { current: _vm.nppType === 3 },
          attrs: {
            id: "patchouli-npp-bookmark",
            href: "/bookmark.php?id=" + _vm.uid + "&rest=show"
          },
          on: {
            click: function($event) {
              if (
                !("button" in $event) &&
                _vm._k($event.keyCode, "left", 37, $event.key, [
                  "Left",
                  "ArrowLeft"
                ])
              ) {
                return null
              }
              if ("button" in $event && $event.button !== 0) {
                return null
              }
              $event.preventDefault();
              return _vm.clickRoute($event)
            }
          }
        },
        [_vm._v(_vm._s(_vm.$t("mainView.newProfilePage.bookmarks")))]
      )
    ]),
    _vm._v(" "),
    _c("div", { attrs: { id: "patchouli-npp-view" } }, [
      _c(
        "div",
        {
          directives: [
            {
              name: "show",
              rawName: "v-show",
              value: _vm.isSelfBookmarkPage,
              expression: "isSelfBookmarkPage"
            }
          ],
          staticClass: "ω",
          attrs: { id: "patchouli-npp-view-bookmark-switch" }
        },
        [
          _c("nav", [
            _c(
              "a",
              {
                class: { current: _vm.nppType === 3 },
                attrs: {
                  id: "patchouli-npp-view-bookmark-switch-public",
                  href: "/bookmark.php?id=" + _vm.uid + "&rest=show"
                },
                on: {
                  click: function($event) {
                    if (
                      !("button" in $event) &&
                      _vm._k($event.keyCode, "left", 37, $event.key, [
                        "Left",
                        "ArrowLeft"
                      ])
                    ) {
                      return null
                    }
                    if ("button" in $event && $event.button !== 0) {
                      return null
                    }
                    $event.preventDefault();
                    return _vm.clickRoute($event)
                  }
                }
              },
              [_vm._v(_vm._s(_vm.$t("mainView.newProfilePage.publicBookmark")))]
            ),
            _vm._v(" "),
            _c(
              "a",
              {
                class: { current: _vm.nppType === 4 },
                attrs: {
                  id: "patchouli-npp-view-bookmark-switch-private",
                  href: "/bookmark.php?id=" + _vm.uid + "&rest=hide"
                },
                on: {
                  click: function($event) {
                    if (
                      !("button" in $event) &&
                      _vm._k($event.keyCode, "left", 37, $event.key, [
                        "Left",
                        "ArrowLeft"
                      ])
                    ) {
                      return null
                    }
                    if ("button" in $event && $event.button !== 0) {
                      return null
                    }
                    $event.preventDefault();
                    return _vm.clickRoute($event)
                  }
                }
              },
              [
                _vm._v(
                  _vm._s(_vm.$t("mainView.newProfilePage.privateBookmark"))
                )
              ]
            )
          ])
        ]
      ),
      _vm._v(" "),
      _c("div", { attrs: { id: "patchouli-npp-view-header" } }),
      _vm._v(" "),
      _c(
        "ul",
        {
          directives: [
            {
              name: "show",
              rawName: "v-show",
              value: !_vm.hasNoResult,
              expression: "!hasNoResult"
            }
          ],
          staticClass: "ω",
          attrs: { id: "patchouli-npp-view-image-item-list" }
        },
        _vm._l(_vm.nppProcessedLibrary, function(d, index) {
          return _c("NewDefaultImageItem", {
            directives: [
              {
                name: "show",
                rawName: "v-show",
                value: index < _vm.imageToShowCount,
                expression: "index < imageToShowCount"
              }
            ],
            key: d.illustId,
            attrs: {
              "illust-id": d.illustId,
              "bookmark-count": d.bookmarkCount,
              "bookmark-id": d.bookmarkId,
              "is-bookmarked": d.isBookmarked,
              "is-followed": d.isFollowed,
              "is-ugoira": d.isUgoira,
              "illust-page-count": d.illustPageCount,
              "illust-title": d.illustTitle,
              "thumb-img-url": d.urls.thumb,
              "profile-img-url": d.profileImg,
              "user-id": d.userId,
              "user-name": d.userName,
              "show-user-profile": _vm.uid !== d.userId
            }
          })
        })
      ),
      _vm._v(" "),
      _c(
        "span",
        {
          directives: [
            {
              name: "show",
              rawName: "v-show",
              value: _vm.hasNoResult && _vm.routeIsInited[_vm.nppType],
              expression: "hasNoResult && routeIsInited[nppType]"
            }
          ],
          attrs: { id: "patchouli-npp-view-no-result" }
        },
        [
          _vm._v(
            "\n      " +
              _vm._s(_vm.$t("mainView.newProfilePage.noResult")) +
              "\n    "
          )
        ]
      ),
      _vm._v(" "),
      _c(
        "span",
        {
          directives: [
            {
              name: "show",
              rawName: "v-show",
              value: !_vm.status.isPaused,
              expression: "!status.isPaused"
            }
          ],
          attrs: { id: "patchouli-npp-view-loading" }
        },
        [_c("IconLoadingSpin")],
        1
      )
    ])
  ])
};
var __vue_staticRenderFns__$b = [];
__vue_render__$b._withStripped = true;

  /* style */
  const __vue_inject_styles__$b = function (inject) {
    if (!inject) return
    inject("data-v-cd7cd522_0", { source: "\n#patchouli-npp-nav[data-v-cd7cd522] {\n  display: flex;\n  justify-content: center;\n  background-color: #f9f8ff;\n  width: 100%;\n}\n#patchouli-npp-nav > a[data-v-cd7cd522] {\n  border-top: 4px solid transparent;\n  color: #999;\n  font-size: 16px;\n  font-weight: 700;\n  margin: 0 10px;\n  padding: 10px 20px;\n  text-decoration: none;\n  transition: color 0.2s;\n}\n#patchouli-npp-nav > a[data-v-cd7cd522]:hover {\n  color: #333;\n  cursor: pointer;\n}\n#patchouli-npp-nav > a.current[data-v-cd7cd522] {\n  color: #333;\n  border-bottom: 4px solid #0096fa;\n}\n#patchouli-npp-view[data-v-cd7cd522] {\n  display: flex;\n  flex-flow: column;\n  min-height: 340px;\n  align-items: center;\n}\n#patchouli-npp-view-bookmark-switch[data-v-cd7cd522] {\n  display: flex;\n  justify-content: flex-end;\n  margin: 24px auto 48px;\n  width: 1300px;\n}\n#patchouli-npp-view-bookmark-switch a.current[data-v-cd7cd522] {\n  background-color: #f5f5f5;\n  color: #5c5c5c;\n}\n#patchouli-npp-view-bookmark-switch a[data-v-cd7cd522] {\n  border-radius: 24px;\n  color: #8f8f8f;\n  font-size: 16px;\n  font-weight: 700;\n  padding: 16px 24px;\n  text-decoration: none;\n}\n#patchouli-npp-view-image-item-list[data-v-cd7cd522] {\n  list-style: none;\n  display: flex;\n  align-content: flex-start;\n  justify-content: center;\n  flex-wrap: wrap;\n  padding: 14px 0;\n  margin: 0 auto;\n  width: 1300px;\n}\n#patchouli-npp-view-no-result[data-v-cd7cd522] {\n  flex: 1;\n  display: inline-flex;\n  align-items: center;\n  color: #b8b8b8;\n  font-size: 20px;\n  font-weight: 700;\n  line-height: 1;\n}\n#patchouli-npp-view-loading[data-v-cd7cd522] {\n  flex: 1;\n  display: inline-flex;\n  align-items: center;\n}\n", map: {"version":3,"sources":["/home/flandre/dev/Patchouli/src/components/NewProfilePage.vue"],"names":[],"mappings":";AAiMA;EACA,cAAA;EACA,wBAAA;EACA,0BAAA;EACA,YAAA;CACA;AACA;EACA,kCAAA;EACA,YAAA;EACA,gBAAA;EACA,iBAAA;EACA,eAAA;EACA,mBAAA;EACA,sBAAA;EACA,uBAAA;CACA;AACA;EACA,YAAA;EACA,gBAAA;CACA;AACA;EACA,YAAA;EACA,iCAAA;CACA;AACA;EACA,cAAA;EACA,kBAAA;EACA,kBAAA;EACA,oBAAA;CACA;AACA;EACA,cAAA;EACA,0BAAA;EACA,uBAAA;EACA,cAAA;CACA;AACA;EACA,0BAAA;EACA,eAAA;CACA;AACA;EACA,oBAAA;EACA,eAAA;EACA,gBAAA;EACA,iBAAA;EACA,mBAAA;EACA,sBAAA;CACA;AACA;EACA,iBAAA;EACA,cAAA;EACA,0BAAA;EACA,wBAAA;EACA,gBAAA;EACA,gBAAA;EACA,eAAA;EACA,cAAA;CACA;AACA;EACA,QAAA;EACA,qBAAA;EACA,oBAAA;EACA,eAAA;EACA,gBAAA;EACA,iBAAA;EACA,eAAA;CACA;AACA;EACA,QAAA;EACA,qBAAA;EACA,oBAAA;CACA","file":"NewProfilePage.vue","sourcesContent":["<template>\n  <div id=\"patchouli-new-profile-page\">\n    <nav id=\"patchouli-npp-nav\">\n      <a\n        id=\"patchouli-npp-all\"\n        :class=\"{'current': nppType === 0}\"\n        :href=\"`/member.php?id=${uid}`\"\n        @click.left.prevent=\"clickRoute\">{{ $t('mainView.newProfilePage.contents') }}</a>\n      <a\n        id=\"patchouli-npp-illust\"\n        :class=\"{'current': nppType === 1}\"\n        :href=\"`/member_illust.php?id=${uid}&type=illust`\"\n        @click.left.prevent=\"clickRoute\">{{ $t('mainView.newProfilePage.illustrations') }}</a>\n      <a\n        id=\"patchouli-npp-manga\"\n        :class=\"{'current': nppType === 2}\"\n        :href=\"`/member_illust.php?id=${uid}&type=manga`\"\n        @click.left.prevent=\"clickRoute\">{{ $t('mainView.newProfilePage.manga') }}</a>\n      <a\n        id=\"patchouli-npp-bookmark\"\n        :class=\"{'current': nppType === 3}\"\n        :href=\"`/bookmark.php?id=${uid}&rest=show`\"\n        @click.left.prevent=\"clickRoute\">{{ $t('mainView.newProfilePage.bookmarks') }}</a>\n    </nav>\n    <div id=\"patchouli-npp-view\">\n      <div\n        v-show=\"isSelfBookmarkPage\"\n        id=\"patchouli-npp-view-bookmark-switch\"\n        class=\"ω\">\n        <nav>\n          <a\n            id=\"patchouli-npp-view-bookmark-switch-public\"\n            :class=\"{'current': nppType === 3}\"\n            :href=\"`/bookmark.php?id=${uid}&rest=show`\"\n            @click.left.prevent=\"clickRoute\">{{ $t('mainView.newProfilePage.publicBookmark') }}</a>\n          <a\n            id=\"patchouli-npp-view-bookmark-switch-private\"\n            :class=\"{'current': nppType === 4}\"\n            :href=\"`/bookmark.php?id=${uid}&rest=hide`\"\n            @click.left.prevent=\"clickRoute\">{{ $t('mainView.newProfilePage.privateBookmark') }}</a>\n        </nav>\n      </div>\n      <div id=\"patchouli-npp-view-header\"/>\n      <ul\n        v-show=\"!hasNoResult\"\n        id=\"patchouli-npp-view-image-item-list\"\n        class=\"ω\">\n        <NewDefaultImageItem\n          v-for=\"(d, index) in nppProcessedLibrary\"\n          v-show=\"index < imageToShowCount\"\n          :key=\"d.illustId\"\n          :illust-id=\"d.illustId\"\n          :bookmark-count=\"d.bookmarkCount\"\n          :bookmark-id=\"d.bookmarkId\"\n          :is-bookmarked=\"d.isBookmarked\"\n          :is-followed=\"d.isFollowed\"\n          :is-ugoira=\"d.isUgoira\"\n          :illust-page-count=\"d.illustPageCount\"\n          :illust-title=\"d.illustTitle\"\n          :thumb-img-url=\"d.urls.thumb\"\n          :profile-img-url=\"d.profileImg\"\n          :user-id=\"d.userId\"\n          :user-name=\"d.userName\"\n          :show-user-profile=\"uid !== d.userId\"/>\n      </ul>\n      <span v-show=\"hasNoResult && routeIsInited[nppType]\" id=\"patchouli-npp-view-no-result\">\n        {{ $t('mainView.newProfilePage.noResult') }}\n      </span>\n      <span v-show=\"!status.isPaused\" id=\"patchouli-npp-view-loading\">\n        <IconLoadingSpin/>\n      </span>\n    </div>\n  </div>\n</template>\n\n<script>\nimport { MAIN_PAGE_TYPE as MPT, NPP_TYPE_COUNT } from '../lib/enums';\nimport { $el } from '../lib/utils';\nimport NewDefaultImageItem from './NewDefaultImageItem.vue';\nimport IconLoadingSpin from './IconLoadingSpin.vue';\n\nexport default {\n  components: { IconLoadingSpin, NewDefaultImageItem },\n  data() {\n    return {\n      routeIsInited: Array(NPP_TYPE_COUNT).fill(false),\n    };\n  },\n  // eslint-disable-next-line sort-keys\n  computed: {\n    displayIndices() {\n      return this.$store.getters['pixiv/nppDisplayIndices'];\n    },\n    hasNoResult() {\n      return !this.imageToShowCount;\n    },\n    imageToShowCount() {\n      const { shows } = this.displayIndices;\n      return shows.length;\n    },\n    isSelfBookmarkPage() {\n      return this.$store.getters.isSelfBookmarkPage;\n    },\n    nppProcessedLibrary() {\n      const { shows, hides } = this.displayIndices;\n      const iiLib = this.$store.getters['pixiv/imageItemLibrary'];\n\n      return shows.concat(hides).map(idx => iiLib[idx]);\n    },\n    nppType() {\n      return this.$store.getters['pixiv/nppType'];\n    },\n    rest() {\n      return this.$store.getters.sp.rest;\n    },\n    status() {\n      return this.$store.getters['pixiv/status'];\n    },\n    uid() {\n      return this.$store.getters.sp.id;\n    },\n  },\n  mounted() {\n    this.$nextTick(() => {\n      this.routeIsInited[this.nppType] = true;\n    });\n  },\n  // eslint-disable-next-line sort-keys\n  methods: {\n    async clickRoute(event) {\n      await this.$store.dispatch('pixiv/pause');\n      const tid = event.currentTarget.id;\n      const thref = event.currentTarget.href;\n\n      if (this.isSamePath(location.href, thref)) {\n        return;\n      }\n\n      history.pushState(null, '', thref);\n\n      switch (tid) {\n      case 'patchouli-npp-all':\n        this.$store.commit('setMainPageType', {\n          forceSet: MPT.NEW_PROFILE,\n        });\n        break;\n      case 'patchouli-npp-illust':\n        this.$store.commit('setMainPageType', {\n          forceSet: MPT.NEW_PROFILE_ILLUST,\n        });\n        break;\n      case 'patchouli-npp-manga':\n        this.$store.commit('setMainPageType', {\n          forceSet: MPT.NEW_PROFILE_MANGA,\n        });\n        break;\n      case 'patchouli-npp-bookmark':\n      case 'patchouli-npp-view-bookmark-switch-public':\n      case 'patchouli-npp-view-bookmark-switch-private':\n        this.$store.commit('updateSearchParam');\n        this.$store.commit('setMainPageType', {\n          forceSet: MPT.NEW_PROFILE_BOOKMARK,\n        });\n        break;\n      default:\n        break;\n      }\n      if (!this.routeIsInited[this.nppType]) {\n        this.$store.dispatch('pixiv/start', { force: true, times: 1 });\n        this.routeIsInited[this.nppType] = true;\n      }\n    },\n    isSamePath(href0, href1) {\n      const a0 = $el('a', { href: href0 });\n      const a1 = $el('a', { href: href1 });\n      if (a0.pathname !== a1.pathname) {\n        return false;\n      }\n      const sp0 = new URLSearchParams(a0.search);\n      const sp1 = new URLSearchParams(a1.search);\n      const keysSet = new Set([...sp0.keys(), ...sp1.keys()]);\n      for (const k of keysSet) {\n        if (sp0.get(k) !== sp1.get(k)) {\n          return false;\n        }\n      }\n      return true;\n    },\n  },\n};\n</script>\n\n<style scoped>\n#patchouli-npp-nav {\n  display: flex;\n  justify-content: center;\n  background-color: #f9f8ff;\n  width: 100%;\n}\n#patchouli-npp-nav > a {\n  border-top: 4px solid transparent;\n  color: #999;\n  font-size: 16px;\n  font-weight: 700;\n  margin: 0 10px;\n  padding: 10px 20px;\n  text-decoration: none;\n  transition: color 0.2s;\n}\n#patchouli-npp-nav > a:hover {\n  color: #333;\n  cursor: pointer;\n}\n#patchouli-npp-nav > a.current {\n  color: #333;\n  border-bottom: 4px solid #0096fa;\n}\n#patchouli-npp-view {\n  display: flex;\n  flex-flow: column;\n  min-height: 340px;\n  align-items: center;\n}\n#patchouli-npp-view-bookmark-switch {\n  display: flex;\n  justify-content: flex-end;\n  margin: 24px auto 48px;\n  width: 1300px;\n}\n#patchouli-npp-view-bookmark-switch a.current {\n  background-color: #f5f5f5;\n  color: #5c5c5c;\n}\n#patchouli-npp-view-bookmark-switch a {\n  border-radius: 24px;\n  color: #8f8f8f;\n  font-size: 16px;\n  font-weight: 700;\n  padding: 16px 24px;\n  text-decoration: none;\n}\n#patchouli-npp-view-image-item-list {\n  list-style: none;\n  display: flex;\n  align-content: flex-start;\n  justify-content: center;\n  flex-wrap: wrap;\n  padding: 14px 0;\n  margin: 0 auto;\n  width: 1300px;\n}\n#patchouli-npp-view-no-result {\n  flex: 1;\n  display: inline-flex;\n  align-items: center;\n  color: #b8b8b8;\n  font-size: 20px;\n  font-weight: 700;\n  line-height: 1;\n}\n#patchouli-npp-view-loading {\n  flex: 1;\n  display: inline-flex;\n  align-items: center;\n}\n</style>\n\n\n"]}, media: undefined });

  };
  /* scoped */
  const __vue_scope_id__$b = "data-v-cd7cd522";
  /* module identifier */
  const __vue_module_identifier__$b = undefined;
  /* functional template */
  const __vue_is_functional_template__$b = false;
  /* component normalizer */
  function __vue_normalize__$b(
    template, style, script,
    scope, functional, moduleIdentifier,
    createInjector, createInjectorSSR
  ) {
    const component = (typeof script === 'function' ? script.options : script) || {};

    // For security concerns, we use only base name in production mode.
    component.__file = "/home/flandre/dev/Patchouli/src/components/NewProfilePage.vue";

    if (!component.render) {
      component.render = template.render;
      component.staticRenderFns = template.staticRenderFns;
      component._compiled = true;

      if (functional) component.functional = true;
    }

    component._scopeId = scope;

    {
      let hook;
      if (style) {
        hook = function(context) {
          style.call(this, createInjector(context));
        };
      }

      if (hook !== undefined) {
        if (component.functional) {
          // register for functional component in vue file
          const originalRender = component.render;
          component.render = function renderWithStyleInjection(h, context) {
            hook.call(context);
            return originalRender(h, context)
          };
        } else {
          // inject component registration as beforeCreate hook
          const existing = component.beforeCreate;
          component.beforeCreate = existing ? [].concat(existing, hook) : [hook];
        }
      }
    }

    return component
  }
  /* style inject */
  function __vue_create_injector__$b() {
    const head = document.head || document.getElementsByTagName('head')[0];
    const styles = __vue_create_injector__$b.styles || (__vue_create_injector__$b.styles = {});
    const isOldIE =
      typeof navigator !== 'undefined' &&
      /msie [6-9]\\b/.test(navigator.userAgent.toLowerCase());

    return function addStyle(id, css) {
      if (document.querySelector('style[data-vue-ssr-id~="' + id + '"]')) return // SSR styles are present.

      const group = isOldIE ? css.media || 'default' : id;
      const style = styles[group] || (styles[group] = { ids: [], parts: [], element: undefined });

      if (!style.ids.includes(id)) {
        let code = css.source;
        let index = style.ids.length;

        style.ids.push(id);

        if (isOldIE) {
          style.element = style.element || document.querySelector('style[data-group=' + group + ']');
        }

        if (!style.element) {
          const el = style.element = document.createElement('style');
          el.type = 'text/css';

          if (css.media) el.setAttribute('media', css.media);
          if (isOldIE) {
            el.setAttribute('data-group', group);
            el.setAttribute('data-next-index', '0');
          }

          head.appendChild(el);
        }

        if (isOldIE) {
          index = parseInt(style.element.getAttribute('data-next-index'));
          style.element.setAttribute('data-next-index', index + 1);
        }

        if (style.element.styleSheet) {
          style.parts.push(code);
          style.element.styleSheet.cssText = style.parts
            .filter(Boolean)
            .join('\n');
        } else {
          const textNode = document.createTextNode(code);
          const nodes = style.element.childNodes;
          if (nodes[index]) style.element.removeChild(nodes[index]);
          if (nodes.length) style.element.insertBefore(textNode, nodes[index]);
          else style.element.appendChild(textNode);
        }
      }
    }
  }
  /* style inject SSR */
  

  
  var NewProfilePage = __vue_normalize__$b(
    { render: __vue_render__$b, staticRenderFns: __vue_staticRenderFns__$b },
    __vue_inject_styles__$b,
    __vue_script__$b,
    __vue_scope_id__$b,
    __vue_is_functional_template__$b,
    __vue_module_identifier__$b,
    __vue_create_injector__$b,
    undefined
  );

//

var script$c = {
  components: { ContextMenu, DefaultImageItemPage, NewProfilePage },
  props: {
    id: {
      default: '',
      type: String,
    },
  },
  // eslint-disable-next-line sort-keys
  computed: {
    isNewProfilePage() {
      return this.$store.getters['pixiv/nppType'] >= 0;
    },
  },
};

/* script */
            const __vue_script__$c = script$c;
            
/* template */
var __vue_render__$c = function() {
  var _vm = this;
  var _h = _vm.$createElement;
  var _c = _vm._self._c || _h;
  return _c(
    "div",
    { attrs: { id: _vm.id } },
    [
      _vm.isNewProfilePage ? _c("NewProfilePage") : _c("DefaultImageItemPage"),
      _vm._v(" "),
      _c("ContextMenu")
    ],
    1
  )
};
var __vue_staticRenderFns__$c = [];
__vue_render__$c._withStripped = true;

  /* style */
  const __vue_inject_styles__$c = function (inject) {
    if (!inject) return
    inject("data-v-4ab1002e_0", { source: "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n", map: {"version":3,"sources":[],"names":[],"mappings":"","file":"MainView.vue"}, media: undefined });

  };
  /* scoped */
  const __vue_scope_id__$c = "data-v-4ab1002e";
  /* module identifier */
  const __vue_module_identifier__$c = undefined;
  /* functional template */
  const __vue_is_functional_template__$c = false;
  /* component normalizer */
  function __vue_normalize__$c(
    template, style, script,
    scope, functional, moduleIdentifier,
    createInjector, createInjectorSSR
  ) {
    const component = (typeof script === 'function' ? script.options : script) || {};

    // For security concerns, we use only base name in production mode.
    component.__file = "/home/flandre/dev/Patchouli/src/components/MainView.vue";

    if (!component.render) {
      component.render = template.render;
      component.staticRenderFns = template.staticRenderFns;
      component._compiled = true;

      if (functional) component.functional = true;
    }

    component._scopeId = scope;

    {
      let hook;
      if (style) {
        hook = function(context) {
          style.call(this, createInjector(context));
        };
      }

      if (hook !== undefined) {
        if (component.functional) {
          // register for functional component in vue file
          const originalRender = component.render;
          component.render = function renderWithStyleInjection(h, context) {
            hook.call(context);
            return originalRender(h, context)
          };
        } else {
          // inject component registration as beforeCreate hook
          const existing = component.beforeCreate;
          component.beforeCreate = existing ? [].concat(existing, hook) : [hook];
        }
      }
    }

    return component
  }
  /* style inject */
  function __vue_create_injector__$c() {
    const head = document.head || document.getElementsByTagName('head')[0];
    const styles = __vue_create_injector__$c.styles || (__vue_create_injector__$c.styles = {});
    const isOldIE =
      typeof navigator !== 'undefined' &&
      /msie [6-9]\\b/.test(navigator.userAgent.toLowerCase());

    return function addStyle(id, css) {
      if (document.querySelector('style[data-vue-ssr-id~="' + id + '"]')) return // SSR styles are present.

      const group = isOldIE ? css.media || 'default' : id;
      const style = styles[group] || (styles[group] = { ids: [], parts: [], element: undefined });

      if (!style.ids.includes(id)) {
        let code = css.source;
        let index = style.ids.length;

        style.ids.push(id);

        if (isOldIE) {
          style.element = style.element || document.querySelector('style[data-group=' + group + ']');
        }

        if (!style.element) {
          const el = style.element = document.createElement('style');
          el.type = 'text/css';

          if (css.media) el.setAttribute('media', css.media);
          if (isOldIE) {
            el.setAttribute('data-group', group);
            el.setAttribute('data-next-index', '0');
          }

          head.appendChild(el);
        }

        if (isOldIE) {
          index = parseInt(style.element.getAttribute('data-next-index'));
          style.element.setAttribute('data-next-index', index + 1);
        }

        if (style.element.styleSheet) {
          style.parts.push(code);
          style.element.styleSheet.cssText = style.parts
            .filter(Boolean)
            .join('\n');
        } else {
          const textNode = document.createTextNode(code);
          const nodes = style.element.childNodes;
          if (nodes[index]) style.element.removeChild(nodes[index]);
          if (nodes.length) style.element.insertBefore(textNode, nodes[index]);
          else style.element.appendChild(textNode);
        }
      }
    }
  }
  /* style inject SSR */
  

  
  var mainView = __vue_normalize__$c(
    { render: __vue_render__$c, staticRenderFns: __vue_staticRenderFns__$c },
    __vue_inject_styles__$c,
    __vue_script__$c,
    __vue_scope_id__$c,
    __vue_is_functional_template__$c,
    __vue_module_identifier__$c,
    __vue_create_injector__$c,
    undefined
  );

//

var script$d = {
  props: {
    id: {
      default: '',
      type: String,
    },
  },
  // eslint-disable-next-line sort-keys
  data() {
    return {
      previewCurrentIndex: 0,
      previewSrcList: [],
      previewUgoiraMetaData: null,
      ugoiraPlayers: [],
    };
  },
  // eslint-disable-next-line sort-keys
  computed: {
    // vue'x' 'c'onfig
    xc() {
      return this.$store.getters.config;
    },
    xdata() {
      return this.$store.getters['coverLayer/data'];
    },
    xmode() {
      return this.$store.getters['coverLayer/mode'];
    },
  },
  watch: {
    async xmode(value) {
      $print.debug('watch xmode change:', value);

      if (value === 'preview') {
        const imageItem = this.xdata;
        if (imageItem.isUgoira) {
          this.previewUgoiraMetaData = await PixivAPI.getIllustUgoiraMetaData(
            imageItem.illustId
          );
          this.initZipImagePlayer();
          this.previewSrcList.push(imageItem.urls.thumb);
          this.previewSrcList.push(imageItem.urls.original);
        } else if (imageItem.illustPageCount > 1) {
          const indexArray = Array.from(
            Array(imageItem.illustPageCount).keys()
          );
          const srcs = indexArray.map(idx =>
            imageItem.urls.original.replace('p0', `p${idx}`)
          );
          this.previewSrcList.push(...srcs);
        } else {
          this.previewSrcList.push(imageItem.urls.original);
        }
      } else if (!value) {
        this.previewSrcList.length = 0;
        this.previewCurrentIndex = 0;
        this.previewUgoiraMetaData = null;
        this.ugoiraPlayers.forEach(player => player.stop());
        this.ugoiraPlayers.length = 0;
      }
    },
  },
  // eslint-disable-next-line sort-keys
  updated() {
    if (this.xmode === 'preview') {
      this.$refs.coverLayerRoot.focus();
    }
  },
  // eslint-disable-next-line sort-keys
  methods: {
    clickBase(event) {
      $print.debug('CoverLayer#clickBase: event', event);
      this.$store.commit('coverLayer/close');

      const blacklist = [
        ...new Set(
          this.$refs.blacklistTextarea.value
            .split('\n')
            .map(s => s.trim())
            .filter(Boolean)
        ),
      ];

      blacklist.sort((a, b) => a - b);

      this.$store.commit('setConfig', { blacklist });
      this.$store.commit('saveConfig');
    },
    clickSwitch(event) {
      $print.debug('CoverLayer#clickSwitch: event', event);

      if (event.currentTarget.id === 'config-context-menu-switch') {
        this.xc.contextMenu = toInt(!this.xc.contextMenu);
      }

      if (event.currentTarget.id === 'config-user-tooltip-switch') {
        this.xc.userTooltip = toInt(!this.xc.userTooltip);
      }

      if (event.currentTarget.id === 'config-hover-play-switch') {
        this.xc.hoverPlay = toInt(!this.xc.hoverPlay);
      }
    },
    initZipImagePlayer() {
      const meta = this.previewUgoiraMetaData;
      // resize as clear
      this.$refs.previewOriginalUgoiraCanvas.width = 0;
      this.$refs.previewUgoiraCanvas.width = 0;

      const opt = {
        autoStart: true,
        autosize: true,
        canvas: this.$refs.previewUgoiraCanvas,
        chunkSize: 300000,
        loop: true,
        metadata: meta,
        source: meta.src,
      };

      this.ugoiraPlayers.push(new ZipImagePlayer(opt));

      this.ugoiraPlayers.push(
        new ZipImagePlayer(
          Object.assign({}, opt, {
            canvas: this.$refs.previewOriginalUgoiraCanvas,
            source: meta.originalSrc,
          })
        )
      );
    },
    jumpByKeyup(event) {
      $print.debug('CoverLayer#jumpByKeyup: event', event);

      if (this.xmode === 'preview') {
        if (event.key === 'ArrowLeft') {
          this.jumpPrev();
        } else if (event.key === 'ArrowRight') {
          this.jumpNext();
        }
      }
    },
    jumpByWheel(event) {
      $print.debug('CoverLayer#jumpByWheel: event', event);

      if (this.xmode === 'preview') {
        if (event.deltaY < 0) {
          this.jumpPrev();
        } else if (event.deltaY > 0) {
          this.jumpNext();
        }
      }
    },
    jumpNext() {
      const t = this.previewSrcList.length;
      const c = this.previewCurrentIndex;
      this.jumpTo((c + 1) % t);
    },
    jumpPrev() {
      const t = this.previewSrcList.length;
      const c = this.previewCurrentIndex;
      this.jumpTo((c + t - 1) % t);
    },
    jumpTo(index) {
      this.previewCurrentIndex = index;
    },
  },
};

/* script */
            const __vue_script__$d = script$d;
            
/* template */
var __vue_render__$d = function() {
  var _vm = this;
  var _h = _vm.$createElement;
  var _c = _vm._self._c || _h;
  return _c(
    "div",
    {
      directives: [
        {
          name: "show",
          rawName: "v-show",
          value: _vm.xmode,
          expression: "xmode"
        }
      ],
      ref: "coverLayerRoot",
      attrs: { id: _vm.id, tabindex: "0" },
      on: {
        keyup: _vm.jumpByKeyup,
        click: function($event) {
          if (
            !("button" in $event) &&
            _vm._k($event.keyCode, "left", 37, $event.key, [
              "Left",
              "ArrowLeft"
            ])
          ) {
            return null
          }
          if ("button" in $event && $event.button !== 0) {
            return null
          }
          return _vm.clickBase($event)
        },
        scroll: function($event) {
          $event.stopPropagation();
          $event.preventDefault();
        },
        wheel: function($event) {
          $event.stopPropagation();
          $event.preventDefault();
          return _vm.jumpByWheel($event)
        }
      }
    },
    [
      _c(
        "div",
        {
          directives: [
            {
              name: "show",
              rawName: "v-show",
              value: _vm.xmode === "config",
              expression: "xmode === 'config'"
            }
          ],
          attrs: { id: "marisa-config-mode" },
          on: {
            click: function($event) {
              $event.stopPropagation();
            }
          }
        },
        [
          _c(
            "a",
            {
              attrs: { id: "config-context-menu-switch" },
              on: {
                click: function($event) {
                  if (
                    !("button" in $event) &&
                    _vm._k($event.keyCode, "left", 37, $event.key, [
                      "Left",
                      "ArrowLeft"
                    ])
                  ) {
                    return null
                  }
                  if ("button" in $event && $event.button !== 0) {
                    return null
                  }
                  return _vm.clickSwitch($event)
                }
              }
            },
            [
              _c(
                "a",
                {
                  directives: [
                    {
                      name: "show",
                      rawName: "v-show",
                      value: _vm.xc.contextMenu,
                      expression: "xc.contextMenu"
                    }
                  ],
                  attrs: { id: "config-context-menu-switch-on", role: "button" }
                },
                [_c("i", { staticClass: "fas fa-toggle-on" })]
              ),
              _vm._v(" "),
              _c(
                "a",
                {
                  directives: [
                    {
                      name: "show",
                      rawName: "v-show",
                      value: !_vm.xc.contextMenu,
                      expression: "!xc.contextMenu"
                    }
                  ],
                  attrs: {
                    id: "config-context-menu-switch-off",
                    role: "button"
                  }
                },
                [_c("i", { staticClass: "fas fa-toggle-off" })]
              ),
              _vm._v(" "),
              _c("span", { attrs: { id: "config-context-menu-label" } }, [
                _vm._v(_vm._s(_vm.$t("config.contextMenuExtension")))
              ])
            ]
          ),
          _vm._v(" "),
          _c(
            "a",
            {
              attrs: { id: "config-user-tooltip-switch" },
              on: {
                click: function($event) {
                  if (
                    !("button" in $event) &&
                    _vm._k($event.keyCode, "left", 37, $event.key, [
                      "Left",
                      "ArrowLeft"
                    ])
                  ) {
                    return null
                  }
                  if ("button" in $event && $event.button !== 0) {
                    return null
                  }
                  return _vm.clickSwitch($event)
                }
              }
            },
            [
              _c(
                "a",
                {
                  directives: [
                    {
                      name: "show",
                      rawName: "v-show",
                      value: _vm.xc.userTooltip,
                      expression: "xc.userTooltip"
                    }
                  ],
                  attrs: { id: "config-user-tooltip-switch-on", role: "button" }
                },
                [_c("i", { staticClass: "fas fa-toggle-on" })]
              ),
              _vm._v(" "),
              _c(
                "a",
                {
                  directives: [
                    {
                      name: "show",
                      rawName: "v-show",
                      value: !_vm.xc.userTooltip,
                      expression: "!xc.userTooltip"
                    }
                  ],
                  attrs: {
                    id: "config-user-tooltip-switch-off",
                    role: "button"
                  }
                },
                [_c("i", { staticClass: "fas fa-toggle-off" })]
              ),
              _vm._v(" "),
              _c("span", { attrs: { id: "config-user-tooltip-label" } }, [
                _vm._v(_vm._s(_vm.$t("config.userTooltip")))
              ])
            ]
          ),
          _vm._v(" "),
          _c(
            "a",
            {
              attrs: { id: "config-hover-play-switch" },
              on: {
                click: function($event) {
                  if (
                    !("button" in $event) &&
                    _vm._k($event.keyCode, "left", 37, $event.key, [
                      "Left",
                      "ArrowLeft"
                    ])
                  ) {
                    return null
                  }
                  if ("button" in $event && $event.button !== 0) {
                    return null
                  }
                  return _vm.clickSwitch($event)
                }
              }
            },
            [
              _c(
                "a",
                {
                  directives: [
                    {
                      name: "show",
                      rawName: "v-show",
                      value: _vm.xc.hoverPlay,
                      expression: "xc.hoverPlay"
                    }
                  ],
                  attrs: { id: "config-hover-play-switch-on", role: "button" }
                },
                [_c("i", { staticClass: "fas fa-toggle-on" })]
              ),
              _vm._v(" "),
              _c(
                "a",
                {
                  directives: [
                    {
                      name: "show",
                      rawName: "v-show",
                      value: !_vm.xc.hoverPlay,
                      expression: "!xc.hoverPlay"
                    }
                  ],
                  attrs: { id: "config-hover-play-switch-off", role: "button" }
                },
                [_c("i", { staticClass: "fas fa-toggle-off" })]
              ),
              _vm._v(" "),
              _c("span", { attrs: { id: "config-hover-play-label" } }, [
                _vm._v(_vm._s(_vm.$t("config.hoverPlay")))
              ])
            ]
          ),
          _vm._v(" "),
          _c("a", { attrs: { id: "marisa-config-blacklist-label" } }, [
            _c("i", { staticClass: "far fa-eye-slash" }),
            _vm._v(_vm._s(_vm.$t("config.blacklist")) + "\n    ")
          ]),
          _vm._v(" "),
          _c("textarea", {
            ref: "blacklistTextarea",
            attrs: {
              id: "marisa-config-blacklist-textarea",
              spellcheck: "false",
              rows: "5"
            },
            domProps: { value: _vm.xc.blacklist.join("\n") }
          })
        ]
      ),
      _vm._v(" "),
      _c(
        "div",
        {
          directives: [
            {
              name: "show",
              rawName: "v-show",
              value: _vm.xmode === "preview",
              expression: "xmode === 'preview'"
            }
          ],
          attrs: { id: "marisa-preview-mode" },
          on: {
            click: function($event) {
              $event.stopPropagation();
            }
          }
        },
        [
          _c("div", { attrs: { id: "marisa-preview-display-area" } }, [
            _c(
              "a",
              {
                directives: [
                  {
                    name: "show",
                    rawName: "v-show",
                    value: !_vm.previewUgoiraMetaData,
                    expression: "!previewUgoiraMetaData"
                  }
                ],
                attrs: {
                  href: _vm.previewSrcList[_vm.previewCurrentIndex],
                  target: "_blank"
                }
              },
              [
                _c("img", {
                  attrs: { src: _vm.previewSrcList[_vm.previewCurrentIndex] }
                })
              ]
            ),
            _vm._v(" "),
            _c(
              "div",
              {
                directives: [
                  {
                    name: "show",
                    rawName: "v-show",
                    value: !!_vm.previewUgoiraMetaData,
                    expression: "!!previewUgoiraMetaData"
                  }
                ]
              },
              [
                _c("canvas", {
                  directives: [
                    {
                      name: "show",
                      rawName: "v-show",
                      value: _vm.previewCurrentIndex === 0,
                      expression: "previewCurrentIndex === 0"
                    }
                  ],
                  ref: "previewUgoiraCanvas"
                }),
                _vm._v(" "),
                _c("canvas", {
                  directives: [
                    {
                      name: "show",
                      rawName: "v-show",
                      value: _vm.previewCurrentIndex === 1,
                      expression: "previewCurrentIndex === 1"
                    }
                  ],
                  ref: "previewOriginalUgoiraCanvas"
                })
              ]
            )
          ]),
          _vm._v(" "),
          _c(
            "ul",
            {
              directives: [
                {
                  name: "show",
                  rawName: "v-show",
                  value: _vm.previewSrcList.length > 1,
                  expression: "previewSrcList.length > 1"
                }
              ],
              attrs: { id: "marisa-preview-thumbnails-area" }
            },
            _vm._l(_vm.previewSrcList, function(pSrc, index) {
              return _c("li", { key: pSrc }, [
                _c(
                  "a",
                  {
                    class:
                      index === _vm.previewCurrentIndex
                        ? "current-preview"
                        : "",
                    on: {
                      click: function($event) {
                        if (
                          !("button" in $event) &&
                          _vm._k($event.keyCode, "left", 37, $event.key, [
                            "Left",
                            "ArrowLeft"
                          ])
                        ) {
                          return null
                        }
                        if ("button" in $event && $event.button !== 0) {
                          return null
                        }
                        _vm.jumpTo(index);
                      }
                    }
                  },
                  [_c("img", { attrs: { src: pSrc } })]
                )
              ])
            })
          )
        ]
      )
    ]
  )
};
var __vue_staticRenderFns__$d = [];
__vue_render__$d._withStripped = true;

  /* style */
  const __vue_inject_styles__$d = function (inject) {
    if (!inject) return
    inject("data-v-6e5f249a_0", { source: "\n#Marisa[data-v-6e5f249a] {\n  background-color: #000a;\n  position: fixed;\n  height: 100%;\n  width: 100%;\n  z-index: 5;\n  top: 0;\n  left: 0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n#marisa-config-mode[data-v-6e5f249a],\n#marisa-preview-mode[data-v-6e5f249a] {\n  min-width: 100px;\n  min-height: 100px;\n  background-color: #eef;\n}\n#marisa-config-mode[data-v-6e5f249a] {\n  display: flex;\n  flex-flow: column;\n  padding: 10px;\n  border-radius: 10px;\n  font-size: 18px;\n  white-space: nowrap;\n}\n#marisa-config-mode a[data-v-6e5f249a] {\n  color: #00186c;\n  text-decoration: none;\n}\n#marisa-config-mode [id$=\"switch\"][data-v-6e5f249a] {\n  text-align: center;\n}\n#marisa-config-mode [id$=\"switch\"][data-v-6e5f249a]:hover {\n  cursor: pointer;\n}\n#marisa-config-mode [id$=\"label\"][data-v-6e5f249a] {\n  text-align: center;\n  margin: 0 5px;\n}\n#marisa-config-blacklist-label > .fa-eye-slash[data-v-6e5f249a] {\n  margin: 0 4px;\n}\n#marisa-config-blacklist-textarea[data-v-6e5f249a] {\n  box-sizing: border-box;\n  flex: 1;\n  resize: none;\n  font-size: 11pt;\n  height: 90px;\n}\n#marisa-preview-mode[data-v-6e5f249a] {\n  width: 70%;\n  height: 100%;\n  box-sizing: border-box;\n  display: grid;\n  grid-template-rows: minmax(0, auto) max-content;\n}\n#marisa-preview-display-area[data-v-6e5f249a] {\n  border: 2px #00186c solid;\n  box-sizing: border-box;\n  text-align: center;\n}\n#marisa-preview-display-area > a[data-v-6e5f249a],\n#marisa-preview-display-area > div[data-v-6e5f249a] {\n  display: inline-flex;\n  height: 100%;\n  justify-content: center;\n  align-items: center;\n}\n#marisa-preview-display-area > a > img[data-v-6e5f249a],\n#marisa-preview-display-area > div > canvas[data-v-6e5f249a] {\n  object-fit: contain;\n  max-width: 100%;\n  max-height: 100%;\n}\n#marisa-preview-thumbnails-area[data-v-6e5f249a] {\n  background-color: ghostwhite;\n  display: flex;\n  align-items: center;\n  overflow-x: auto;\n  overflow-y: hidden;\n  height: 100%;\n  border: 2px solid #014;\n  box-sizing: border-box;\n  border-top: 0;\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n#marisa-preview-thumbnails-area > li[data-v-6e5f249a] {\n  margin: 0 10px;\n  display: inline-flex;\n}\n#marisa-preview-thumbnails-area > li > a[data-v-6e5f249a] {\n  cursor: pointer;\n  display: inline-flex;\n  border: 3px solid transparent;\n}\n#marisa-preview-thumbnails-area > li > a.current-preview[data-v-6e5f249a] {\n  border: 3px solid palevioletred;\n}\n#marisa-preview-thumbnails-area > li > a > img[data-v-6e5f249a] {\n  max-height: 100px;\n  box-sizing: border-box;\n  display: inline-block;\n}\n", map: {"version":3,"sources":["/home/flandre/dev/Patchouli/src/components/CoverLayer.vue"],"names":[],"mappings":";AAgRA;EACA,wBAAA;EACA,gBAAA;EACA,aAAA;EACA,YAAA;EACA,WAAA;EACA,OAAA;EACA,QAAA;EACA,cAAA;EACA,oBAAA;EACA,wBAAA;CACA;AACA;;EAEA,iBAAA;EACA,kBAAA;EACA,uBAAA;CACA;AACA;EACA,cAAA;EACA,kBAAA;EACA,cAAA;EACA,oBAAA;EACA,gBAAA;EACA,oBAAA;CACA;AACA;EACA,eAAA;EACA,sBAAA;CACA;AACA;EACA,mBAAA;CACA;AACA;EACA,gBAAA;CACA;AACA;EACA,mBAAA;EACA,cAAA;CACA;AACA;EACA,cAAA;CACA;AACA;EACA,uBAAA;EACA,QAAA;EACA,aAAA;EACA,gBAAA;EACA,aAAA;CACA;AACA;EACA,WAAA;EACA,aAAA;EACA,uBAAA;EACA,cAAA;EACA,gDAAA;CACA;AACA;EACA,0BAAA;EACA,uBAAA;EACA,mBAAA;CACA;AACA;;EAEA,qBAAA;EACA,aAAA;EACA,wBAAA;EACA,oBAAA;CACA;AACA;;EAEA,oBAAA;EACA,gBAAA;EACA,iBAAA;CACA;AACA;EACA,6BAAA;EACA,cAAA;EACA,oBAAA;EACA,iBAAA;EACA,mBAAA;EACA,aAAA;EACA,uBAAA;EACA,uBAAA;EACA,cAAA;EACA,UAAA;EACA,WAAA;EACA,iBAAA;CACA;AACA;EACA,eAAA;EACA,qBAAA;CACA;AACA;EACA,gBAAA;EACA,qBAAA;EACA,8BAAA;CACA;AACA;EACA,gCAAA;CACA;AACA;EACA,kBAAA;EACA,uBAAA;EACA,sBAAA;CACA","file":"CoverLayer.vue","sourcesContent":["<template>\n  <div\n    v-show=\"xmode\"\n    ref=\"coverLayerRoot\"\n    :id=\"id\"\n    tabindex=\"0\"\n    @keyup=\"jumpByKeyup\"\n    @click.left=\"clickBase\"\n    @scroll.stop.prevent=\"0\"\n    @wheel.stop.prevent=\"jumpByWheel\">\n    <div\n      v-show=\"xmode === 'config'\"\n      id=\"marisa-config-mode\"\n      @click.stop=\"0\">\n      <a id=\"config-context-menu-switch\" @click.left=\"clickSwitch\">\n        <a\n          v-show=\"xc.contextMenu\"\n          id=\"config-context-menu-switch-on\"\n          role=\"button\">\n          <i class=\"fas fa-toggle-on\"/>\n        </a>\n        <a\n          v-show=\"!xc.contextMenu\"\n          id=\"config-context-menu-switch-off\"\n          role=\"button\">\n          <i class=\"fas fa-toggle-off\"/>\n        </a>\n        <span id=\"config-context-menu-label\">{{ $t('config.contextMenuExtension') }}</span>\n      </a>\n      <a id=\"config-user-tooltip-switch\" @click.left=\"clickSwitch\">\n        <a\n          v-show=\"xc.userTooltip\"\n          id=\"config-user-tooltip-switch-on\"\n          role=\"button\">\n          <i class=\"fas fa-toggle-on\"/>\n        </a>\n        <a\n          v-show=\"!xc.userTooltip\"\n          id=\"config-user-tooltip-switch-off\"\n          role=\"button\">\n          <i class=\"fas fa-toggle-off\"/>\n        </a>\n        <span id=\"config-user-tooltip-label\">{{ $t('config.userTooltip') }}</span>\n      </a>\n      <a id=\"config-hover-play-switch\" @click.left=\"clickSwitch\">\n        <a\n          v-show=\"xc.hoverPlay\"\n          id=\"config-hover-play-switch-on\"\n          role=\"button\">\n          <i class=\"fas fa-toggle-on\"/>\n        </a>\n        <a\n          v-show=\"!xc.hoverPlay\"\n          id=\"config-hover-play-switch-off\"\n          role=\"button\">\n          <i class=\"fas fa-toggle-off\"/>\n        </a>\n        <span id=\"config-hover-play-label\">{{ $t('config.hoverPlay') }}</span>\n      </a>\n      <a id=\"marisa-config-blacklist-label\">\n        <i class=\"far fa-eye-slash\"/>{{ $t('config.blacklist') }}\n      </a>\n      <textarea\n        id=\"marisa-config-blacklist-textarea\"\n        ref=\"blacklistTextarea\"\n        :value=\"xc.blacklist.join('\\n')\"\n        spellcheck=\"false\"\n        rows=\"5\"/>\n    </div>\n    <div\n      v-show=\"xmode === 'preview'\"\n      id=\"marisa-preview-mode\"\n      @click.stop=\"0\">\n      <div id=\"marisa-preview-display-area\">\n        <a\n          v-show=\"!previewUgoiraMetaData\"\n          :href=\"previewSrcList[previewCurrentIndex]\"\n          target=\"_blank\">\n          <img :src=\"previewSrcList[previewCurrentIndex]\">\n        </a>\n        <div v-show=\"!!previewUgoiraMetaData\">\n          <canvas v-show=\"previewCurrentIndex === 0\" ref=\"previewUgoiraCanvas\"/>\n          <canvas v-show=\"previewCurrentIndex === 1\" ref=\"previewOriginalUgoiraCanvas\"/>\n        </div>\n      </div>\n      <ul v-show=\"previewSrcList.length > 1\" id=\"marisa-preview-thumbnails-area\">\n        <li v-for=\"(pSrc, index) in previewSrcList\" :key=\"pSrc\">\n          <a\n            :class=\"(index === previewCurrentIndex) ? 'current-preview' : ''\"\n            @click.left=\"jumpTo(index)\" >\n            <img :src=\"pSrc\">\n          </a>\n        </li>\n      </ul>\n    </div>\n  </div>\n</template>\n\n<script>\nimport { PixivAPI } from '../lib/pixiv';\nimport { $print, toInt } from '../lib/utils';\n\nexport default {\n  props: {\n    id: {\n      default: '',\n      type: String,\n    },\n  },\n  // eslint-disable-next-line sort-keys\n  data() {\n    return {\n      previewCurrentIndex: 0,\n      previewSrcList: [],\n      previewUgoiraMetaData: null,\n      ugoiraPlayers: [],\n    };\n  },\n  // eslint-disable-next-line sort-keys\n  computed: {\n    // vue'x' 'c'onfig\n    xc() {\n      return this.$store.getters.config;\n    },\n    xdata() {\n      return this.$store.getters['coverLayer/data'];\n    },\n    xmode() {\n      return this.$store.getters['coverLayer/mode'];\n    },\n  },\n  watch: {\n    async xmode(value) {\n      $print.debug('watch xmode change:', value);\n\n      if (value === 'preview') {\n        const imageItem = this.xdata;\n        if (imageItem.isUgoira) {\n          this.previewUgoiraMetaData = await PixivAPI.getIllustUgoiraMetaData(\n            imageItem.illustId\n          );\n          this.initZipImagePlayer();\n          this.previewSrcList.push(imageItem.urls.thumb);\n          this.previewSrcList.push(imageItem.urls.original);\n        } else if (imageItem.illustPageCount > 1) {\n          const indexArray = Array.from(\n            Array(imageItem.illustPageCount).keys()\n          );\n          const srcs = indexArray.map(idx =>\n            imageItem.urls.original.replace('p0', `p${idx}`)\n          );\n          this.previewSrcList.push(...srcs);\n        } else {\n          this.previewSrcList.push(imageItem.urls.original);\n        }\n      } else if (!value) {\n        this.previewSrcList.length = 0;\n        this.previewCurrentIndex = 0;\n        this.previewUgoiraMetaData = null;\n        this.ugoiraPlayers.forEach(player => player.stop());\n        this.ugoiraPlayers.length = 0;\n      }\n    },\n  },\n  // eslint-disable-next-line sort-keys\n  updated() {\n    if (this.xmode === 'preview') {\n      this.$refs.coverLayerRoot.focus();\n    }\n  },\n  // eslint-disable-next-line sort-keys\n  methods: {\n    clickBase(event) {\n      $print.debug('CoverLayer#clickBase: event', event);\n      this.$store.commit('coverLayer/close');\n\n      const blacklist = [\n        ...new Set(\n          this.$refs.blacklistTextarea.value\n            .split('\\n')\n            .map(s => s.trim())\n            .filter(Boolean)\n        ),\n      ];\n\n      blacklist.sort((a, b) => a - b);\n\n      this.$store.commit('setConfig', { blacklist });\n      this.$store.commit('saveConfig');\n    },\n    clickSwitch(event) {\n      $print.debug('CoverLayer#clickSwitch: event', event);\n\n      if (event.currentTarget.id === 'config-context-menu-switch') {\n        this.xc.contextMenu = toInt(!this.xc.contextMenu);\n      }\n\n      if (event.currentTarget.id === 'config-user-tooltip-switch') {\n        this.xc.userTooltip = toInt(!this.xc.userTooltip);\n      }\n\n      if (event.currentTarget.id === 'config-hover-play-switch') {\n        this.xc.hoverPlay = toInt(!this.xc.hoverPlay);\n      }\n    },\n    initZipImagePlayer() {\n      const meta = this.previewUgoiraMetaData;\n      // resize as clear\n      this.$refs.previewOriginalUgoiraCanvas.width = 0;\n      this.$refs.previewUgoiraCanvas.width = 0;\n\n      const opt = {\n        autoStart: true,\n        autosize: true,\n        canvas: this.$refs.previewUgoiraCanvas,\n        chunkSize: 300000,\n        loop: true,\n        metadata: meta,\n        source: meta.src,\n      };\n\n      this.ugoiraPlayers.push(new ZipImagePlayer(opt));\n\n      this.ugoiraPlayers.push(\n        new ZipImagePlayer(\n          Object.assign({}, opt, {\n            canvas: this.$refs.previewOriginalUgoiraCanvas,\n            source: meta.originalSrc,\n          })\n        )\n      );\n    },\n    jumpByKeyup(event) {\n      $print.debug('CoverLayer#jumpByKeyup: event', event);\n\n      if (this.xmode === 'preview') {\n        if (event.key === 'ArrowLeft') {\n          this.jumpPrev();\n        } else if (event.key === 'ArrowRight') {\n          this.jumpNext();\n        }\n      }\n    },\n    jumpByWheel(event) {\n      $print.debug('CoverLayer#jumpByWheel: event', event);\n\n      if (this.xmode === 'preview') {\n        if (event.deltaY < 0) {\n          this.jumpPrev();\n        } else if (event.deltaY > 0) {\n          this.jumpNext();\n        }\n      }\n    },\n    jumpNext() {\n      const t = this.previewSrcList.length;\n      const c = this.previewCurrentIndex;\n      this.jumpTo((c + 1) % t);\n    },\n    jumpPrev() {\n      const t = this.previewSrcList.length;\n      const c = this.previewCurrentIndex;\n      this.jumpTo((c + t - 1) % t);\n    },\n    jumpTo(index) {\n      this.previewCurrentIndex = index;\n    },\n  },\n};\n</script>\n\n<style scoped>\n#Marisa {\n  background-color: #000a;\n  position: fixed;\n  height: 100%;\n  width: 100%;\n  z-index: 5;\n  top: 0;\n  left: 0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n#marisa-config-mode,\n#marisa-preview-mode {\n  min-width: 100px;\n  min-height: 100px;\n  background-color: #eef;\n}\n#marisa-config-mode {\n  display: flex;\n  flex-flow: column;\n  padding: 10px;\n  border-radius: 10px;\n  font-size: 18px;\n  white-space: nowrap;\n}\n#marisa-config-mode a {\n  color: #00186c;\n  text-decoration: none;\n}\n#marisa-config-mode [id$=\"switch\"] {\n  text-align: center;\n}\n#marisa-config-mode [id$=\"switch\"]:hover {\n  cursor: pointer;\n}\n#marisa-config-mode [id$=\"label\"] {\n  text-align: center;\n  margin: 0 5px;\n}\n#marisa-config-blacklist-label > .fa-eye-slash {\n  margin: 0 4px;\n}\n#marisa-config-blacklist-textarea {\n  box-sizing: border-box;\n  flex: 1;\n  resize: none;\n  font-size: 11pt;\n  height: 90px;\n}\n#marisa-preview-mode {\n  width: 70%;\n  height: 100%;\n  box-sizing: border-box;\n  display: grid;\n  grid-template-rows: minmax(0, auto) max-content;\n}\n#marisa-preview-display-area {\n  border: 2px #00186c solid;\n  box-sizing: border-box;\n  text-align: center;\n}\n#marisa-preview-display-area > a,\n#marisa-preview-display-area > div {\n  display: inline-flex;\n  height: 100%;\n  justify-content: center;\n  align-items: center;\n}\n#marisa-preview-display-area > a > img,\n#marisa-preview-display-area > div > canvas {\n  object-fit: contain;\n  max-width: 100%;\n  max-height: 100%;\n}\n#marisa-preview-thumbnails-area {\n  background-color: ghostwhite;\n  display: flex;\n  align-items: center;\n  overflow-x: auto;\n  overflow-y: hidden;\n  height: 100%;\n  border: 2px solid #014;\n  box-sizing: border-box;\n  border-top: 0;\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n#marisa-preview-thumbnails-area > li {\n  margin: 0 10px;\n  display: inline-flex;\n}\n#marisa-preview-thumbnails-area > li > a {\n  cursor: pointer;\n  display: inline-flex;\n  border: 3px solid transparent;\n}\n#marisa-preview-thumbnails-area > li > a.current-preview {\n  border: 3px solid palevioletred;\n}\n#marisa-preview-thumbnails-area > li > a > img {\n  max-height: 100px;\n  box-sizing: border-box;\n  display: inline-block;\n}\n</style>\n"]}, media: undefined });

  };
  /* scoped */
  const __vue_scope_id__$d = "data-v-6e5f249a";
  /* module identifier */
  const __vue_module_identifier__$d = undefined;
  /* functional template */
  const __vue_is_functional_template__$d = false;
  /* component normalizer */
  function __vue_normalize__$d(
    template, style, script,
    scope, functional, moduleIdentifier,
    createInjector, createInjectorSSR
  ) {
    const component = (typeof script === 'function' ? script.options : script) || {};

    // For security concerns, we use only base name in production mode.
    component.__file = "/home/flandre/dev/Patchouli/src/components/CoverLayer.vue";

    if (!component.render) {
      component.render = template.render;
      component.staticRenderFns = template.staticRenderFns;
      component._compiled = true;

      if (functional) component.functional = true;
    }

    component._scopeId = scope;

    {
      let hook;
      if (style) {
        hook = function(context) {
          style.call(this, createInjector(context));
        };
      }

      if (hook !== undefined) {
        if (component.functional) {
          // register for functional component in vue file
          const originalRender = component.render;
          component.render = function renderWithStyleInjection(h, context) {
            hook.call(context);
            return originalRender(h, context)
          };
        } else {
          // inject component registration as beforeCreate hook
          const existing = component.beforeCreate;
          component.beforeCreate = existing ? [].concat(existing, hook) : [hook];
        }
      }
    }

    return component
  }
  /* style inject */
  function __vue_create_injector__$d() {
    const head = document.head || document.getElementsByTagName('head')[0];
    const styles = __vue_create_injector__$d.styles || (__vue_create_injector__$d.styles = {});
    const isOldIE =
      typeof navigator !== 'undefined' &&
      /msie [6-9]\\b/.test(navigator.userAgent.toLowerCase());

    return function addStyle(id, css) {
      if (document.querySelector('style[data-vue-ssr-id~="' + id + '"]')) return // SSR styles are present.

      const group = isOldIE ? css.media || 'default' : id;
      const style = styles[group] || (styles[group] = { ids: [], parts: [], element: undefined });

      if (!style.ids.includes(id)) {
        let code = css.source;
        let index = style.ids.length;

        style.ids.push(id);

        if (isOldIE) {
          style.element = style.element || document.querySelector('style[data-group=' + group + ']');
        }

        if (!style.element) {
          const el = style.element = document.createElement('style');
          el.type = 'text/css';

          if (css.media) el.setAttribute('media', css.media);
          if (isOldIE) {
            el.setAttribute('data-group', group);
            el.setAttribute('data-next-index', '0');
          }

          head.appendChild(el);
        }

        if (isOldIE) {
          index = parseInt(style.element.getAttribute('data-next-index'));
          style.element.setAttribute('data-next-index', index + 1);
        }

        if (style.element.styleSheet) {
          style.parts.push(code);
          style.element.styleSheet.cssText = style.parts
            .filter(Boolean)
            .join('\n');
        } else {
          const textNode = document.createTextNode(code);
          const nodes = style.element.childNodes;
          if (nodes[index]) style.element.removeChild(nodes[index]);
          if (nodes.length) style.element.insertBefore(textNode, nodes[index]);
          else style.element.appendChild(textNode);
        }
      }
    }
  }
  /* style inject SSR */
  

  
  var coverLayer$1 = __vue_normalize__$d(
    { render: __vue_render__$d, staticRenderFns: __vue_staticRenderFns__$d },
    __vue_inject_styles__$d,
    __vue_script__$d,
    __vue_scope_id__$d,
    __vue_is_functional_template__$d,
    __vue_module_identifier__$d,
    __vue_create_injector__$d,
    undefined
  );

if (unsafeWindow) {
  // get pixiv info from real window to sandbox window
  const { globalInitData, pixiv } = unsafeWindow;
  // get API that ZipImagePlayer required
  const { DataView, ArrayBuffer } = unsafeWindow;

  Object.assign(window, {
    ArrayBuffer,
    DataView,
    globalInitData,
    pixiv,
  });
}

vuexStore.dispatch('init')
  .then(() => {
    if (vuexStore.getters.MPT === MAIN_PAGE_TYPE.NO_SUPPORT) {
      return;
    }

    removeAnnoyings();

    // <link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.2.0/css/all.css" integrity="sha384-hWVjflwFxL6sNzntih27bfxkr27PmbbK/iSvJ+a4+0owXq79v+lsFkW54bOGbiDQ" crossorigin="anonymous">
    const fontawesome = $el('link', {
      crossOrigin: 'anonymous',
      href: 'https://use.fontawesome.com/releases/v5.2.0/css/all.css',
      integrity: 'sha384-hWVjflwFxL6sNzntih27bfxkr27PmbbK/iSvJ+a4+0owXq79v+lsFkW54bOGbiDQ',
      rel: 'stylesheet',
    });
    document.head.appendChild(fontawesome);

    // setup koamuma placeholder
    if (vuexStore.getters['pixiv/nppType'] < 0) {
      $('._global-header').classList.add('koakuma-placeholder');
    }

    // hijack link
    if (vuexStore.getters.MPT === MAIN_PAGE_TYPE.SEARCH) {
      const menuItems = $('ul.menu-items');
      [...menuItems.children].forEach((item, index) => {
        const textContent = item.textContent;
        const a = $el('a', { href: 'javascript:;', textContent });
        item.removeChild(item.firstChild);
        item.appendChild(a);

        item.addEventListener('click', () => {
          [...menuItems.children].forEach(_item => _item.classList.remove('current'));
          item.classList.add('current');

          const target = $('#koakuma-bookmark-tags-filter-input');
          if (index === 1) {
            target.value = '-R-18';
          } else if (index === 2) {
            target.value = 'R-18';
          } else {
            target.value = '';
          }
          Koakuma.$children[0].tagsFilterInput({ target });
        });
      });
    }

    /* eslint-disable sort-keys */
    const Koakuma = new Vue({
      i18n,
      store: vuexStore,
      data: {
        name: 'Koakuma',
      },
      computed: {
        currentLocale() {
          return this.$store.getters.locale;
        },
      },
      watch: {
        currentLocale(newValue) {
          this.$i18n.locale = newValue;
        },
      },
      render(h) {
        return h(ctrlPanel, { props: { id: this.name } });
      },
    });

    const Patchouli = new Vue({
      i18n,
      store: vuexStore,
      data: {
        name: 'Patchouli',
      },
      computed: {
        currentLocale() {
          return this.$store.getters.locale;
        },
      },
      watch: {
        currentLocale(newValue) {
          this.$i18n.locale = newValue;
        },
      },
      render(h) {
        return h(mainView, { props: { id: this.name } });
      },
    });

    const Marisa = new Vue({
      i18n,
      store: vuexStore,
      data: {
        name: 'Marisa',
      },
      computed: {
        currentLocale() {
          return this.$store.getters.locale;
        },
      },
      watch: {
        currentLocale(newValue) {
          this.$i18n.locale = newValue;
        },
      },
      render(h) {
        return h(coverLayer$1, { props: { id: this.name } });
      },
    });
    /* eslint-enable sort-keys */

    vuexStore.dispatch('pixiv/start', { isFirst: true, times: 1 })
      .then(() => {
        Patchouli.$mount(vuexStore.getters.mountPointMainView);
        Koakuma.$mount(vuexStore.getters.mountPointCtrlPanel);
        Marisa.$mount(vuexStore.getters.mountPointCoverLayer);

        vuexStore.commit('applyConfig');

        // unset koamuma placeholder
        if (vuexStore.getters['pixiv/nppType'] < 0) {
          $('._global-header').classList.remove('koakuma-placeholder');
        }

        // pass current mpt status
        return vuexStore.getters['pixiv/status'];
      })
      .catch(error => {
        $print.error('main#init: Fail to first mount', error);
      });

    // document.addEventListener('scroll', (event) => {
    //   $print.debug('body#scroll event:', event);
    // });

    document.body.addEventListener('click', (event) => {
      $print.debug('body#click event:', event);

      const koakuma = Koakuma.$children[0];
      if (!$parents(event.target).find((el) => el.id === 'koakuma-bookmark-input-usual-switch')) {
        koakuma.usualSwitchOn = false;
      }
      if (!$parents(event.target).find((el) => el.id === 'koakuma-sorting-order-select-switch')) {
        koakuma.sortingOrderSwitchOn = false;
      }

      if (vuexStore.getters['contextMenu/active']) {
        vuexStore.commit('contextMenu/deactivate');
      }
    });

    Object.assign(unsafeWindow, {
      Koakuma,
      Marisa,
      Patchouli,
      vuexStore,
    });
  })
  .catch($print.error);
import '../src/pixiv.override.css';