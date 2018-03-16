// ==UserScript==
// @name              Patchouli
// @name:ja           パチュリー
// @name:zh-CN        帕秋莉
// @name:zh-TW        帕秋莉
// @namespace         https://github.com/FlandreDaisuki
// @description       An image searching/browsing tool on Pixiv
// @description:ja    Pixiv 検索機能強化
// @description:zh-CN Pixiv 搜寻/浏览 工具
// @description:zh-TW Pixiv 搜尋/瀏覽 工具
// @include           *://www.pixiv.net/*
// @require           https://cdnjs.cloudflare.com/ajax/libs/vue/2.5.13/vue.min.js
// @require           https://cdnjs.cloudflare.com/ajax/libs/vuex/3.0.1/vuex.min.js
// @require           https://cdnjs.cloudflare.com/ajax/libs/vue-i18n/7.4.2/vue-i18n.min.js
// @require           https://cdnjs.cloudflare.com/ajax/libs/axios/0.17.1/axios.min.js
// @icon              http://i.imgur.com/VwoYc5w.png
// @noframes
// @author            FlandreDaisuki
// @license           The MIT License (MIT) Copyright (c) 2016-2018 FlandreDaisuki
// @compatible        firefox >=52
// @compatible        chrome >=55
// @version           4.0.4
// @grant             none
// ==/UserScript==

