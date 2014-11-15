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
		Component.call(this, el, this._settings);

		this._uid = _uid ++;
	};

	inherit(Slider, Component);


	/* Constants
	----------------------------------------------- */
	Slider.NEXT = 'next';
	Slider.PREV = 'prev';

	Slider.HORIZONTAL = 'horizontal';
	Slider.VERTICAL = 'vertical';

	Slider.END = 'end';
	Slider.BEGIN = 'begin';
	Slider.MIDDLE = 'middle';


	/* Methods
	----------------------------------------------- */

	/**
	 * Initialise the slider.
	 *
	 * @return {Slider}
	 */
	Slider.prototype.init = function () {

		var scrollableOptions;

		Slider._super.init.call(this);

		scrollableOptions = {
			orientation: this.getSettings().orientation
		};

		this._isAnimating = false;

		this._scrollable = (this.getSettings().useTranslate) ? new ScrollableHA(this.getScrollableEl()[0], scrollableOptions) : new ScrollableNative(this.getScrollableEl()[0], scrollableOptions);

		this._scrollable.init();

		this.getScrollableEl().css({position: 'relative'});

		if(this.getSettings().generateNav) {
			this._generateNav();
		}

		this._on(this.getNav(), this._settings.events.click, 'button, a', this._onPagerClick);
		this._on(this.getScrollableEl(), 'scroll', this._onScroll);
		this._on($win, 'resize', this._onResize);

		this.goToItem(0, false);
		this.updateNav();

		return this;

	};

	/**
	 * Destroy the slider
	 *
	 * @return {Slider}
	 */
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

		return this;
	};

	/**
	 * Navigates the slider to a given item within the list, animated or not.
	 *
	 * @param  {Number/jQuery} can be the actual element or it's index
	 * @param  {String} left|center|right (defaults to left)
	 * @param  {Boolean} (defaults to true)
	 * @return {Slider}
	 */
	Slider.prototype.goToItem = function (item, alignment, animate) {

		var index, $item, position, itemSize;

		if(this.isAnimating()) {
			return this;
		}

		// shuffeling arguments ...
		if(typeof item === 'number') {
			index = item;
			$item = this.getChild(item);
		}else{
			$item = item;
			index = this.getChildren().index($item);
		}

		animate = (typeof alignment === 'boolean') ? alignment : animate;
		animate = (typeof animate === 'undefined') ? true : animate;

		// positioned left
		position = this.getItemOffset(index);
		itemSize = this.getItemSize(index);

		if(alignment === Slider.MIDDLE) {
			position = position - ((this._scrollable.getMaskSize() / 2) - (itemSize / 2));
		}else if (alignment === Slider.END) {
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

	/**
	 * Animates the slider to a given scroll position.
	 *
	 * @param  {number}
	 * @param  {number}
	 * @return {Slider}
	 */
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

	/**
	 * Getter for _isAnimating
	 * @return {Boolean}
	 */
	Slider.prototype.isAnimating = function () {
		return this._isAnimating;
	};

	/**
	 * When the strict param equals to true this function will return all fully visible items.
	 * Otherwise it will also return items that are only partially visible.
	 *
	 * @param  {Boolean} (defaults to true)
	 * @return {Array}
	 */
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

			elOffset = this.getItemOffset(i);
			elWidth = this.getItemSize(i);

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

	/**
	 * Returns the next item to scroll into the viewport depending on
	 * the current visible items and a given direction. If there are
	 * only partially visible items it will return the last or the
	 * first item depending on the direction.
	 *
	 * @param  {String}
	 * @return {Number}
	 */
	Slider.prototype.getNextItem = function (dir) {
		var visibleItems, newIndex;

		if(dir !== Slider.NEXT && dir !== Slider.PREV) {
			dir = Slider.NEXT;
		}

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

	/**
	 * Slide to the next set of items
	 * @return {Slider}
	 */
	Slider.prototype.next = function () {
		this.goToItem(this.getNextItem(Slider.NEXT));
		return this;
	};

	/**
	 * Slide to the previous set of items
	 * @return {Slider}
	 */
	Slider.prototype.prev = function () {
		this.goToItem(this.getNextItem(Slider.PREV), Slider.END);
		return this;
	};

	/**
	 * Generates the HTML needed for the pager element
	 * @return {void}
	 */
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

	/**
	 * Updates the pager. Adds an active css class
	 * and toggles the disabled attribute.
	 *
	 * @return {Slider}
	 */
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

	/**
	 * Calculates the offset of an item relative to the scrollable element.
	 * Takes the current scrollLeft/scrollTop into account.
	 *
	 * @param  {Number}
	 * @return {Number}
	 */
	Slider.prototype.getItemOffset = function (index) {
		var offset, $item;

		$item = this.getChild(index);
		offset = this._scrollable._getProp('offset');

		return this._scrollable.getScrollPos() + $item.position()[offset] + parseInt($item.css('margin'+capitalize(offset)), 10);
	};

	/**
	 * Calculates the size of an element at the given index.
	 *
	 * @param  {Number}
	 * @return {Number}
	 */
	Slider.prototype.getItemSize = function (index) {
		var method, $item;

		$item = this.getChild(index);
		method = 'outer' + capitalize(this._scrollable._getProp('size'));

		return $item[method]();
	};


	/* Element getters
	----------------------------------------------- */
	Slider.prototype.getNav = function () {
		return this._query(this.getSettings().selectors.pager);
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
