
var slider, $slider;

beforeEach(function () {
	jasmine.getFixtures().fixturesPath = '/base/test/fixtures/';
	loadFixtures('index.html');

	$slider = $('#mySlider');
	slider = new pintxos.Slider($slider).init();
});

afterEach(function () {
	slider.destroy();
});

describe('setup', function () {

	it('should set the css position property of the scrollable element to relative', function () {
		expect(slider.getScrollableEl().css('position')).toBe('relative');
	});

});

describe('movement', function () {

	it('test', function () {
		slider._scrollable.setScrollPos(10);
		expect(slider._scrollable.getScrollPos()).toBe(10);
	});

});
