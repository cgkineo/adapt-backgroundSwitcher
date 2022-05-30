import Adapt from 'core/js/adapt';
import data from 'core/js/data';
import _ from 'underscore';
import BackgroundSwitcherPageView from './BackgroundSwitcherPageView';
import BackgroundSwitcherBlockView from './BackgroundSwitcherBlockView';

class BackgroundSwitcher extends Backbone.Controller {

  initialize() {
    this.onBadMediaEvent = this.onBadMediaEvent.bind(this);
    this.listenTo(Adapt, {
      'app:dataReady': this.onDataReady,
      'pageView:postRender': this.onPageViewPostRender,
      'visua11y:changed': this.onVisua11yChanged
    });
    this._videoTags = null;
    this._availableVideoTags = null;
    this._isMuted = false;
    this._lowBandwidth = false;
  }

  get config() {
    return Adapt.course.get('_backgroundSwitcher');
  }

  onDataReady() {
    this.isMuted = this.config?._isMuted ?? false;
    const hasBackgroundSwitcher = data.some(model => model.get('_backgroundSwitcher')?._isEnabled === true);
    if (!hasBackgroundSwitcher) return;
    this.disableSmoothScrolling();
    this.createVideoTags();
    this.preloadImages();
  }

  onPageViewPostRender({ model }) {
    if (!model.get('_backgroundSwitcher')?._isEnabled) return;
    new BackgroundSwitcherPageView({ model });
    this.setUpClickJack();
  }

  onVisua11yChanged() {
    this.applyMute();
    this.applyNoAnimation();
  }

  get isMuted() {
    return this._isMuted;
  }

  set isMuted(value) {
    this._isMuted = value;
    this.applyMute();
  }

  applyMute() {
    this._videoTags?.forEach(tag => (tag.muted = Adapt?.visua11y?.noBackgroundImages || this._isMuted));
  }

  applyNoAnimation() {
    const background = BackgroundSwitcherBlockView.getCurrent();
    const view = background?.view;
    if (!background?.isActive || !view) return;
    (Adapt?.visua11y?.noAnimations) ? view.pause() : view.play();
  }

  get lowBandwidth() {
    return this._lowBandwidth;
  }

  set lowBandwidth(value) {
    this._lowBandwidth = value;
    this._videoTags.forEach(v => v.pause());
    Adapt.trigger('backgroundSwitcher:lowBandwidth', this._lowBandwidth);
  }

  get maxVideos() {
    const contentObjects = Adapt.course.findDescendantModels('contentobject');
    const maxVideos = contentObjects.reduce((memo, contentobject) => {
      const videoBlocks = contentobject.findDescendantModels('block').filter((block) => {
        const config = block.get('_backgroundSwitcher');
        return config?._isEnabled !== false && config?._src?.includes('.mp4');
      });
      return videoBlocks.length > memo ? videoBlocks.length : memo;
    }, 1);
    return maxVideos;
  }

  get images() {
    const contentObjects = Adapt.course.findDescendantModels('contentobject');
    const images = contentObjects.reduce((images, contentobject) => {
      contentobject.findDescendantModels('block').forEach((block) => {
        const config = block.get('_backgroundSwitcher');
        if (config?._isEnabled === false) return;
        if (config?._src && !config?._src?.includes('.mp4')) images.push(config._src);
        if (config?._poster) images.push(config._poster);
      });
      return images;
    }, []);
    return images;
  }

  preloadImages() {
    const $cache = $('<div>');
    $cache[0].style = 'position:absolute;z-index:-1000;opacity:0;';
    document.body.appendChild($cache[0]);
    let loaded = 0;
    const onloaded = event => {
      const image = event.currentTarget;
      image.removeEventListener('load', onloaded);
      image.removeEventListener('error', onloaded);
      $(image).remove();
      loaded++;
      if (loaded === this.images.length) $cache.remove();
    };
    this.images.forEach(src => {
      const image = new Image();
      image.className = 'backgroundswitcher-image-preload';
      image.src = src;
      image.addEventListener('load', onloaded);
      image.addEventListener('error', onloaded);
      $cache.append(image);
    });
  }

