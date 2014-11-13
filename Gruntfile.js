var config = {
	testDependencies: [
		'test/*.js',
		'bower_components/jquery/dist/jquery.js',
		'bower_components/pintxos-inherit/index.js',
		'bower_components/pintxos-component/index.js',
		'bower_components/eventEmitter/EventEmitter.js',
		'bower_components/bezier-easing/bezier-easing.js',
		'bower_components/pintxos-animation_timeline/index.js',
		'bower_components/pintxos-scrollable_native/index.js',
		'bower_components/pintxos-scrollable_ha/index.js',
		'index.js'
	]
};

module.exports =  require('grunt-pintxos')(config);
