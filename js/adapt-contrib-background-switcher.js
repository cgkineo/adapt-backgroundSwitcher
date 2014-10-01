

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
        
        
        /*
         * @method initialize
         * @param {object} constructor options
         * @returns {undefined}
         */
        
        initialize: function(options) {
            
            this.blockDataSet = [];                          

            this.listenTo(Adapt, "pageView:postRender", this.setupBackgroundContainer);
            this.listenTo(Adapt, "blockView:postRender", this.setUpBlock);        
            this.listenTo(Adapt, "pageView:ready", this.setupScrollPointCache);
            this.listenTo(Adapt, "pageView:ready", this.setupScrollListener);
            this.listenTo(Adapt, "pageView:ready", this.initializeBackgrounds);
            this.listenTo(Adapt, "device:resize", this.initializeBackgrounds);

            this.listenTo(Adapt, 'remove', this.removeBackgroundSwitcherView);                
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
            console.log(this.blockDataSet);         
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
            blockView.$('.block-inner').addClass('background-switcher-block-mobile').css({'background': 'url('+options.mobileSrc+')'});
        },        

        /*
         * Caches background switcher blocks top and bottom for the onScroll method
         * 
         * @method setupScrollPointCache
         * @return undefined
         */   
        setupScrollPointCache : function(){                       

            _.each(this.blockDataSet, function(blockData){                        
                var $el = blockData.view.$el;
                var blockTop = $el.offset().top;
                blockData.scrollData = { top : blockTop, bottom: blockTop + $el.height() };
            }, this);
        },

        /*
         * Binds the onScrollMethos to the window scroll event
         * 
         * @method setupScrollListener
         * @param null
         * @return undefined
         */
        setupScrollListener : function(){              
            $(window).on('scroll', _.bind(this.onScroll, this));                
        },


        /*
         * Setups what background should initially be shown
         * 
         * @method initializeBackgrounds
         * @param null
         * @return undefined
         */
        initializeBackgrounds : function(){
            var index = 0;             
            var blockData = this.blockDataSet[index];
            this.transitionWithBlockData(blockData);
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

            _.each(this.blockDataSet, function(blockData, index){
                if(index !== this.currentIndex  && scrollPosition >= blockData.scrollData.top && scrollPosition <= blockData.scrollData.bottom){                 
                    this.transitionToBackground(index);
                    return;
                }                       
            }, this);                 
        },    

        /*
         * Handles animating from one background switcher blockView background to another
         * 
         * @method transitionToBackground
         * @param {int} the index of the background switcher blockView (this.blockDataSet[index])
         * @return undefined
         */
        transitionToBackground : function(index){

            if(index < 0 || index > this.blockDataSet.length || index === this.currentIndex) return;

            this.previousIndex = this.currentIndex;
            this.currentIndex = index;

            var blockData = this.blockDataSet[index];

            Adapt.trigger('background-switcher:transitionToBackground', blockData);

            this.transitionWithBlockData(blockData);
                   
        },

        /*
        *  Transition background using blockdata, chooses css3 or Jquery depending on browser support for css transitions
        */

        transitionWithBlockData: function(blockData) {
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