  createVideoTags() {
    const maxVideos = this.maxVideos;
    this._videoTags = new Array(maxVideos);
    this._availableVideoTags = new Array(maxVideos);
    for (let i = 0, l = this._availableVideoTags.length; i < l; i++) {
      const videoTag = this._videoTags[i] = this._availableVideoTags[i] = document.createElement('video');
      videoTag.muted = true;
      videoTag.isSeated = true;
      videoTag.playsInline = true;
      videoTag.preload = this.config?._preload || 'none';
      videoTag.src = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAOBbW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAA+gAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAqt0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAA+gAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAABAAAAAKAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAPoAAAEAAABAAAAAAIjbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAoAAAAKABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAABzm1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAY5zdGJsAAAAlnN0c2QAAAAAAAAAAQAAAIZhdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAABAACgBIAAAASAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGP//AAAAMGF2Y0MBZAAp/+EAF2dkACms2V/khAAAAwAEAAADAKA8YMZYAQAGaOviSyLAAAAAGHN0dHMAAAAAAAAAAQAAABQAAAIAAAAAFHN0c3MAAAAAAAAAAQAAAAEAAAAwY3R0cwAAAAAAAAAEAAAAAQAABAAAAAABAAAGAAAAAAEAAAIAAAAAEQAABAAAAAAcc3RzYwAAAAAAAAABAAAAAQAAABQAAAABAAAAZHN0c3oAAAAAAAAAAAAAABQAAAMwAAAAEwAAAAwAAAAUAAAAEAAAAB8AAAAZAAAAFQAAABgAAAASAAAAEAAAABUAAAAXAAAAIwAAABAAAAAZAAAAEQAAABEAAAAXAAAAEQAAABRzdGNvAAAAAAAAAAEAAAOxAAAAYnVkdGEAAABabWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAbWRpcmFwcGwAAAAAAAAAAAAAAAAtaWxzdAAAACWpdG9vAAAAHWRhdGEAAAABAAAAAExhdmY1Ny4yOC4xMDAAAAAIZnJlZQAABMRtZGF0AAAC8QYF///t3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE0OCByMjY2NSBhMDFlMzM5IC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxNiAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDExMyBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTEgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTIga2V5aW50PTI1MCBrZXlpbnRfbWluPTIwIHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yOC4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCB2YnZfbWF4cmF0ZT0xMDAgdmJ2X2J1ZnNpemU9MTgzNSBjcmZfbWF4PTAuMCBuYWxfaHJkPW5vbmUgZmlsbGVyPTAgaXBfcmF0aW89MS40MCBhcT0xOjEuMDAAgAAAADdliIQAn8ket4Sv4N/8MvAHtq99THPJIafABVFPijchtanS8Mw6aa0tWGyt/2cQYkG1yh0Uj0+/AAAAD0GaImxJ/909iP1N1leiXwAAAAgBnkF5CH/vgQAAABBBmkM8IZMphJ/VF9nKPyiyAAAADEGaZEnhDyZTAk++gQAAABtBmoVJ4Q8mUwJP5J9yLeMJPZB+V34vLL4d2fEAAAAVQZqmSeEPJlMCT8K8tO8CvFNF4F9nAAAAEUGax0nhDyZTAk/VDHx1074RAAAAFEGa6EnhDyZTAk/ClXs0E/5AgBfAAAAADkGbCUnhDyZTAk/42A2AAAAADEGbKknhDyZTAk++gQAAABFBm0tJ4Q8mUwJv+SqXB6XowQAAABNBm2xJ4Q8mUwJv5aYpSZp9CTfMAAAAH0GbjUnhDyZTAm/Jfl28zEqav462f5Nm+T9YdKxlvIEAAAAMQZuuSeEPJlMCb8GBAAAAFUGbz0nhDyZTAm/mCtLPn5SN5p/XQQAAAA1Bm/BJ4Q8mUwIj/8eAAAAADUGaEUnhDyZTAiv/yoAAAAATQZoySeEPJlMCK//4hEA8Lzz1twAAAA1BmlNJ4Q8mUwI7/9GA';
      videoTag.addEventListener('error', this.onBadMediaEvent);
      videoTag.addEventListener('stalled', this.onBadMediaEvent);
    }
  }

  onBadMediaEvent(event) {
    /** @type {HTMLMediaElement} */
    const videoTag = event.currentTarget;
    if (videoTag.isSeated || (videoTag.paused && event.type !== 'error')) return;
    this.lowBandwidth = true;
  }

  firstClick(event) {
    for (let i = 0, l = this._availableVideoTags.length; i < l; i++) {
      this._availableVideoTags[i].play();
    }
    _.delay(this.pauseAll, 100);
  }

  pauseAll() {
    for (let i = 0, l = this._availableVideoTags.length; i < l; i++) {
      this._availableVideoTags[i].pause();
    }
  }

  setUpClickJack() {
    _.bindAll(this, 'firstClick', 'pauseAll');

    $('body').one({
      click: this.firstClick,
      touchend: this.firstClick
    });
  }

  getVideoTag() {
    const videoTag = this._availableVideoTags.pop();
    videoTag.isSeated = false;
    return videoTag;
  }

  releaseVideoTag(videoTag) {
    this._availableVideoTags.push(videoTag);
    videoTag.pause();
    videoTag.isSeated = true;
  }

  /**
   * Turn off smooth scrolling in IE and Edge to stop the background from flickering on scroll
   */
  disableSmoothScrolling() {
    const userAgent = navigator.userAgent;
    const shouldDisableSmoothScrolling = (userAgent.match(/MSIE 10/i) || userAgent.match(/Trident\/7\./) || userAgent.match(/Edge/));
    if (!shouldDisableSmoothScrolling) return;
    $('body').on('mousewheel', function (event) {
      event.preventDefault();
      const wd = event.originalEvent.wheelDelta;
      const csp = window.pageYOffset;
      window.scrollTo(0, csp - wd);
    });
  }

}

export default (Adapt.backgroundSwitcher = new BackgroundSwitcher());
