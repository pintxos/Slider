(function (window) {

	'use strict';

	// UMD
	if(typeof define !== 'function') {
		window.define = function(deps, definition) {

			deps = [
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
		generateNav: true,
		selectors: {
			pager: '.pager',
			btnNext: '.pager__next',
			btnPrev: '.pager__prev',
			scrollableEl: '.slider__scrollable'
		},
		css: {
			navActiveClass: 'js-is-active'
		},
		events: {
			click: 'click',
			beforeSlide: 'beforeSlide.Slider'
		},
		fus: {
			next: 'next',
			prev: 'previous'
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

	/* Constants
	----------------------------------------------- */
	Slider.NEXT = 'next';
	Slider.PREV = 'prev';

	/* Methods
	----------------------------------------------- */
	Slider.prototype.init = function () {

		Slider._super.init.call(this);

		this._isAnimating = false;

		this._scrollable = (this.getSettings().useTranslate) ? new ScrollableHA(this.getScrollableEl()) : new ScrollableNative(this.getScrollableEl());

		this._scrollable.init();

		this.getScrollableEl().css({position: 'relative'});

		if(this.getSettings().generateNav) {
			this._generateNav();
		}

		this._on(this.getNav(), this._settings.events.click, 'button', this._onPagerClick);
		this._on(this.getScrollableEl(), 'scroll', this._onScroll);
		this._on($win, 'resize', this._onResize);

		this.goToItem(0, false);
		this.updateNav();

	};

	Slider.prototype.destroy = function () {

		this.getScrollableEl().css({position: ''});
		this._scrollable.destroy();

		if(this._isHeaderGenerated) {
			this.getEl().find('> header').remove();
		}else {
			this.getNav().remove();
		}

		this._scrollable = undefined;
		this._isHeaderGenerated = undefined;
		this._isAnimating = undefined;

		Slider._super.destroy.call(this);
	};

	Slider.prototype.goToItem = function (item, pos, animate) {

		var $item, position, itemSize;

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

	Slider.prototype.getVisibleItems = function (strict) {
		var $children,
			maskWidth,
			visibleItems,
			elOffset,
			elWidth,
			tolerance,
			offset,
			beginIntoView,
			endIntoView;

		strict = (typeof strict === 'undefined') ? true : strict;
		tolerance = 3;
		$children = this.getChildren();
		maskWidth = this._scrollable.getMaskSize();
		offset = this._scrollable.getScrollPos();
		visibleItems = [];

		for(var i = 0, len = $children.length; i < len; i ++) {

			var $child = $children.eq(i);

			elOffset = this.getItemOffset($child);
			elWidth = this.getItemSize($child);

			// @TODO see how we can fix pixel rounding issues in more decent way ...
			beginIntoView = elOffset >= offset - tolerance && elOffset <= offset + maskWidth + tolerance;
			endIntoView = elWidth + elOffset <= offset + maskWidth + tolerance && elWidth + elOffset >= offset - tolerance;

			// If strict is true check if te beginning AND the end of the element is visible, otherwise we only
			// check if the beginning OR the end is visible.
			if((strict && beginIntoView && endIntoView) || (!strict && (beginIntoView || endIntoView))) {

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

		if(visibleItems.length === 0) {

			// If there are no items which are fully visible,
			// check for items that are partialy visible
			visibleItems = this.getVisibleItems(false);
			newIndex = (dir === Slider.NEXT) ? visibleItems[visibleItems.length - 1].index : visibleItems[0].index;

		}else {
			newIndex = (dir === Slider.NEXT) ? visibleItems[visibleItems.length - 1].index + 1 : visibleItems[0].index - 1;
		}

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

	Slider.prototype._generateNav = function () {
		var html, fus, $pager, $header;

		fus = this.getSettings().fus;

		html = '<nav class="pager">';
		html += '<button class="pager__prev"><span>'+ fus.prev +'</span></button>';
		html += '<button class="pager__next"><span>'+ fus.next +'</span></button>';
		html += '</nav>';

		$pager = $(html);
		$header = this.getEl().find('> header');

		if($header.length === 0) {
			this._isHeaderGenerated = true;
			$header = $('<header/>');
			$header.prependTo(this.getEl());
		}

		$pager.appendTo($header);
	};

	Slider.prototype.updateNav = function () {

		var navActiveClass, offset, $next, $prev;

		navActiveClass = this._settings.css.navActiveClass;
		$next = this.getBtnNext();
		$prev = this.getBtnPrev();
		offset = 5;

		if(!this._scrollable.isBeginReached(offset)) {
			$prev.addClass(navActiveClass);
			$prev.removeAttr('disabled');
		}else{
			$prev.removeClass(navActiveClass);
			$prev.attr('disabled', 'disabled');
		}

		if(!this._scrollable.isEndReached(offset)) {
			$next.addClass(navActiveClass);
			$next.removeAttr('disabled');
		}else{
			$next.removeClass(navActiveClass);
			$next.attr('disabled', 'disabled');
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

		$target = $(e.currentTarget);

		if($target.is(this.getBtnNext())) {
			this.next();
		}

		if($target.is(this.getBtnPrev())) {
			this.prev();
		}
	};

	function capitalize(string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	}

	return Slider;

});


})(this);
