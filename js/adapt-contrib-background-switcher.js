

define(function(require) {

    var Adapt = require('coreJS/adapt');  
    var Backbone = require('backbone');

    var BackgroundSwitcherView = Backbone.View.extend({
        
        /**
         * Array that stores block data for background-switching block  
         *
         * @property blockDataSet
         * @type Object 
         * [$background - the dom element holding this blocks desktop background]
         * [view - the blockView]
         * [scrollData - cached offset top and bottom of block dom element]
         * @default []
         */                
        blockDataSet : [],
        /**
         * Reference to the item in blockDataSet that is currently being displayed
         */
        currentBlockItem: undefined,
        
        
        /*
         * @method initialize
         * @param {object} constructor options
         * @returns {undefined}
         */
        initialize: function(options) {
            
            this.blockDataSet = [];                          

            this.listenTo(Adapt, "pageView:postRender", this.setupBackgroundContainer);
            this.listenTo(Adapt, "blockView:postRender", this.setUpBlock);        
            this.listenTo(Adapt, "pageView:ready", this.onPageViewReady);
            this.listenTo(Adapt, "device:resize", this.initializeBackgrounds);
            this.listenTo(Adapt, 'remove', this.removeBackgroundSwitcherView);                
        },

        onPageViewReady: function () {
            
            this.setupScrollPointCache();
            this.setupScrollListener();
            this.onScroll();
        },

        /*
         * Calculates what blockView is in view - called on window scroll event
         * 
         * @method onScroll
         * @param null
         * @return undefined
         */
        onScroll: function() {
            
            if (Adapt.device.screenSize !=='large') return;     

            var scrollPosition = $(window).scrollTop() + $(window).height() / 2;

            var foundBlockData = this.findBackgroundForScrollPosition(scrollPosition);

            if(!_.isUndefined(foundBlockData)) this.transitionToBackground(foundBlockData);
        },
        
        /*
         * Prepends a container div to the .page element that background elements will sit in
         * 
         * @method setupBackgroundContainer
         * @param {object} pageView
         * @return undefined
         */
        setupBackgroundContainer : function(pageView) {

            this.$backgroundContainer = $('<div class="background-switcher-container"></div>');
            pageView.$el.addClass('background-switcher-active');
            pageView.$el.prepend(this.$backgroundContainer);    
        },

        /*
         * Caches background switcher images' .top and .bottom properties so that we can check them easily later
         * 
         * @method setupScrollPointCache
         * @return undefined
         */   
        setupScrollPointCache : function() {                 
            
            _.each(this.blockDataSet, function(blockData){                        
                var $el = blockData.view.$el;
                var blockTop = $el.offset().top;
                blockData.scrollData = { top : blockTop, bottom: blockTop + $el.height() };
            }, this);
        },

        /*
         * Binds the onScrollMethod to the window scroll event
         * 
         * @method setupScrollListener
         * @param null
         * @return undefined
         */
        setupScrollListener : function(){     
            
            $(window).on('scroll', _.bind(this.onScroll, this));            
        },
        
        /*
         * Setup backgrounds for each block that has "_background-switcher" settings defined in its data/model
         * 
         * @method setUpBlock
         * @param {object} blockView
         * @return undefined
         */
        setUpBlock : function(blockView){

            if(!blockView.model.get('_backgroundSwitcher')) return;

            blockView.$el.addClass('background-switcher-block');

            this.setupBlockDesktopBackground(blockView);
            this.setupBlockMobileBackground(blockView);
        },
        
        /*
         * Appends desktop backgrounds to the background-switcher-container
         * 
         * @method setupBlockDesktopBackground
         * @param {object} blockView
         * @return undefined
         */        
        setupBlockDesktopBackground: function(blockView) {

            var bgSrc = blockView.model.get('_backgroundSwitcher').src;
            var $bg = $('<div class="background-switcher-background"  style="background-image: url('+bgSrc+');"></div>');
            this.blockDataSet.push({ $background:$bg , view: blockView});
            this.$backgroundContainer.prepend($bg);
            //console.log(this.blockDataSet);         
        },
        
        /*
         * adds mobile backgrounds style to a blockView element
         * 
         * @method setupBlockMobileBackground
         * @param {object} blockView
         * @return undefined
         */          
        setupBlockMobileBackground : function(blockView){

            var options = blockView.model.get('_backgroundSwitcher');
            blockView.$('.block-inner').addClass('background-switcher-block-mobile').css({'background-image': 'url('+options.mobileSrc+')'});
        },

        /**
         * Checks scrollPosition to see if it's:
         * in between the top and bottom of a background switcher image - or
         * it's between two background switcher images (not all blocks will have backgrounds specified) or 
         * after the last background image
         * @param {int} scrollPosition
         * @return {object} Reference to item in blockDataSet (or undefined if nothing found)
         */
        findBackgroundForScrollPosition: function(scrollPosition) {
            var foundBlockData;

            // check to see if scrollPosition is inside the bounds of a background image
            foundBlockData = _.find(this.blockDataSet, function(blockDataItem, index){
                return (blockDataItem !== this.currentBlockItem  && scrollPosition >= blockDataItem.scrollData.top && scrollPosition <= blockDataItem.scrollData.bottom);
            }, this); 

            // check to see if scrollPosition is either between two backgrounds - or after the last one
            if(_.isUndefined(foundBlockData)) {
                foundBlockData = _.find(this.blockDataSet, function(blockDataItem, index) {
                    var nextBlockDataItem = this.blockDataSet[index + 1];
                    return (blockDataItem !== this.currentBlockItem  && scrollPosition > blockDataItem.scrollData.bottom && (_.isUndefined(nextBlockDataItem) || (scrollPosition < nextBlockDataItem.scrollData.top)));
                }, this);
            }

            return foundBlockData;
        },    

        /*
         * Handles animating from one background switcher blockView background to another
         * 
         * @method transitionToBackground
         * @param {int} the index of the background switcher blockView (this.blockDataSet[index])
         * @return undefined
         */
        transitionToBackground : function(blockData){
            this.currentBlockItem = blockData;

            Adapt.trigger('background-switcher:transitionToBackground', blockData);

            if(Modernizr.csstransitions){
                $('.active').removeClass('active');
                blockData.$background.addClass('active');             
            }
            else {
                $('.active').animate({opacity:0}, 1000, function(){ $(this).removeClass('active'); });
                blockData.$background.animate({opacity:1}, 1000, function(){ $(this).addClass('active'); });
            } 
        },

        /*
         * Deconstructor for this view
         * 
         * @method removeBackgroundSwitcherView
         * @param {int} the index of the background switcher blockView (this.blockDataSet[index])
         * @return undefined
         */
        removeBackgroundSwitcherView: function() {

            $(window).off('scroll', _.bind(this.onScroll, this));
            this.remove();
        }

    });

    Adapt.on("router:page", function(model) {
        if (model.get("_backgroundSwitcher")) {
            if (model.get("_backgroundSwitcher")._isActive) {
                new BackgroundSwitcherView();
            }
        }
    });

});