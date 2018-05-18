import Vue from 'vue';
import store from './store/index';
import koakuma from './components/Koakuma.vue';
import patchouli from './components/Patchouli.vue';
import { $, $print, $el } from './lib/utils';
import { removeAnnoyings } from './lib/pixiv';
import i18n from './lib/i18n';

store.commit('prepareMountPoint');
store.commit('loadConfig');
store.commit('applyConfig');

if (store.state.pageType !== 'NO_SUPPORT') {
  removeAnnoyings();

  // <link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.0.13/css/all.css" integrity="sha384-DNOHZ68U8hZfKXOrtjWvjxusGo9WQnrNx2sqG0tfsghAvtVlRW3tvkXWZh58N9jp" crossorigin="anonymous">
  const fontawesome = $el('link', {
    rel: 'stylesheet',
    href: 'https://use.fontawesome.com/releases/v5.0.13/css/all.css',
    integrity: 'sha384-DNOHZ68U8hZfKXOrtjWvjxusGo9WQnrNx2sqG0tfsghAvtVlRW3tvkXWZh58N9jp',
    crossOrigin: 'anonymous' });
  document.head.appendChild(fontawesome);

  /* setup koamuma placeholder */
  $('._global-header').classList.add('koakuma-placeholder');

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
    $('._global-header').classList.remove('koakuma-placeholder');
  }).catch(error => {
    $print.error('Fail to first mount', error);
  });

  document.body.addEventListener('click', (event) => {
    if (event.target.id !== 'koakuma-bookmark-input-usual-switch') {
      Koakuma.$children[0].usualSwitchOn = false;
    }
    if (store.state.contextMenu.active) {
      store.commit('deactivateContextMenu');
    }
  });

  window.Patchouli = Patchouli;
  window.Koakuma = Koakuma;
}



