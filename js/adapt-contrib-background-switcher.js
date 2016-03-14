

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
		windowHeight: null,

		initialize: function() {
			this._blockModels = this.model.findDescendants('blocks').filter(function(model) {
				return model.get("_backgroundSwitcher");
			});
			if(this._blockModels.length == 0) {
			        this.onRemove();
			        return;
			}
			this._blockModelsIndexed = _.indexBy(this._blockModels, "_id");

			this.listenTo(Adapt, "pageView:ready", this.onPageReady);
			this.listenTo(Adapt, "remove", this.onRemove);

			this._onScroll = _.debounce(_.bind(this.onScroll, this), 1);
			this._onResize = _.debounce(_.bind(this.onResize, this), 1);

			$(window).on("scroll", this._onScroll);
			$(window).on("resize", this._onResize);

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

				$blockElement.addClass('background-switcher-block');

				var options = blockModel.get('_backgroundSwitcher');

				var $backGround = $('<div class="background-switcher-background" style="background-image: url('+options.src+');"></div>');
				this.$backgroundContainer.prepend($backGround);
				this.$backgrounds[id] = $backGround;

				$blockElement.find('.block-inner').addClass('background-switcher-block-mobile').css({'background-image': 'url('+options.mobileSrc+')'});

			}

			this._activeId = this._firstId;
			
			this.$backgroundContainer.imageready(_.bind(function() {
				this.$backgroundContainer.css("opacity", 1);
				this.showBackground();	
			}, this));

		},

		setupBackgroundContainer : function() {

			this.$backgroundContainer = $('<div class="background-switcher-container"></div>');
			this.$el.addClass('background-switcher-active');
			this.$el.prepend(this.$backgroundContainer);
			this.windowHeight = $(window).height();
			this.$backgroundContainer.height(this.windowHeight);

		},

		onResize: function() {
			//only change the height of the background container if it changes by more than 50px
			//the ipad navigation bar causes the window height to change and makes the picture jump otherwise
			var windowHeight = $(window).height();
			var absoluteDifference = Math.abs(this.windowHeight - windowHeight);
			if (absoluteDifference > 50) {
				this.windowHeight = $(window).height();
				this.$backgroundContainer.height(this.windowHeight);
			}
		},

		onScroll: function() {
			for (var i = 0, l = this._blockModels.length; i < l; i++) {

				var blockModel = this._blockModels[i];	
				if(!blockModel.get('_backgroundSwitcher')) continue;

				var id = blockModel.get("_id");

				var measurements = this.$blockElements[id].onscreen();

				var isOnscreen = measurements.percentFromTop < 80 && measurements.percentFromBottom < 80 ;
				if (!isOnscreen) continue;

				if (this._activeId === id) return;

				this._activeId = id;

				return this.showBackground();

			}
		},

		showBackground: function() {
			var blockModel = this._blockModelsIndexed[this._activeId];

			if(Modernizr.csstransitions){
				this.$('.background-switcher-background.active').removeClass('active');
				this.$backgrounds[this._activeId].addClass('active');
			}
			else {
				this.$('.background-switcher-background.active').velocity({opacity:0}, 1000, function(){ $(this).removeClass('active'); });
				this.$backgrounds[this._activeId].velocity({opacity:1}, 1000, function(){ $(this).addClass('active'); });
			}
		},

		onRemove: function () {
			this.stopListening(Adapt, "pageView:ready", this.onPageReady);
			$(window).off("scroll", this._onScroll);
			this.$blockElements = null;
			this.$backgroundContainer = null;
			this.$backgrounds = null;
			this._blockModels = null;
			this._blockModelsIndexed = null;
			this._onBlockInview = null;
			this.remove();
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
