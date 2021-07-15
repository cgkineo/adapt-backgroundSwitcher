import Adapt from 'core/js/adapt';

export default class BackgroundSwitcherBlockView extends Backbone.View {

  className() {
    return 'backgroundswitcher__item';
  }

  attributes() {
    return {
      'data-id': this.model.get('_id'),
      style: this._src ? `background-image: url(${this._src});` : null
    };
  }

  get _src() {
    // Note: Can add mobile image switching here if needed
    const options = this.model.get('_backgroundSwitcher');
    return options._src;
  }

  get _classes() {
    const options = this.model.get('_backgroundSwitcher');
    return options._classes;
  }

  initialize({ blockView }) {
    this.onBlockInView = this.onBlockInView.bind(this);
    this.listenTo(Adapt, 'remove', this.onRemove);
    this.blockView = blockView;
    // Take the first measurment on postRender
    this.onBlockInView();
    this.blockView.$el
      .addClass('has-background-switcher-image')
      .on('onscreen.background-switcher', this.onBlockInView);
  }

  onBlockInView() {
    BackgroundSwitcherBlockView.addRecord(this);
    const direction = BackgroundSwitcherBlockView.activeDirection(this);
    if (!direction) return;
    this.showBackground(direction);
  }

  showBackground(direction) {
    this.updateAttributes();
    const $currentActive = $('.backgroundswitcher__item.is-active');
    const $currentDeactive = $('.backgroundswitcher__item.is-deactive');
    $currentDeactive
      .removeClass('is-deactive')
      .addClass('is-deactive-force'); // Make sure IE11 ignores opacity animation
    $currentActive.addClass('is-deactive');
    $currentActive.removeClass('is-active');
    this.removeClasses();
    requestAnimationFrame(() => {
      // Make sure IE11 ignores opacity animation
      $('.backgroundswitcher__item.is-deactive-force').removeClass('is-deactive-force');
      // Set animation direction
      $('.backgroundswitcher__container')
        .toggleClass('forward', direction === 'forward')
        .toggleClass('backward', direction === 'backward');
      this.$el.addClass('is-active');
      this.addClasses();
    });
  }

  updateAttributes() {
    // Ready for mobile switching if needed
    Object.entries(this.attributes()).forEach(([name, value]) => {
      if (this.$el.attr(name) === value) return;
      this.$el.attr(name, value);
    });
  }

  addClasses() {
    this.$el.addClass(this._classes);
  }

  removeClasses() {
    this.$el.removeClass(this._classes);
  }

  onRemove () {
    BackgroundSwitcherBlockView.clearMeasurements();
    $('body').removeClass('backgroundswitcher-active');
    this.blockView.$el.off('onscreen.backgroundswitcher');
    this.remove();
  }

  /**
   * Keep a list of all the block's measurements so as to find the last active
   * @param {BackgroundSwitcherBlockView} view
   */
  static addRecord(view) {
    this.records = this.records || [];
    this.records.forEach(record => (record.measurement = $(record.view.blockView.$el).onscreen()));
    this.records.sort((a, b) => a.measurement.top - b.measurement.top);
    const record = this.records.find(({ view: recordView }) => recordView === view);
    if (record) return;
    this.records.push({
      view,
      measurement: $(view.blockView.$el).onscreen()
    });
  }

  /**
   * Returns 'forward', 'backword' or null to demonstrate active direction
   * @param {BackgroundSwitcherBlockView} view
   * @returns {string|null}
   */
  static activeDirection(view) {
    const current = this.getCurrent();
    if (current?.view !== view) return null;
    const previous = this.getPrevious();
    if (previous === current) return;
    current.isActive = true;
    if (!previous) return 'forward';
    previous.isActive = false;
    return (previous.measurement.top < current.measurement.top)
      ? 'forward'
      : 'backward';
  }

  static getPrevious() {
    return this.records.find(({ isActive }) => isActive);
  }

  static getCurrent() {
    // Make sure to fetch the background for the last available block only
    const onScreens = this.records.filter(({ measurement: { percentFromTop, percentFromBottom } }) => percentFromTop < 80 && percentFromBottom < 80);
    // Fetch the last onscreen
    const record = onScreens.pop();
    if (record) return record;
    // Find the lowest possible percent from bottom, the last background
    const lowestPostivePercentFromBottom = this.records.reduce((lowestPostivePercentFromBottom, record) => {
      if (record.measurement.percentFromBottom < 0) return lowestPostivePercentFromBottom;
      if (!lowestPostivePercentFromBottom) return record;
      return (lowestPostivePercentFromBottom.measurement.percentFromBottom < record.measurement.percentFromBottom)
        ? lowestPostivePercentFromBottom
        : record;
    }, null);
    return lowestPostivePercentFromBottom;
  }

  /**
   * Clears records ready for another page
   */
  static clearRecords() {
    this.records.length = 0;
  }

}
