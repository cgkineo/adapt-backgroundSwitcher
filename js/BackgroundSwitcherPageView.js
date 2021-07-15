import Adapt from 'core/js/adapt';
import BackgroundSwitcherBlockView from './BackgroundSwitcherBlockView';

export default class BackgroundSwitcherPageView extends Backbone.View {

  className() {
    return 'backgroundswitcher__container';
  }

  initialize() {
    this.disableSmoothScrolling();
    this.addToBody();
    this.listenTo(Adapt, {
      'blockView:postRender': this.onBlockViewPostRender,
      remove: this.onRemove
    });
  }

  addToBody () {
    $('html').addClass('backgroundswitcher-active');
    $('body').prepend(this.$el);
  }

  onBlockViewPostRender(view) {
    if (!view.model.get('_backgroundSwitcher')) return;
    const backgroundSwitcherBlockView = new BackgroundSwitcherBlockView({ model: view.model, blockView: view });
    this.$el.append(backgroundSwitcherBlockView.$el);
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

  onRemove () {
    $('html').removeClass('backgroundswitcher-active');
    this.remove();
  }

}
