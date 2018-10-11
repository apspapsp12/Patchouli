/**
 * The differents between FOLLOWED_NEWS and ANCIENT_FOLLOWED_NEWS:
 * FOLLOWED_NEWS: div._1BUAfFH>(div._25taFA4>figure.mSh0kS-)*N
 * ANCIENT_FOLLOWED_NEWS: ul>(li.image-item>a*3)*N
 */

export const MAIN_PAGE_TYPE = {
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

export const SORT_TYPE = {
  BOOKMARK_COUNT: 2,
  BOOKMARK_ID: 1,
  ILLUST_ID: 0,
};

export const COVER_LAYER_MODE = {
  CONFIG: Symbol('CONFIG'),
  NONE: Symbol('NONE'),
  PREVIEW: Symbol('PREVIEW'),
};

export const NPP_TYPE_COUNT = 5;
