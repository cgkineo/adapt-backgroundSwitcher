import Adapt from 'core/js/adapt';
import data from 'core/js/data';
import BackgroundSwitcherPageView from './BackgroundSwitcherPageView';

class BackgroundSwitcher extends Backbone.Controller {

  initialize() {
    this.listenTo(Adapt, {
      'app:dataReady': this.onDataReady,
      'pageView:postRender': this.onPageViewPostRender
    });
  }

  onDataReady() {
    const hasBackgroundSwitcher = data.some(model => model.get('_backgroundSwitcher')?._isEnabled === true);
    if (!hasBackgroundSwitcher) return;
    this.disableSmoothScrolling();
  }

  onPageViewPostRender({ model }) {
    if (!model.get('_backgroundSwitcher')?._isEnabled) return;
    new BackgroundSwitcherPageView({ model });
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

export default new BackgroundSwitcher();
