

define([
	'coreJS/adapt'
], function(Adapt) {

	var BackgroundSwitcherView = Backbone.View.extend({

		_blockModels: null,
		_blockModelsIndexed: null,
		_onBlockInview: null,
		$backgroundContainer: null,
		$backgrounds: null,
		$blockElements: null,
		_firstId: null,
		_activeId: null,

		initialize: function() {
			this._blockModels = this.model.findDescendants('blocks').filter(function(model) {
				return model.get("_backgroundSwitcher");
			});
			if(this._blockModels.length == 0) {
			        this.onRemove();
			        return;
			}
			this._blockModelsIndexed = _.indexBy(this._blockModels, "_id");

			this.listenToOnce(Adapt, "pageView:ready", this.onPageReady);
			this.listenToOnce(Adapt, "remove", this.onRemove);
			this.setupBackgroundContainer();
		},

		onPageReady: function() {

			this.$blockElements = {};
			this.$backgrounds = {};
			this.callbacks = {};

			for (var i = 0, l = this._blockModels.length; i < l; i++) {
				var blockModel = this._blockModels[i];				
				if(!blockModel.get('_backgroundSwitcher')) continue;

				var id = blockModel.get("_id");

				if (!this._firstId) this._firstId = id;

				var $blockElement = this.$el.find("."+ id);

				$blockElement.attr("data-backgroundswitcher", id);
				this.$blockElements[id] = $blockElement;
				this.callbacks[id] = _.bind(this.onBlockInview, this);
				this.$blockElements[id].on("onscreen", this.callbacks[id]);

				$blockElement.addClass('background-switcher-block');

				var options = blockModel.get('_backgroundSwitcher');

				var $backGround = $('<div class="background-switcher-background" style="background-image: url('+options.src+');"></div>');
				this.$backgroundContainer.prepend($backGround);
				this.$backgrounds[id] = $backGround;

				$blockElement.find('.block-inner').addClass('background-switcher-block-mobile').css({'background-image': 'url('+options.mobileSrc+')'});

			}

			this._activeId = this._firstId;
			
			this.showBackground();

		},

		setupBackgroundContainer : function() {

			this.$backgroundContainer = $('<div class="background-switcher-container"></div>');
			this.$el.addClass('background-switcher-active');
			this.$el.prepend(this.$backgroundContainer);

		},
		

		onBlockInview: function(event, measurements) {
			var isOnscreen = measurements.percentFromTop < 80 && measurements.percentFromBottom < 80 ;
			if (!isOnscreen) return;

			var $target = $(event.target);
			var id = $target.attr("data-backgroundswitcher");

			if (this._activeId === id) return;

			this._activeId = id;

			this.showBackground();
		},

		showBackground: function() {
			var blockModel = this._blockModelsIndexed[this._activeId];

			if(Modernizr.csstransitions){
				this.$('.background-switcher-background.active').removeClass('active');
				this.$backgrounds[this._activeId].addClass('active');
			}
			else {
				this.$('background-switcher-background.active').animate({opacity:0}, 1000, function(){ $(this).removeClass('active'); });
				this.$backgrounds[this._activeId].animate({opacity:1}, 1000, function(){ $(this).addClass('active'); });
			}
		},

		onRemove: function () {
			for (var id in this.$blockElements) {
				this.$blockElements[id].off("onscreen", this.callbacks[id]);
			}
			this.$blockElements = null;
			this.$backgroundContainer = null;
			this.$backgrounds = null;
			this._blockModels = null;
			this._blockModelsIndexed = null;
			this._onBlockInview = null;
		}


	});

	Adapt.on("pageView:postRender", function(view) {
		var model = view.model;
		if (model.get("_backgroundSwitcher")) {
			if (model.get("_backgroundSwitcher")._isActive) {
				new BackgroundSwitcherView({model: model, el: view.el });
			}
		}
	});

});
