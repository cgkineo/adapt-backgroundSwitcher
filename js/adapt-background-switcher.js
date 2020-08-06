define([
  'core/js/adapt'
], function(Adapt) {

  class BackgroundSwitcherPageView extends Backbone.View {

    initialize() {
      _.bindAll(this, 'onBlockInview', 'calculateBackground');
      this.calculateBackground = _.throttle(this.calculateBackground, 50);
      this.setupEventListeners();
      this.setupBackgroundContainer();
    }

    setupEventListeners() {
      this.listenTo(Adapt, {
        'pageView:ready': this.onPageReady,
        remove: this.onRemove
      });
    }

    setupBackgroundContainer() {
      this.$container = $('<div class="background-switcher__container"></div>');
      $('body')
        .addClass('background-switcher-active')
        .prepend(this.$container);
    }

    onPageReady() {
      let firstItem;
      this._items = {};
      this.model.findDescendantModels('blocks').forEach(blockModel => {
        const config = blockModel.get('_backgroundSwitcher');
        if (!config) return;
        const id = blockModel.get('_id');
        const $block = this.$el.find(`.${id}`);
        const $background = $(`<div class="background-switcher__item" style="background-image: url(${config.src});"></div>`);
        $block
          .attr('data-backgroundswitcher', id)
          .addClass('has-background-switcher-image')
          .on('onscreen.background-switcher', this.onBlockInview);
        // $block.find('.block__inner').addClass('background-switcher-block-mobile').css({'background-image': `url(${config.mobileSrc})`});
        this.$container.prepend($background);
        this._items[id] = {
          id,
          $block,
          $background,
          measurements: null,
        };
        if (firstItem) return;
        firstItem = this._items[id];
      });
      this.showBackground(firstItem);
    }

    onBlockInview(event, measurements) {
      const id = $(event.target).data('backgroundswitcher');
      this._items[id].measurements = measurements;
      this.calculateBackground();
    }

    calculateBackground() {
      const activeItem = Object.values(this._items).reduce((highest, item) => {
        const isValid = (item.measurements && item.measurements.onscreen && item.measurements.percentFromTop < 80);
        if (isValid) return item;
        return highest;
      }, null);
      this.showBackground(activeItem);
    }

    showBackground(activeItem) {
      if (!activeItem) return;
      const hasChanged = (!this.activeItem || this.activeItem.id !== activeItem.id);
      if (!hasChanged) return;
      this.activeItem = activeItem;
      $('.background-switcher__item.is-active').removeClass('is-active');
      this.activeItem.$background.addClass('is-active');
    }

    onRemove() {
      Object.values(this._items).forEach(item => {
        item.$block.off('onscreen.background-switcher');
      });
      this._items = null;
      this.remove();
    }

    remove() {
      Adapt.wait.for(done => {
        _.defer(() => {
          $('.background-switcher__container').remove();
          this.stopListening();
          done();
        });
      });
    }

  }

  Adapt.on('pageView:postRender', view => {
    const model = view.model;
    const config = model.get('_backgroundSwitcher');
    if (!config || !config._isEnabled) return;
    new BackgroundSwitcherPageView({
      model,
      el: view.el
    });
  });

  /**
   * Turn off smooth scrolling in IE and Edge to stop the background from flickering on scroll
   */
  if (navigator.userAgent.match(/MSIE 10/i) || navigator.userAgent.match(/Trident\/7\./) || navigator.userAgent.match(/Edge/)) {
    document.body.addEventListener("mousewheel", event => {
      event.preventDefault();
      const wd = event.wheelDelta;
      const csp = window.pageYOffset;
      window.scrollTo(0, csp - wd);
    });
  }

});
