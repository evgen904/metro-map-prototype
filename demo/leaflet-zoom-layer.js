/**
 * leaflet plugin for zoom container
 * @copyright 2016 webpower ltd.
 * @license MIT
 */
/* globals define */

(function (factory) {
	var L
	if (typeof define === 'function' && define.amd) {
		// AMD
		define(['leaflet'], factory)
	} else if (typeof module !== 'undefined') {
		// Node/CommonJS
		L = require('leaflet')
		module.exports = factory(L)
	} else {
		// Browser globals
		if (typeof window.L === 'undefined') {
			throw new Error('Leaflet must be loaded first')
		}
		factory(window.L)
	}
}(function (L) {
	L.ZoomLayer = L.Layer.extend({
		initialize: function (element, width, height) {
			this._element = element;
			this._width = width;
			this._height = height;
		},
		_initBounds: function() {
			var w = this._width;
			var h = this._height;
			// calculate the edges of the image, in coordinate space
			var southWest = this._map.unproject([-w / 2, h / 2], 2);
			var northEast = this._map.unproject([w / 2, -h / 2], 2);
			var bounds = new L.LatLngBounds(southWest, northEast);

			return L.latLngBounds(bounds)
		},

		onAdd: function () {
			this._bounds = this._initBounds();
			// this._map.setMaxBounds(this._bounds);
			L.DomUtil.addClass(this._element, 'leaflet-interactive leaflet-zoom-animated');
			this.addInteractiveTarget(this._element);
			this.getPane().appendChild(this._element);
			this._reset();
		},
		onRemove: function () {
			this.removeInteractiveTarget(this._element);
		},
		// @method bringToFront(): this
		// Brings the layer to the top of all overlays.
		bringToFront: function () {
			if (this._map) {
				L.DomUtil.toFront(this._element);
			}
			return this;
		},

		// @method bringToBack(): this
		// Brings the layer to the bottom of all overlays.
		bringToBack: function () {
			if (this._map) {
				L.DomUtil.toBack(this._element);
			}
			return this;
		},

		getEvents: function () {
			var events = {
				zoom: this._reset,
				viewreset: this._reset,
				zoomanim: this._animateZoom
			};

			return events;
		},

		getBounds: function () {
			return this._bounds;
		},
		getInitialBounds: function() {
			return this._initialBounds;
		},
		setBounds: function (bounds) {
			this._bounds = bounds;

			if (this._map) {
				this._reset();
			}
			return this;
		},

		getElement: function () {
			return this._element;
		},

		_animateZoom: function (e) {
			var scale = this._map.getZoomScale(e.zoom),
			    offset = this._map._latLngToNewLayerPoint(this._bounds.getNorthWest(), e.zoom, e.center);

			L.DomUtil.setTransform(this._element, offset, scale);
		},
		_reset: function () {

			var element = this._element,
				bounds = new L.Bounds(
			        this._map.latLngToLayerPoint(this._bounds.getNorthWest()),
			    	this._map.latLngToLayerPoint(this._bounds.getSouthEast())
			 	),
		    	size = bounds.getSize();
			
			L.DomUtil.setPosition(element, bounds.min);
			this._updateSize(size);
		},
		_updateSize: function(size) {	
			var element = this._element;

			element.style.width  = size.x + 'px';
			element.style.height = size.y + 'px';
		}
	});

	/**
	 * @param  {Number} value
	 * @return {L.LatLngBounds}
	 */
	L.LatLngBounds.prototype.scale = function (value) {
		var ne = this._northEast;
		var sw = this._southWest;
		var deltaX = (ne.lng - sw.lng) / 2 * (value - 1);
		var deltaY = (ne.lat - sw.lat) / 2 * (value - 1);

		return new L.LatLngBounds([[sw.lat - deltaY, sw.lng - deltaX], [ne.lat + deltaY, ne.lng + deltaX]]);
	};

	L.zoomLayer = function (element, width, height) {
		return new L.ZoomLayer(element, width, height);
	};	
}));