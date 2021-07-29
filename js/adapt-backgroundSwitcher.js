import Adapt from 'core/js/adapt';
import BackgroundSwitcherPageView from './BackgroundSwitcherPageView';

class BackgroundSwitcher extends Backbone.Controller {

  initialize() {
    this.listenTo(Adapt, 'pageView:postRender', this.onPageViewPostRender);
  }

  onPageViewPostRender({ model }) {
    if (!model.get('_backgroundSwitcher')?._isEnabled) return;
    new BackgroundSwitcherPageView({ model });
    this.disableSmoothScrolling();
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
