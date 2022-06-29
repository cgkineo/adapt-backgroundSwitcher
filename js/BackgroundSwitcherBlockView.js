import Adapt from 'core/js/adapt';

export default class BackgroundSwitcherBlockView extends Backbone.View {

  className() {
    return 'backgroundswitcher__item';
  }

  attributes() {
    return {
      'data-id': this.model.get('_id')
    };
  }

  get isVideo() {
    return /\.mp4/gi.test(String(this._src));
  }

  get video() {
    return this.$('video')[0];
  }

  get _src() {
    // Note: Can add mobile image switching here if needed
    const options = this.model.get('_backgroundSwitcher');
    return options._src;
  }

  get _poster() {
    // Note: Can add mobile image switching here if needed
    const options = this.model.get('_backgroundSwitcher');
    return options._poster;
  }

  togglePoster(showPoster) {
    this.$el.toggleClass('backgroundswitcher-hide-poster', !showPoster);
  }

  get _classes() {
    const options = this.model.get('_backgroundSwitcher');
    return options._classes;
  }

  play() {
    if (!this.isVideo) return;
    if (Adapt.backgroundSwitcher.lowBandwidth) return;
    if (Adapt?.visua11y?.noAnimations) return;
    this.video.play();
  }

  pause() {
    if (!this.isVideo) return;
    this.video.pause();
  }
  
  rewind() {
    if (!this.isVideo) return;
    this.video.currentTime = 0;
  }

  initialize({ blockView }) {
    this.onTimeUpdate = this.onTimeUpdate.bind(this);
    this.onBlockInView = this.onBlockInView.bind(this);
    if (this.isVideo) this.renderVideo();
    if (!this.isVideo) this.renderImage();
    this.listenTo(Adapt, 'remove', this.onRemove);
    this.blockView = blockView;
    // Take the first measurement on postRender
    this.onBlockInView();
    this.blockView.$el
      .addClass('has-background-switcher-image')
      .on('onscreen.backgroundswitcher', this.onBlockInView);
  }

  renderVideo() {
    // this.$el.html(Handlebars.templates.backgroundSwitcherVideo(this.model.toJSON()));
    const videoTag = Adapt.backgroundSwitcher.getVideoTag();
    videoTag.loop = true;
    videoTag.playsinline = true;
    videoTag.preload = Adapt.backgroundSwitcher.config?._preload || 'none';
    videoTag.attributes['aria-hidden'] = true;
    videoTag.src = this._src;
    videoTag.muted = Adapt.backgroundSwitcher.isMuted;
    videoTag.load();
    this.el.appendChild(videoTag);
    videoTag.addEventListener('timeupdate', this.onTimeUpdate);
    if (!this._poster) return;
    const posterTag = document.createElement('img');
    posterTag.className = 'poster';
    posterTag.attributes['aria-hidden'] = true;
    posterTag.src = this._poster;
    this.el.appendChild(posterTag);
  }

  renderImage() {
    const imgTag = document.createElement('img');
    imgTag.className = 'poster';
    imgTag.attributes['aria-hidden'] = true;
    imgTag.src = this._src;
    this.el.appendChild(imgTag);
  }

  onTimeUpdate(event) {
    /** @type {HTMLMediaElement} */
    const videoTag = event.currentTarget;
    if (videoTag.paused) return;
    videoTag.removeEventListener('timeupdate', this.onTimeUpdate);
    this.togglePoster(false);
  }

  onBlockInView() {
    BackgroundSwitcherBlockView.addRecord(this);
    const direction = BackgroundSwitcherBlockView.activeDirection(this);
    if (!direction) return;
    this.showBackground(direction);
  }

  activate() {
    this.$el.addClass('is-active');
    this.addClasses();
    this.play();
  }

  deactivate() {
    this.$el
      .addClass('is-deactive')
      .removeClass('is-active');
  }

  forceDeactivate() {
    this.$el
      .removeClass('is-deactive')
      .addClass('is-deactive-force'); // Make sure IE11 ignores opacity animation
  }

  removeForceDeactivate() {
    this.pause();
    this.rewind();
    // Make sure IE11 ignores opacity animation
    this.$el.removeClass('is-deactive-force');
  }

  showBackground(direction) {
    this.updateAttributes();
    const currentActiveView = BackgroundSwitcherBlockView.findRecord(record => record.view.$el.hasClass('is-active'))?.view;
    const currentDeactiveView = BackgroundSwitcherBlockView.findRecord(record => record.view.$el.hasClass('is-deactive'))?.view;
    currentDeactiveView?.forceDeactivate();
    currentActiveView?.deactivate();
    this.removeClasses();
    requestAnimationFrame(() => {
      BackgroundSwitcherBlockView.setDirection(direction);
      currentDeactiveView?.removeForceDeactivate();
      this.activate();
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

  onRemove() {
    const videoTag = this.$('video')[0];
    if (videoTag) {
      videoTag.removeEventListener('timeupdate', this.onTimeUpdate);
      Adapt.backgroundSwitcher.releaseVideoTag(videoTag);
    }
    BackgroundSwitcherBlockView.clearRecords();
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

  static findRecord(predicate) {
    return this.records.find(predicate);
  }

  static setDirection(direction) {
    // Set animation direction
    $('.backgroundswitcher__container')
      .toggleClass('forward', direction === 'forward')
      .toggleClass('backward', direction === 'backward');
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
    // previous.view.pause();
    return (previous.measurement.top < current.measurement.top) || (previous.measurement.top === current.measurement.top && previous.measurement.left < current.measurement.left)
      ? 'forward'
      : 'backward';
  }

  static getPrevious() {
    return this.records.find(({ isActive }) => isActive);
  }

  static getCurrent() {
    // Make sure to fetch the background for the last available block only
    if (!this.records) return;
    const threshold = Adapt.backgroundSwitcher.config?._inviewThreshold ?? 80;
    const onScreens = this.records.filter(({ measurement: { percentFromTop, percentFromBottom, percentFromRight, percentFromLeft, onscreen } }) => onscreen && percentFromTop < threshold && percentFromBottom < threshold && percentFromRight < threshold && percentFromLeft < threshold);
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
