(function (window) {

	'use strict';

	// UMD
	if(typeof define !== 'function') {
		window.define = function(deps, definition) {
			window.pintxos = window.pintxos || {};
			window.pintxos.Slider = definition(jQuery, pintxos.inherit, pintxos.Component, pintxos.AnimationTimeline, pintxos.ScrollableNative, pintxos.ScrollableHA);
			define = null;
		};
	}

	define(
	[
		'jQuery',
		'pintxos-inherit',
		'pintxos-component',
		'pintxos-animation_timeline',
		'pintxos-scrollable_native',
		'pintxos-scrollable_ha'
	],

	function (
		$,
		inherit,
		Component,
		AnimationTimeline,
		ScrollableNative,
		ScrollableHA
	) {

	var Slider, _defaults, $win, _uid;

	$win = $(window);
	_uid = 0;

	/* Default settings
	----------------------------------------------- */
	_defaults = {
		createNav: false,
		speed: 500,
        orientation: 'horizontal',
		selectors: {
			nav: '.pager',
			btnNext: '.lnkNext a',
			btnPrev: '.lnkPrev a',
			scrollableEl: '> .main'
		},
		css: {
			navActiveClass: 'jActive'
		},
		events: {
			click: 'click',
			beforeSlide: 'beforeSlide.Slider'
		}
	};

	/* Constructor
	----------------------------------------------- */
	Slider = function (el, options) {
		this._settings = $.extend(true, {}, _defaults, options);
		ScrollableNative.call(this, el, this._settings);

		this._uid = _uid ++;
	};

	inherit(Slider, Component);

	/* Methods
	----------------------------------------------- */
	Slider.prototype.init = function () {

		Slider._super.init.call(this);

		this._isAnimating = false;

		this.getScrollableEl().css({position: 'relative'});

        this.createPager();

		// bind events
		this._on(this.getNav(), this._settings.events.click, 'a', this._onPagerClick);
		this._on(this.getScrollableEl(), 'scroll', this._onScroll);
		this._on($win, 'resize', this._onResize);

		this.goToItem(0, false);
		this.updateNav();

	};

    Slider.prototype.destroy = function () {
        this.getScrollableEl().css({position: ''});
        Slider._super.destroy.call(this);
    };

	Slider.prototype.goToItem = function (item, pos, animate) {
		var $item, position, itemPos, containerPos, itemSize;

		// shuffeling arguments ...
		if(typeof item === 'number') {
			$item = this.getChild(item);
		}else{
			$item = item;
		}

		animate = (typeof pos === 'boolean') ? pos : animate;
		animate = (typeof animate === 'undefined') ? true : animate;

		// stop the animation if it's still running
		if(this.animation !== undefined) {
			this.getScrollableEl().stop();
		}

		// positioned left
		position = this.getItemOffset($item);
		itemSize = this.getItemSize($item);

		if(pos === 'center') {
			position = position - ((this.getMaskSize() / 2) - (itemSize / 2));
		}else if (pos === 'right') {
			position = position - (this.getMaskSize() - itemSize);
		}

		position = Math.ceil(position);

		if(position >= this.getMaxScrollPos() - 1) {
			position = this.getMaxScrollPos();
		}

		if(position < 0) {
			position = 0;
		}

		this.getEl().trigger(this._settings.events.beforeSlide, $item);

		if(animate) {
			this.slideTo(position, this._settings.speed);
		}else{
			this.setScrollPos(position);
		}

		return this;

	};

	Slider.prototype.slideTo = function (pos, duration) {

		var animation, direction, distance, currPos;

		this._isAnimating = true;

		animation = new AnimationTimeline(duration);

		currPos = this._scrollable.getScrollPos();
		direction = (pos > currPos);
		distance = Math.abs(currPos - pos);

		animation.on('tick', $.proxy(function (p) {

			if(direction) {
				this._scrollable.setScrollPos(currPos + (p * distance));
			}else {
				this._scrollable.setScrollPos(currPos - (p * distance));
			}


		}, this));

		animation.on('finish', $.proxy(function () {
			this._isAnimating = false;
		}, this));


		animation.start();

		return this;
	};

	Slider.prototype.isAnimating = function () {
		return this._isAnimating;
	};

	Slider.prototype.getVisibleItems = function () {
		var $children,
			maskWidth,
			visibleItems,
			elOffset,
			elWidth,
			position,
			offset;

		$children = this.getChildren();
		maskWidth = this.getMaskSize();
		offset = this.getScrollPos();
		visibleItems = [];

		for(var i = 0, len = $children.length; i < len; i ++) {

			var $child = $children.eq(i);

			elOffset = this.getItemOffset($child);
			elWidth = this.getItemSize($child);

			// @TODO see how we can fix pixel rounding issues in more decent way ...
			if(elWidth + elOffset <= (offset + maskWidth) + 3 && elOffset >= offset - 3) {

				visibleItems.push({
					el: $child,
					index: i
				});
			}
		}

		return visibleItems;
	};

	Slider.prototype.next = function () {
		var visibleItems, newIndex;

		if(this.isAnimating()) {
			return;
		}

		visibleItems = this.getVisibleItems();
		newIndex = visibleItems[visibleItems.length - 1].index + 1;

		if(newIndex > this.getChildren().length - 1) {
			return;
		}

		this.goToItem(newIndex);

		return this;
	};

	Slider.prototype.prev = function () {
		var visibleItems, newIndex;

		if(this.isAnimating()) {
			return;
		}

		visibleItems = this.getVisibleItems();
		newIndex = visibleItems[0].index - 1;

		if(newIndex < 0) {
			return;
		}

		this.goToItem(newIndex, 'right');

		return this;
	};

	Slider.prototype.getNav = function () {
		return this._query('> header .pager');
	};

	Slider.prototype.updateNav = function () {

		var navActiveClass, offset;

		navActiveClass = this._settings.css.navActiveClass;
		offset = 5;

		if(!this.isBeginReached(offset)) {
			this.getBtnPrev().parent().addClass(navActiveClass);
		}else{
			this.getBtnPrev().parent().removeClass(navActiveClass);
		}

		if(!this.isEndReached(offset)) {
			this.getBtnNext().parent().addClass(navActiveClass);
		}else{
			this.getBtnNext().parent().removeClass(navActiveClass);
		}

		return this;

	};

	Slider.prototype.getItemOffset = function ($item) {
        var offset = this._getProp('offset');
		return this.getScrollPos() + $item.position()[offset] + parseInt($item.css('margin'+capitalize(offset)), 10);
	};

	Slider.prototype.getItemSize = function ($item) {
		var method;

		method = 'outer' + capitalize(this._getProp('size'));

		return $item[method]();
	};

	Slider.prototype.refresh = function () {
		return this.updateNav();
	};

	Slider.prototype.getChildren = function () {
		return this.getScrollableEl().children();
	};

	Slider.prototype.getChild = function (index) {
		return this.getChildren().eq(index);
	};

	Slider.prototype.getBtnNext = function () {
		return this._getBtn('Next');
	};

	Slider.prototype.getBtnPrev = function () {
		return this._getBtn('Prev');
	};

	Slider.prototype._getBtn = function (dir) {
		var sel, name;
		name = 'btn' + dir;
		sel = this._settings.selectors[name];
		return this._query(sel, this.getNav());
	};

	/* Event handlers
	----------------------------------------------- */
	Slider.prototype._onScroll = function (e) {
		this.updateNav();
	};

	Slider.prototype._onResize = function (e) {
		this.goToItem(0, false);
		this.refresh();
	};

	Slider.prototype._onPagerClick = function (e) {

		var $target;

		e.preventDefault();

		if(this.isAnimating()) {
			return;
		}

		$target = $(e.target);

		if($target[0] === this.getBtnNext()[0]) {
			this.next();
		}

		if($target[0] === this.getBtnPrev()[0]) {
			this.prev();
		}
	};



	function capitalize(string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	}

	return Slider;

});


})(this);
