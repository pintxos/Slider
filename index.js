(function (window) {

	'use strict';

	// UMD
	if(typeof define !== 'function') {
		window.define = function(deps, definition) {

			var deps = [
				jQuery,
				pintxos.inherit,
				pintxos.Component,
				pintxos.AnimationTimeline,
				pintxos.ScrollableNative,
				pintxos.ScrollableHA
			];

			window.pintxos = window.pintxos || {};
			window.pintxos.Slider = definition.apply(this, deps);
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
		speed: 500,
        orientation: 'horizontal',
       	useTranslate: false,
       	easing: 'linear',
		selectors: {
			nav: '.pager',
			btnNext: '.pager__next a',
			btnPrev: '.pager__prev a',
			scrollableEl: '.slider__scrollable'
		},
		css: {
			navActiveClass: 'js-is-active'
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

	Slider.NEXT = 'next';
	Slider.PREV = 'prev';

	/* Methods
	----------------------------------------------- */
	Slider.prototype.init = function () {

		Slider._super.init.call(this);

		this._isAnimating = false;

		this._scrollable = (this.getSettings().useTranslate) ? new ScrollableHA(this.getScrollableEl()) : new ScrollableNative(this.getScrollableEl());

		this.getScrollableEl().css({position: 'relative'});

		this._on(this.getNav(), this._settings.events.click, 'a', this._onPagerClick);
		this._on(this.getScrollableEl(), 'scroll', this._onScroll);
		this._on($win, 'resize', this._onResize);

		this.goToItem(0, false);
		this.updateNav();

	};

    Slider.prototype.destroy = function () {
        this.getScrollableEl().css({position: ''});

        this._scrollable.destroy();

        Slider._super.destroy.call(this);
    };

	Slider.prototype.goToItem = function (item, pos, animate) {

		var $item, position, itemPos, containerPos, itemSize;

		if(this.isAnimating()) {
			return this;
		}

		// shuffeling arguments ...
		if(typeof item === 'number') {
			$item = this.getChild(item);
		}else{
			$item = item;
		}

		animate = (typeof pos === 'boolean') ? pos : animate;
		animate = (typeof animate === 'undefined') ? true : animate;

		// positioned left
		position = this.getItemOffset($item);
		itemSize = this.getItemSize($item);

		if(pos === 'center') {
			position = position - ((this._scrollable.getMaskSize() / 2) - (itemSize / 2));
		}else if (pos === 'right') {
			position = position - (this._scrollable.getMaskSize() - itemSize);
		}

		position = Math.ceil(position);

		if(position >= this._scrollable.getMaxScrollPos() - 1) {
			position = this._scrollable.getMaxScrollPos();
		}

		if(position < 0) {
			position = 0;
		}

		this.getEl().trigger(this._settings.events.beforeSlide, $item);

		if(animate) {
			this.slideTo(position, this._settings.speed);
		}else{
			this._scrollable.setScrollPos(position);
		}

		return this;

	};

	Slider.prototype.slideTo = function (pos, duration) {

		var animation, direction, distance, currPos;

		this._isAnimating = true;

		animation = new AnimationTimeline(duration, {
			easing: this.getSettings().easing
		});

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
		maskWidth = this._scrollable.getMaskSize();
		offset = this._scrollable.getScrollPos();
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

	Slider.prototype.getNextItem = function (dir) {
		var visibleItems, newIndex;

		visibleItems = this.getVisibleItems();
		newIndex = (dir === Slider.NEXT) ? visibleItems[visibleItems.length - 1].index + 1 : visibleItems[0].index - 1;

		if(newIndex > this.getChildren().length - 1) {
			newIndex = this.getChildren().length - 1;
		}

		if(newIndex < 0) {
			newIndex = 0;
		}

		return newIndex;
	};

	Slider.prototype.next = function () {

		this.goToItem(this.getNextItem(Slider.NEXT));

		return this;
	};

	Slider.prototype.prev = function () {

		this.goToItem(this.getNextItem(Slider.PREV), 'right');

		return this;
	};

	Slider.prototype.getNav = function () {
		return this._query(this.getSettings().selectors.pager);
	};

	Slider.prototype.updateNav = function () {

		var navActiveClass, offset, $next, $prev;

		navActiveClass = this._settings.css.navActiveClass;
		$next = this.getBtnNext().parent();
		$prev = this.getBtnPrev().parent();
		offset = 5;

		if(!this._scrollable.isBeginReached(offset)) {
			$prev.addClass(navActiveClass);
		}else{
			$prev.removeClass(navActiveClass);
		}

		if(!this._scrollable.isEndReached(offset)) {
			$next.addClass(navActiveClass);
		}else{
			$next.removeClass(navActiveClass);
		}

		return this;

	};

	Slider.prototype.getItemOffset = function ($item) {
        var offset = this._scrollable._getProp('offset');
		return this._scrollable.getScrollPos() + $item.position()[offset] + parseInt($item.css('margin'+capitalize(offset)), 10);
	};

	Slider.prototype.getItemSize = function ($item) {
		var method;

		method = 'outer' + capitalize(this._scrollable._getProp('size'));

		return $item[method]();
	};

	Slider.prototype.getScrollableEl = function () {
		return this._query(this.getSettings().selectors.scrollableEl);
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
		return this._query(this.getSettings().selectors.btnNext);
	};

	Slider.prototype.getBtnPrev = function () {
		return this._query(this.getSettings().selectors.btnPrev);
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
