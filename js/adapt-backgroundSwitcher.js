import Adapt from 'core/js/adapt';
import BackgroundSwitcherView from './BackgroundSwitcherPageView';

class BackgroundSwitcher extends Backbone.Controller {

  initialize() {
    this.listenTo(Adapt, 'pageView:postRender', this.onPageViewPostRender);
  }

  onPageViewPostRender({ model }) {
    if (!model.get('_backgroundSwitcher')?._isEnabled) return;
    new BackgroundSwitcherView({ model });
  }

}

export default new BackgroundSwitcher();
