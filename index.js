(function (window) {

	'use strict';

	// UMD
	if(typeof define !== 'function') {
		window.define = function(deps, definition) {
			window.pintxos = window.pintxos || {};
			window.pintxos.Slider = definition();
			define = null;
		};
	}

	define([], function () {


		var Slider, _defaults;

		/* Default settings
		----------------------------------------------- */
		_defaults = {

		};


		/* Constructor
		----------------------------------------------- */
		Slider = function (el, options) {

		};


		/* Methods
		----------------------------------------------- */

		/**
		 * All bootstrap logic should go here
		 * @return {void}
		 */
		Slider.prototype.init = function () {

		};

		/**
		 * All teardown logic should go here
		 * @return {void}
		 */
		Slider.prototype.destroy = function () {

		};


		/* Event handlers
		----------------------------------------------- */


		/* Export
		----------------------------------------------- */
		return Slider;

	});

})(this);
