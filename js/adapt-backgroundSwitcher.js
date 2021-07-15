import Adapt from 'core/js/adapt';
import BackgroundSwitcherPageView from './BackgroundSwitcherPageView';

class BackgroundSwitcher extends Backbone.Controller {

  initialize() {
    this.listenTo(Adapt, 'pageView:postRender', this.onPageViewPostRender);
  }

  onPageViewPostRender({ model }) {
    if (!model.get('_backgroundSwitcher')?._isEnabled) return;
    new BackgroundSwitcherPageView({ model });
  }

}

export default new BackgroundSwitcher();