(function (Vue,Vuex,VueI18n) {
'use strict';

function __$styleInject( css ) {
    if(!css) return ;

    if(typeof(window) == 'undefined') return ;
    let style = document.createElement('style');

    style.innerHTML = css;
    document.head.appendChild(style);
    return css;
}

Vue = Vue && Vue.hasOwnProperty('default') ? Vue['default'] : Vue;
Vuex = Vuex && Vuex.hasOwnProperty('default') ? Vuex['default'] : Vuex;
VueI18n = VueI18n && VueI18n.hasOwnProperty('default') ? VueI18n['default'] : VueI18n;

__$styleInject("#koakuma[data-v-430ffdfb] {\n  display: -webkit-box;\n  display: -ms-flexbox;\n  display: flex;\n  -webkit-box-pack: center;\n  -ms-flex-pack: center;\n  justify-content: center;\n  position: -webkit-sticky;\n  position: sticky;\n  top: 0;\n  z-index: 3;\n  background-color: #e77;\n  -webkit-box-shadow: 0 1px 3px #000;\n  box-shadow: 0 1px 3px #000;\n  padding: 4px;\n  color: #fff;\n  font-size: 16px;\n}\n#koakuma > div[data-v-430ffdfb] {\n  margin: 0 10px;\n}\n.bookmark-count[data-v-430ffdfb] {\n  display: -webkit-inline-box !important;\n  display: -ms-inline-flexbox !important;\n  display: inline-flex !important;\n  -webkit-box-align: center;\n  -ms-flex-align: center;\n  align-items: center;\n}\n#koakuma-bookmark-sort-input[data-v-430ffdfb] {\n  -moz-appearance: textfield;\n  border: none;\n  background-color: transparent;\n  padding: 0;\n  color: inherit;\n  font-size: 16px;\n  display: inline-block;\n  cursor: ns-resize;\n  text-align: center;\n  max-width: 50px;\n}\n#koakuma-bookmark-sort-input[data-v-430ffdfb]::-webkit-inner-spin-button,\n#koakuma-bookmark-sort-input[data-v-430ffdfb]::-webkit-outer-spin-button {\n  /* https://css-tricks.com/numeric-inputs-a-comparison-of-browser-defaults/ */\n  -webkit-appearance: none;\n  margin: 0;\n}\n.tags-filter[data-v-430ffdfb] {\n  min-width: 300px;\n}\n.main-button[data-v-430ffdfb] {\n  border: none;\n  padding: 2px 14px;\n  border-radius: 3px;\n  font-size: 16px;\n}\n.main-button[data-v-430ffdfb]:enabled:hover {\n  -webkit-box-shadow: 1px 1px;\n  box-shadow: 1px 1px;\n}\n.main-button[data-v-430ffdfb]:enabled:active {\n  -webkit-box-shadow: 1px 1px inset;\n  box-shadow: 1px 1px inset;\n}\n#koakuma.go .main-button[data-v-430ffdfb] {\n  background-color: #64ffda;\n}\n#koakuma.paused .main-button[data-v-430ffdfb] {\n  background-color: #ffd600;\n}\n#koakuma.end .main-button[data-v-430ffdfb] {\n  background-color: #455a64;\n  color: #fff;\n  opacity: 0.9;\n}\n#patchouli[data-v-39c8e0ab] {\n  display: -webkit-box;\n  display: -ms-flexbox;\n  display: flex;\n  -ms-flex-flow: wrap;\n  flex-flow: wrap;\n  -ms-flex-pack: distribute;\n  justify-content: space-around;\n}\n.image-item[data-v-f6c8e106] {\n  display: -webkit-box;\n  display: -ms-flexbox;\n  display: flex;\n  -webkit-box-pack: center;\n  -ms-flex-pack: center;\n  justify-content: center;\n  margin: 0 0 30px 0;\n  padding: 10px;\n  height: auto;\n  width: 200px;\n}\n.image-item-inner[data-v-f6c8e106] {\n  display: -webkit-box;\n  display: -ms-flexbox;\n  display: flex;\n  -webkit-box-orient: vertical;\n  -webkit-box-direction: normal;\n  -ms-flex-flow: column;\n  flex-flow: column;\n  max-width: 100%;\n  max-height: 300px;\n}\n.image-item-image[data-v-3c187ee4] {\n  display: -webkit-box;\n  display: -ms-flexbox;\n  display: flex;\n  -webkit-box-align: center;\n  -ms-flex-align: center;\n  align-items: center;\n  -webkit-box-pack: center;\n  -ms-flex-pack: center;\n  justify-content: center;\n  position: relative;\n}\n.image-flexbox[data-v-3c187ee4] {\n  display: -webkit-box;\n  display: -ms-flexbox;\n  display: flex;\n  -webkit-box-orient: vertical;\n  -webkit-box-direction: normal;\n  -ms-flex-flow: column;\n  flex-flow: column;\n  -webkit-box-pack: center;\n  -ms-flex-pack: center;\n  justify-content: center;\n  -webkit-box-align: center;\n  -ms-flex-align: center;\n  align-items: center;\n  z-index: 0;\n  border: 1px solid rgba(0, 0, 0, 0.04);\n  position: relative;\n  height: 200px;\n}\n.top-right-slot[data-v-3c187ee4] {\n  -webkit-box-flex: 0;\n  -ms-flex: none;\n  flex: none;\n  display: -webkit-box;\n  display: -ms-flexbox;\n  display: flex;\n  -webkit-box-align: center;\n  -ms-flex-align: center;\n  align-items: center;\n  z-index: 1;\n  -webkit-box-sizing: border-box;\n  box-sizing: border-box;\n  margin: 0 0 -24px auto;\n  padding: 6px;\n  height: 24px;\n  background: #000;\n  background: rgba(0, 0, 0, 0.4);\n  border-radius: 0 0 0 4px;\n  color: #fff;\n  font-size: 12px;\n  line-height: 1;\n  font-weight: 700;\n}\n.multiple-icon[data-v-3c187ee4] {\n  display: inline-block;\n  margin-right: 4px;\n  width: 10px;\n  height: 10px;\n  background: url(https://source.pixiv.net/www/js/bundle/3b9b0b9e331e13c46aeadaea83132203.svg);\n}\n.ugoira-icon[data-v-3c187ee4] {\n  position: absolute;\n  -webkit-box-flex: 0;\n  -ms-flex: none;\n  flex: none;\n  width: 40px;\n  height: 40px;\n  background: url(https://source.pixiv.net/www/js/bundle/f608d897f389e8161e230b817068526d.svg)\n    50% no-repeat;\n  top: 50%;\n  left: 50%;\n  margin: -20px 0 0 -20px;\n}\nimg[data-v-3c187ee4] {\n  max-height: 100%;\n  max-width: 100%;\n}\n._one-click-bookmark[data-v-3c187ee4] {\n  right: 0;\n  width: 24px;\n  height: 24px;\n  line-height: 24px;\n  z-index: 2;\n  text-align: center;\n  cursor: pointer;\n  background: url(https://source.pixiv.net/www/images/bookmark-heart-off.svg)\n    center transparent;\n  background-repeat: no-repeat;\n  background-size: cover;\n  opacity: 0.8;\n  filter: alpha(opacity=80);\n  -webkit-transition: opacity 0.2s ease-in-out;\n  transition: opacity 0.2s ease-in-out;\n}\n._one-click-bookmark.on[data-v-3c187ee4] {\n  background-image: url(https://source.pixiv.net/www/images/bookmark-heart-on.svg);\n}\n.bookmark-input-container[data-v-3c187ee4] {\n  position: absolute;\n  left: 0;\n  top: 0;\n  background: rgba(0, 0, 0, 0.4);\n  padding: 6px;\n  border-radius: 0 0 4px 0;\n}\n.image-item-title[data-v-d20319ea] {\n  max-width: 100%;\n  margin: 8px auto;\n  text-align: center;\n  color: #333;\n  font-size: 12px;\n  line-height: 1;\n}\n.title-text[data-v-d20319ea] {\n  margin: 4px 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  font-weight: 700;\n}\n.user-info[data-v-d20319ea] {\n  display: -webkit-inline-box;\n  display: -ms-inline-flexbox;\n  display: inline-flex;\n  -webkit-box-align: center;\n  -ms-flex-align: center;\n  align-items: center;\n}\n.user-link[data-v-d20319ea] {\n  font-size: 12px;\n  display: -webkit-inline-box;\n  display: -ms-inline-flexbox;\n  display: inline-flex;\n  -webkit-box-align: center;\n  -ms-flex-align: center;\n  align-items: center;\n}\n.user-img[data-v-d20319ea] {\n  width: 20px;\n  height: 20px;\n  display: inline-block;\n  background-size: cover;\n  border-radius: 50%;\n  margin-right: 4px;\n}\n.follow-icon[data-v-d20319ea] {\n  display: inline-block;\n  margin-left: 4px;\n  width: 14px;\n  height: 14px;\n  background-color: dodgerblue;\n  -webkit-mask-image: url(https://cdnjs.cloudflare.com/ajax/libs/simple-icons/3.0.1/rss.svg);\n  mask-image: url(https://cdnjs.cloudflare.com/ajax/libs/simple-icons/3.0.1/rss.svg);\n}");

__$styleInject(".ω.↔,\n.ω.↔ .layout-a,\n.ω.↔ .layout-body {\n  width: initial !important;\n}\n.ω.↔ .layout-a {\n  display: -webkit-box;\n  display: -ms-flexbox;\n  display: flex;\n  -webkit-box-orient: horizontal;\n  -webkit-box-direction: reverse;\n  -ms-flex-direction: row-reverse;\n  flex-direction: row-reverse;\n}\n.ω.↔ .layout-column-2 {\n  -webkit-box-flex: 1;\n  -ms-flex: 1;\n  flex: 1;\n  margin-left: 20px;\n}\n.ω.↔ .layout-body,\n.ω.↔ .layout-a {\n  margin: 10px 20px;\n}\n");

function $(selector) {
  return document.querySelector(selector);
}
function $$(selector) {
  return [...document.querySelectorAll(selector)];
}
function $$find(doc, selector) {
  return [...doc.querySelectorAll(selector)];
}
function $el(tag, attr = {}, cb = () => {}) {
  const el = document.createElement(tag);
  Object.assign(el, attr);
  cb(el);
  return el;
}
function $error(...args) {
  console.error.apply(console, args);
}
(() => {
  Math.clamp = (val, min, max) => Math.min(Math.max(min, val), max);
  Number.toInt = (s) => (isNaN(~~s) ? 0 : ~~s);
  (function(arr) {
    arr.forEach(function(item) {
      if (item.hasOwnProperty('after')) {
        return;
      }
      Object.defineProperty(item, 'after', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: function after() {
          const argArr = Array.prototype.slice.call(arguments);
          const docFrag = document.createDocumentFragment();
          argArr.forEach(function(argItem) {
            const isNode = argItem instanceof Node;
            docFrag.appendChild(isNode ? argItem : document.createTextNode(String(argItem)));
          });
          this.parentNode.insertBefore(docFrag, this.nextSibling);
        }
      });
    });
  })([Element.prototype, CharacterData.prototype, DocumentType.prototype]);
})();
class Pixiv {
  constructor() {
    this.tt = $('input[name="tt"]').value;
  }
  async fetch(url) {
    try {
      if (url) {
        const res = await axios.get(url);
        if (res.statusText !== 'OK') {
          throw new Error(res.statusText);
        } else {
          return res.data;
        }
      } else {
        $error('Pixiv#fetch has no url');
      }
    } catch (error) {
      $error('Pixiv#fetch: error:', error);
    }
  }
  async getLegacyPageHTMLIllustIds(url, { needBookmarkId } = { needBookmarkId: false }) {
    try {
      const html = await this.fetch(url);
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
        nextUrl,
        illustIds
      };
      if (needBookmarkId) {
        ret.bookmarkIds = {};
        const bimHTMLs = html.match(/name="book_id[^;]+;illust_id=\d+/g) || [];
        for (const bim of bimHTMLs) {
          const [illustId, bookmarkId] = bim.replace(/\D+(\d+)\D+(\d+)/, '$2 $1').split(' ');
          if (illustIds.includes(illustId)) {
            ret.bookmarkIds[illustId] = { illustId, bookmarkId };
          }
        }
      }
      return ret;
    } catch (error) {
      $error('Pixiv#getLegacyPageHTMLIllustIds: error:', error);
    }
  }
  async getPageHTMLIllustIds(url) {
    try {
      const html = await this.fetch(url);
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
      const illustIds = [];
      for (const dataid of iidHTMLs) {
        const iid = dataid.replace(/\D+(\d+).*/, '$1');
        if (!illustIds.includes(iid) && iid !== '0') {
          illustIds.push(iid);
        }
      }
      const ret = {
        nextUrl,
        illustIds
      };
      return ret;
    } catch (error) {
      $error('Pixiv#getPageHTMLIllustIds: error:', error);
    }
  }
  async getBookmarkHTMLDetails(illustIds) {
    const bookmarkHTMLDetails = illustIds.map(id => this.getBookmarkHTMLDetail(id));
    const bookmarkDetails = await Promise.all(bookmarkHTMLDetails);
    const detail = {};
    for (const d of bookmarkDetails) {
      detail[d.illustId] = d;
    }
    return detail;
  }
  async getBookmarkHTMLDetail(illustId) {
    const url = `/bookmark_detail.php?illust_id=${illustId}`;
    try {
      const html = await this.fetch(url);
      const bkMatches = html.match(/<i class="_icon _bookmark-icon-inline"><\/i>(\d+)/);
      const bookmarkCount = bkMatches ? parseInt(bkMatches[1]) : 0;
      const tagsListHTML = html.match(/<ul class="tags[^>]+>.*?(?=<\/ul>)/);
      const tagHTMLs = tagsListHTML ? tagsListHTML[0].match(/>[^<]+?(?=<\/a>)/g) : [];
      const tags = tagHTMLs ? tagHTMLs.map(x => x.slice(1)) : [];
      return {
        bookmarkCount,
        illustId,
        tags
      };
    } catch (error) {
      $error('Pixiv#getBookmarkHTMLDetail: error:', error);
    }
  }
  async getIllustsAPIDetail(illustIds) {
    const iids = illustIds.join(',');
    const url = `/rpc/index.php?mode=get_illust_detail_by_ids&illust_ids=${iids}&tt=${this.tt}`;
    try {
      const json = await this.fetch(url);
      if (json.error) {
        throw new Error(json.message);
      }
      const details = json.body;
      for (const [key, detail] of Object.entries(details)) {
        if (detail.error) {
          delete details[key];
        }
      }
      return details;
    } catch (error) {
      $error('Pixiv#getIllustsAPIDetail: error:', error);
    }
  }
  async getUsersAPIDetail(userIds) {
    const uids = [...new Set(userIds)].join(',');
    const url = `/rpc/get_profile.php?user_ids=${uids}&tt=${this.tt}`;
    try {
      const json = await this.fetch(url);
      if (json.error) {
        throw new Error(json.message);
      }
      const details = {};
      for (const u of json.body) {
        details[u.user_id] = {
          userId: u.user_id,
          isFollow: u.is_follow
        };
      }
      return details;
    } catch (error) {
      $error('Pixiv#getUsersAPIDetail: error:', error);
    }
  }
  async getRecommendationsAPIDetails(illustIds = 'auto', numRecommendations = 500) {
    const searchParams = {
      type: 'illust',
      sample_illusts: illustIds,
      num_recommendations: numRecommendations,
      tt: this.tt
    };
    const url = `/rpc/recommender.php?${searchParams.entries.map(p => p.join('=')).join('&')}`;
    try {
      const data = await this.fetch(url);
      return data.recommendations.map(x => `${x}`);
    } catch (error) {
      $error('Pixiv#getRecommendationsAPIDetails: error:', error);
    }
  }
  async postBookmarkAdd(illustId) {
    const searchParams = {
      mode: 'save_illust_bookmark',
      illust_id: illustId,
      restrict: 0,
      comment: '',
      tags: '',
      tt: this.tt
    };
    const data = searchParams.entries.map(p => p.join('=')).join('&');
    const config = {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    };
    try {
      const res = await axios.post('/rpc/index.php', data, config);
      if (res.statusText === 'OK') {
        return !res.data.error;
      } else {
        throw new Error(res.statusText);
      }
    } catch (error) {
      $error('Pixiv#postBookmarkAdd: error:', error);
    }
  }
}
function removeAnnoyings(doc = document) {
  const annoyings = [
    'iframe',
    '.ad',
    '.ads_area',
    '.ad-footer',
    '.ads_anchor',
    '.ads-top-info',
    '.comic-hot-works',
    '.user-ad-container',
    '.ads_area_no_margin',
    '.hover-item',
    '.ad-printservice',
    '.bookmark-ranges',
    '.require-premium',
    '.showcase-reminder',
    '.sample-user-search',
    '.popular-introduction',
    '._premium-lead-tag-search-bar',
    '._premium-lead-popular-d-body'
  ];
  for (const selector of annoyings) {
    for (const el of $$find(doc, selector)) {
      el.remove();
    }
  }
}
const PixivAPI = new Pixiv();
function makeLibraryData({ pageType, illustAPIDetails, bookmarkHTMLDetails, userAPIDetails }) {
  if (!illustAPIDetails || !Object.keys(illustAPIDetails).length) {
    throw new Error('makeLibraryData: illustAPIDetails is falsy.');
  }
  const vLibrary = [];
  for (const [illustId, illustDetail] of Object.entries(illustAPIDetails)) {
    const d = {
      illustId,
      bookmarkCount: bookmarkHTMLDetails[illustId].bookmarkCount,
      tags: bookmarkHTMLDetails[illustId].tags.join(', '),
      illustTitle: illustDetail.illust_title,
      illustPageCount: Number.toInt(illustDetail.illust_page_count),
      userId: illustDetail.user_id,
      userName: illustDetail.user_name,
      isFollow: userAPIDetails[illustDetail.user_id].isFollow,
      isBookmarked: illustDetail.is_bookmarked,
      isUgoira: !!illustDetail.ugoira_meta,
      profileImg: illustDetail.profile_img,
      url: {
        big: illustDetail.url.big,
        sq240: illustDetail.url['240mw'].replace('240x480', '240x240')
      }
    };
    if (pageType === 'MY_BOOKMARK') {
      d.bookmarkId = illustDetail.bookmarkId;
    }
    vLibrary.push(d);
  }
  return vLibrary;
}
var pixiv = {
  state: {
    imgLibrary: [],
    isPaused: true,
    isEnded: false,
    nextUrl: location.href
  },
  mutations: {
    pause(state) {
      state.isPaused = true;
    },
    stop(state) {
      state.isPaused = true;
      state.isEnded = true;
    },
  },
  actions: {
    async start({ state, dispatch, rootState }, { times } = {}) {
      times = times || Infinity;
      if (state.isEnded || times <= 0) {
        return;
      }
      switch (rootState.pageType) {
      case 'SEARCH':
      case 'NEW_ILLUST':
      case 'MY_BOOKMARK':
      case 'MEMBER_ILLIST':
      case 'MEMBER_BOOKMARK':
      case 'ANCIENT_NEW_ILLUST':
        await dispatch('startNextUrlBased', { times });
        break;
      default:
        break;
      }
    },
    async startNextUrlBased({ state, commit, rootState }, { times } = {}) {
      state.isPaused = false;
      while (!state.isPaused && !state.isEnded && times) {
        let page = null;
        if (['SEARCH', 'NEW_ILLUST'].includes(rootState.pageType)) {
          page = await PixivAPI.getPageHTMLIllustIds(state.nextUrl);
        } else {
          page = await PixivAPI.getLegacyPageHTMLIllustIds(state.nextUrl, {
            needBookmarkId: rootState.pageType === 'MY_BOOKMARK'
          });
        }
        state.nextUrl = page.nextUrl;
        const illustAPIDetails = await PixivAPI.getIllustsAPIDetail(page.illustIds);
        if (rootState.pageType === 'MY_BOOKMARK') {
          const myBookmarkAPIDetails = page.bookmarkIds;
          for (const [illustId, illustDetail] of Object.entries(illustAPIDetails)) {
            const bookmarkId = myBookmarkAPIDetails[illustId].bookmarkId;
            if (bookmarkId) {
              illustDetail.bookmarkId = bookmarkId;
            }
          }
        }
        const bookmarkHTMLDetails = await PixivAPI.getBookmarkHTMLDetails(Object.keys(illustAPIDetails));
        const userIds = Object.values(illustAPIDetails).map(d => d.user_id);
        const userAPIDetails = await PixivAPI.getUsersAPIDetail(userIds);
        const libraryData = makeLibraryData({ pageType: rootState.pageType, illustAPIDetails, bookmarkHTMLDetails, userAPIDetails });
        for (const d of libraryData) {
          if (!state.imgLibrary.find(x => x.illustId === d.illustId)) {
            state.imgLibrary.push(d);
          }
        }
        times -= 1;
        if (!times) {
          commit('pause');
        }
        if (!state.nextUrl) {
          commit('stop');
        }
      }
    }
  },
  getters: {
    filteredLibrary(state, getters, rootState) {
      const cloneLibrary = state.imgLibrary.slice();
      return cloneLibrary
        .filter(el => el.bookmarkCount >= rootState.filters.limit)
        .filter(el => el.tags.match(rootState.filters.tag))
        .sort(
          (a, b) =>
            Number.toInt(b[rootState.filters.orderBy]) -
            Number.toInt(a[rootState.filters.orderBy])
        );
    }
  }
};
Vue.use(Vuex);
const pageType = (() => {
  const path = location.pathname;
  const searchParam = new URLSearchParams(location.search);
  const spId = searchParam.get('id');
  const spType = searchParam.get('type');
  switch (path) {
  case '/search.php':
    return 'SEARCH';
  case '/bookmark_new_illust_r18.php':
  case '/bookmark_new_illust.php':
    return 'NEW_ILLUST';
  case '/new_illust.php':
  case '/mypixiv_new_illust.php':
  case '/new_illust_r18.php':
    return 'ANCIENT_NEW_ILLUST';
  case '/member_illust.php':
    return spId ? 'MEMBER_ILLIST' : 'NO_SUPPORT';
  case '/bookmark.php': {
    if (spId && spType !== 'user') {
      return 'MEMBER_BOOKMARK';
    } else if (!spType || spType === 'illust_all') {
      return 'MY_BOOKMARK';
    } else {
      return 'NO_SUPPORT';
    }
  }
  default:
    return 'NO_SUPPORT';
  }
})();
var store = new Vuex.Store({
  modules: { pixiv },
  state: {
    locale: document.documentElement.lang,
    pageType,
    koakumaMountPoint: null,
    patchouliMountPoint: null,
    VERSION: GM_info.script.version,
    NAME: GM_info.script.name,
    filters: {
      limit: 0,
      tag: new RegExp('', 'i'),
      orderBy: 'illustId'
    },
    config: {
      fitwidth: 1,
      sort: 0
    }
  },
  mutations: {
    prepareMountPoint(state) {
      if (pageType !== 'NO_SUPPORT') {
        $('#wrapper').classList.add('ω');
        state.koakumaMountPoint = $el('div', { className: 'koakumaMountPoint' }, (el) => {
          $('header._global-header').after(el);
        });
        if (pageType === 'SEARCH') {
          state.patchouliMountPoint = $('#js-react-search-mid');
        } else if (pageType === 'NEW_ILLUST') {
          state.patchouliMountPoint = $('#js-mount-point-latest-following');
        } else {
          const li = $('li.image-item');
          const ul = $('ul._image-items');
          state.patchouliMountPoint = li ? li.parentElement : ul;
        }
      }
    },
    applyConfig(state) {
      if (state.pageType !== 'NO_SUPPORT') {
        if (state.config.fitwidth) {
          $('.ω').classList.add('↔');
        } else {
          $('.ω').classList.remove('↔');
        }
        if (state.config.sort) {
          state.filters.orderBy = 'bookmarkCount';
        } else {
          state.filters.orderBy = 'illustId';
        }
        if (state.pageType === 'MY_BOOKMARK') {
          for (const marker of $$('.js-legacy-mark-all, .js-legacy-unmark-all')) {
            marker.addEventListener('click', () => {
              $$('input[name="book_id[]"]').forEach(el => {
                el.checked = marker.classList.contains('js-legacy-mark-all');
              });
            });
          }
        }
      }
    },
    saveConfig(state) {
      const storable = JSON.stringify(state.config);
      localStorage.setItem(state.NAME, storable);
    },
    loadConfig(state) {
      const config = JSON.parse(localStorage.getItem(state.NAME) || '{}');
      Object.assign(state.config, config);
    }
  }
});
var koakuma = {render: function(){var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('div',{class:_vm.statusClass,attrs:{"id":"koakuma"}},[_c('div',{staticClass:"processed"},[_vm._v(_vm._s(_vm.$t('koakuma.processed', { count: _vm.$store.state.pixiv.imgLibrary.length })))]),_vm._v(" "),_c('div',[_c('label',{staticClass:"bookmark-count",attrs:{"for":"koakuma-bookmark-sort-input"}},[_c('i',{staticClass:"_icon _bookmark-icon-inline"}),_vm._v(" "),_c('input',{attrs:{"id":"koakuma-bookmark-sort-input","type":"number","min":"0","step":"1"},domProps:{"value":_vm.filters.limit},on:{"wheel":function($event){$event.stopPropagation();$event.preventDefault();_vm.sortInputWheel($event);},"input":_vm.sortInputInput}})])]),_vm._v(" "),_c('div',[_c('input',{staticClass:"tags-filter",attrs:{"placeholder":_vm.$t('koakuma.tagsPlaceholder'),"type":"text"},on:{"input":_vm.tagsFilterInput}})]),_vm._v(" "),_c('div',[_c('button',{staticClass:"main-button",attrs:{"disabled":_vm.status.isEnded},on:{"click":_vm.clickMainButton}},[_vm._v(" "+_vm._s(_vm.buttonMsg)+" ")])]),_vm._v(" "),_c('div',[_c('input',{attrs:{"id":"koakuma-options-fit-browser-width","type":"checkbox"},domProps:{"checked":_vm.config.fitwidth},on:{"change":_vm.optionsChange}}),_vm._v(" "),_c('label',{attrs:{"for":"koakuma-options-fit-browser-width"}},[_vm._v(_vm._s(_vm.$t('koakuma.fitWidth')))]),_vm._v(" "),_c('input',{attrs:{"id":"koakuma-options-sort-by-bookmark-count","type":"checkbox"},domProps:{"checked":_vm.config.sort},on:{"change":_vm.optionsChange}}),_vm._v(" "),_c('label',{attrs:{"for":"koakuma-options-sort-by-bookmark-count"}},[_vm._v(_vm._s(_vm.$t('koakuma.sortByBookmarkCount')))])])])},staticRenderFns: [],_scopeId: 'data-v-430ffdfb',
  data() {
    return {
      debounceId0: null,
      debounceId1: null
    };
  },
  computed: {
    status() {
      return this.$store.state.pixiv;
    },
    config() {
      return this.$store.state.config;
    },
    statusClass() {
      return {
        end: this.status.isEnded,
        paused: !this.status.isPaused && !this.status.isEnded,
        go: this.status.isPaused && !this.status.isEnded
      };
    },
    filters() {
      return this.$store.state.filters;
    },
    buttonMsg() {
      if (this.status.isEnded) {
        return this.$t("koakuma.buttonEnd");
      } else if (this.status.isPaused) {
        return this.$t("koakuma.buttonGo");
      } else {
        return this.$t("koakuma.buttonPause");
      }
    }
  },
  methods: {
    clickMainButton() {
      if (this.status.isPaused) {
        this.$store.dispatch("start");
      } else {
        this.$store.commit("pause");
      }
    },
    sortInputWheel(event) {
      if (event.deltaY < 0) {
        this.filters.limit = Number.toInt(event.target.value) + 20;
      } else {
        this.filters.limit = Math.max(0, Number.toInt(event.target.value) - 20);
      }
    },
    sortInputInput(event) {
      if (this.debounceId0) {
        clearTimeout(this.debounceId0);
      }
      this.debounceId0 = setTimeout(() => {
        this.debounceId0 = null;
        this.filters.limit = Math.max(0, Number.toInt(event.target.value));
      }, 500);
    },
    optionsChange(event) {
      if (event.target.id === "koakuma-options-fit-browser-width") {
        this.config.fitwidth = event.target.checked;
      } else if (event.target.id === "koakuma-options-sort-by-bookmark-count") {
        this.config.sort = Number.toInt(event.target.checked);
      }
      this.$store.commit("saveConfig");
      this.$store.commit("applyConfig");
    },
    tagsFilterInput(event) {
      if (this.debounceId1) {
        clearTimeout(this.debounceId1);
      }
      this.debounceId1 = setTimeout(() => {
        this.debounceId1 = null;
        this.filters.tag = new RegExp(event.target.value, "ig");
      }, 1500);
    }
  }
};
var DefaultImageItemImage = {render: function(){var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('div',{staticClass:"image-item-image"},[_c('a',{staticClass:"image-flexbox",attrs:{"href":_vm.illustPageUrl,"rel":"noopener"}},[(_vm.illustPageCount > 1)?_c('div',{staticClass:"top-right-slot"},[_c('span',[_c('span',{staticClass:"multiple-icon"}),_vm._v(" "+_vm._s(_vm.illustPageCount))])]):_vm._e(),_vm._v(" "),_c('img',{attrs:{"data-src":_vm.imgUrl,"src":_vm.imgUrl}}),_vm._v(" "),(_vm.isUgoira)?_c('div',{staticClass:"ugoira-icon"}):_vm._e()]),_vm._v(" "),_c('div',{staticClass:"_one-click-bookmark",class:{on:_vm.selfIsBookmarked},attrs:{"data-click-label":_vm.illustId,"data-id":_vm.illustId,"title":_vm.selfIsBookmarked,"data-type":"illust","data-click-action":"illust"},on:{"click":_vm.oneClickBookmarkAdd}}),_vm._v(" "),(_vm.bookmarkId)?_c('div',{staticClass:"bookmark-input-container"},[_c('input',{attrs:{"type":"checkbox","name":"book_id[]"},domProps:{"value":_vm.bookmarkId}})]):_vm._e()])},staticRenderFns: [],_scopeId: 'data-v-3c187ee4',
  props: {
    imgUrl: {
      type: String,
      default: ""
    },
    illustId: {
      type: String,
      default: ""
    },
    illustPageCount: {
      type: Number,
      default: 1
    },
    isUgoira: {
      type: Boolean,
      default: false
    },
    isBookmarked: {
      type: Boolean,
      default: false
    },
    bookmarkId: {
      type: String,
      default: ""
    }
  },
  data() {
    return {
      selfIsBookmarked: this.isBookmarked
    };
  },
  computed: {
    illustPageUrl() {
      return `/member_illust.php?mode=medium&illust_id=${this.illustId}`;
    }
  },
  methods: {
    oneClickBookmarkAdd() {
      if (!this.selfIsBookmarked) {
        this.selfIsBookmarked = true;
      }
    }
  }
};
var DefaultImageItemTitle = {render: function(){var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('figcaption',{staticClass:"image-item-title"},[_c('ul',[_c('li',{staticClass:"title-text"},[_c('a',{attrs:{"href":_vm.illustPageUrl,"title":_vm.illustTitle}},[_vm._v(_vm._s(_vm.illustTitle))])]),_vm._v(" "),(!_vm.isMemberIllistPage)?_c('li',{staticClass:"user-info"},[_c('a',{staticClass:"user-link ui-profile-popup",attrs:{"href":_vm.userPageUrl,"title":_vm.userName,"data-user_id":_vm.userId,"data-user_name":_vm.userName,"target":"_blank"}},[_c('span',{staticClass:"user-img",style:(_vm.profileImgStyle)}),_vm._v(" "),_c('span',[_vm._v(_vm._s(_vm.userName))])]),_vm._v(" "),(_vm.isFollow)?_c('i',{staticClass:"follow-icon"}):_vm._e()]):_vm._e(),_vm._v(" "),(_vm.bookmarkCount > 0)?_c('li',[_c('ul',{staticClass:"count-list"},[_c('li',[_c('a',{staticClass:"_ui-tooltip bookmark-count",attrs:{"href":_vm.bookmarkDetailUrl,"data-tooltip":_vm.$t('patchouli.bookmarkTooltip', { count: _vm.bookmarkCount })}},[_c('i',{staticClass:"_icon _bookmark-icon-inline"}),_vm._v(" "+_vm._s(_vm.bookmarkCount)+" ")])])])]):_vm._e()])])},staticRenderFns: [],_scopeId: 'data-v-d20319ea',
  props: {
    illustId: {
      type: String,
      default: ""
    },
    illustTitle: {
      type: String,
      default: ""
    },
    userName: {
      type: String,
      default: ""
    },
    userId: {
      type: String,
      default: ""
    },
    profileImgUrl: {
      type: String,
      default: ""
    },
    bookmarkCount: {
      type: Number,
      default: 0
    },
    isFollow: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    illustPageUrl() {
      return `/member_illust.php?mode=medium&illust_id=${this.illustId}`;
    },
    userPageUrl() {
      return `/member_illust.php?id=${this.userId}`;
    },
    bookmarkDetailUrl() {
      return `/bookmark_detail.php?illust_id=${this.illustId}`;
    },
    bookmarkTooltipMsg() {
      return this.$t("patchouli.bookmarkTooltip", {
        count: this.bookmarkCount
      });
    },
    profileImgStyle() {
      return {
        backgroundImage: `url(${this.profileImgUrl})`
      };
    },
    isMemberIllistPage() {
      return this.$store.state.pageType === "MEMBER_ILLIST";
    }
  }
};
var DefaultImageItem = {render: function(){var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('div',{staticClass:"image-item"},[_c('figure',{staticClass:"image-item-inner"},[_c('DefaultImageItemImage',{attrs:{"img-url":_vm.imgUrl,"illust-id":_vm.illustId,"illust-page-count":_vm.illustPageCount,"is-ugoira":_vm.isUgoira,"is-bookmarked":_vm.isBookmarked,"bookmark-id":_vm.bookmarkId}}),_vm._v(" "),_c('DefaultImageItemTitle',{attrs:{"illust-id":_vm.illustId,"illust-title":_vm.illustTitle,"user-name":_vm.userName,"user-id":_vm.userId,"is-follow":_vm.isFollow,"profile-img-url":_vm.profileImgUrl,"bookmark-count":_vm.bookmarkCount,"page-type":_vm.pageType}})],1)])},staticRenderFns: [],_scopeId: 'data-v-f6c8e106',
  components: { DefaultImageItemImage, DefaultImageItemTitle },
  props: {
    imgUrl: {
      type: String,
      default: ""
    },
    illustId: {
      type: String,
      default: ""
    },
    illustTitle: {
      type: String,
      default: ""
    },
    illustPageCount: {
      type: Number,
      default: 1
    },
    userName: {
      type: String,
      default: ""
    },
    userId: {
      type: String,
      default: ""
    },
    profileImgUrl: {
      type: String,
      default: ""
    },
    isUgoira: {
      type: Boolean,
      default: false
    },
    isBookmarked: {
      type: Boolean,
      default: false
    },
    isFollow: {
      type: Boolean,
      default: false
    },
    bookmarkId: {
      type: String,
      default: ""
    },
    bookmarkCount: {
      type: Number,
      default: 0
    }
  },
  computed: {
    pageType() {
      return this.$store.state.pageType;
    }
  }
};
var patchouli = {render: function(){var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('div',{attrs:{"id":"patchouli"}},_vm._l((_vm.filteredLibrary),function(d){return _c('DefaultImageItem',{key:d.illustId,attrs:{"img-url":d.url.sq240,"illust-id":d.illustId,"illust-title":d.illustTitle,"illust-page-count":d.illustPageCount,"is-ugoira":d.isUgoira,"user-name":d.userName,"user-id":d.userId,"profile-img-url":d.profileImg,"bookmark-count":d.bookmarkCount,"is-bookmarked":d.isBookmarked,"is-follow":d.isFollow,"bookmark-id":d.bookmarkId}})}))},staticRenderFns: [],_scopeId: 'data-v-39c8e0ab',
  components: { DefaultImageItem },
  computed: {
    filteredLibrary() {
      return this.$store.getters.filteredLibrary;
    }
  }
};
Vue.use(VueI18n);
var i18n = new VueI18n({
  locale: document.documentElement.lang,
  fallbackLocale: 'ja',
  messages: {
    'en': {
      patchouli: {
        bookmarkTooltip: '{count} bookmarks'
      },
      koakuma: {
        processed: '{count} imgs processed',
        tagsPlaceholder: 'tags filter example: flandre|sister',
        buttonGo: 'Go',
        buttonPause: 'Pause',
        buttonEnd: 'End',
        fitWidth: 'fit browser width',
        sortByBookmarkCount: 'sort by bookmark count'
      }
    },
    'ja': {
      patchouli: {
        bookmarkTooltip: '{count} 件のブックマーク'
      },
      koakuma: {
        processed: '{count} 件が処理された',
        tagsPlaceholder: 'タグフィルター 例: フランドール|妹様',
        buttonGo: '捜す',
        buttonPause: '中断',
        buttonEnd: '終了',
        fitWidth: '全幅',
        sortByBookmarkCount: 'ブックマーク数順'
      }
    },
    'zh': {
      patchouli: {
        bookmarkTooltip: '{count} 个收藏'
      },
      koakuma: {
        processed: '已处理 {count} 张',
        tagsPlaceholder: '标签过滤 例: 芙兰朵露|二小姐',
        buttonGo: '找',
        buttonPause: '停',
        buttonEnd: '完',
        fitWidth: '自适应浏览器宽度',
        sortByBookmarkCount: '书签数排序'
      }
    },
    'zh-tw': {
      patchouli: {
        bookmarkTooltip: '{count} 個收藏'
      },
      koakuma: {
        processed: '已處理 {count} 張',
        tagsPlaceholder: '標籤過濾 例: 芙蘭朵露|二小姐',
        buttonGo: '找',
        buttonPause: '停',
        buttonEnd: '完',
        fitWidth: '自適應瀏覽器寬度',
        sortByBookmarkCount: '書籤數排序'
      }
    }
  }
});
store.commit('prepareMountPoint');
store.commit('loadConfig');
store.commit('applyConfig');
if (store.state.pageType !== 'NO_SUPPORT') {
  removeAnnoyings();
  const Patchouli = new Vue({
    i18n,
    store,
    computed: {
      currentLocale() {
        return this.$store.state.locale;
      }
    },
    watch: {
      currentLocale(newValue) {
        this.$i18n.locale = newValue;
      }
    },
    render: h => h(patchouli)
  });
  const Koakuma = new Vue({
    i18n,
    store,
    computed: {
      currentLocale() {
        return this.$store.state.locale;
      }
    },
    watch: {
      currentLocale(newValue) {
        this.$i18n.locale = newValue;
      }
    },
    render: h => h(koakuma)
  });
  store.dispatch('start', { times: 1 }).then(() => {
    Patchouli.$mount(store.state.patchouliMountPoint);
    Koakuma.$mount(store.state.koakumaMountPoint);
  }).catch(error => {
    $error('Fail to first mount', error);
  });
  window.Patchouli = Patchouli;
  window.Koakuma = Koakuma;
}

}(Vue,Vuex,VueI18n));
