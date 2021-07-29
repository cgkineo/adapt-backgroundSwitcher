import Adapt from 'core/js/adapt';
import BackgroundSwitcherBlockView from './BackgroundSwitcherBlockView';

export default class BackgroundSwitcherPageView extends Backbone.View {

  className() {
    return 'backgroundswitcher__container';
  }

  initialize() {
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

  onRemove () {
    $('html').removeClass('backgroundswitcher-active');
    this.remove();
  }

}
