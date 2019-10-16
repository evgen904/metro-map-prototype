/**
 * Created by ghost on 24.09.2015.
 */
(function($){
	var MetroWidget = function(element) {
		this.DATA_ATTRIBUTE_SELECTED_ITEM_ID = 'id';
		this.SELECTED_ITEMS_SELECTOR = '.filter-selected-item';
		this.SELECTED_ITEMS_CONTAINER_SELECTOR = '.filter-selected-items';
		this.SELECTED_ITEMS_CLOSE_SELECTOR = this.SELECTED_ITEMS_SELECTOR + ' .close';
		this.DEFAULT_DISTANCE_VALUE = 4000;
		this.$element = $(element);
		this.$input = this.$element.find('input[type=hidden]').eq(0);
		this.$clearHref = this.$element.find('.filter-info a');
		this.$counter = this.$element.find('.counter');
		this.$openDialogHref = this.$element.find('.jsn-open');
		this.$selectDistance = $('#metro-distance');
		this.$inputDistance = this.$element.find('input[type=hidden]').eq(1);
		this.hasMetroMap = parseInt(this.$element.data('has-metro-map'))
			// && device.desktop();
		this.metroMap = null;
		this.dialogHtml = null;
		this.$dialog = null;
		this.oldDistance = 0;
		this.oldStationsCount = 0;
		this.selectedStationsCount = 0;
		this.selectedDistance = this.DEFAULT_DISTANCE_VALUE;
		this.$selectedItems = this.$element.find(this.SELECTED_ITEMS_CONTAINER_SELECTOR);
		this.initVal = null;
		this.selectInitialised = this.$selectDistance.find('data-selected').length > 0; 
		this.initHandlers();
	};

	MetroWidget.prototype.initHandlers = function() {
		this.$clearHref.on('click', $.proxy(this.onClear, this));
		this.$openDialogHref.on('click', $.proxy(this.onOpenDialogClick, this));
		this.$selectDistance.on('change', $.proxy(this.onChangeDistance, this));
		$(document).on('filterReset', $.proxy(this.onFilterReset, this));
		this.$input.on('valueUpdated', $.proxy(this.onValueUpdated, this));
		$(document).on('wpc.filter.cancel', $.proxy(this.onFilterCancel, this));
		this.$element.on('click', this.SELECTED_ITEMS_CLOSE_SELECTOR, $.proxy(this.onSelectedItemCloseClick, this));
	};

	MetroWidget.prototype.onFilterCancel = function(e) {
		var metro = e.parameters.metro;
		if (typeof metro !== 'undefined') {
		
			var metros = metro.split(',').map(function(str) {
				return parseInt(str, 10);
			}).filter(function(number){
				return	!isNaN(number);
			}).slice(0, -1);
		
		
		
			// this.createSelectedItemsFromValue(metro);
		}
	};

	MetroWidget.prototype.createSelectedItemsFromValue = function(value) {
		if (value !== '') {
			value.split(',').map($.proxy(function(itemId){
				var $checkbox = this.findCheckbox(itemId);
				if ($checkbox.length) {
					this.createSelectedItem(this.getSelectedItemDataFromCheckbox($checkbox));
				}
			}, this));
			this.$input.val(value);
		}
	};

	MetroWidget.prototype.onValueUpdated = function(e) {
		if (this.$dialog) {
			this.createSelectedItemsFromValue(this.$input.val());
		}
	};
	
	MetroWidget.prototype.onMapChange = function(e) {
		var list = e.list;
		var existIds = [];
		var newIds = [];
		var toCreate = [];
		var i, l;
		var DATA_ATTRIBUTE_SELECTED_ITEM_ID = this.DATA_ATTRIBUTE_SELECTED_ITEM_ID;

		for (i = 0, l = list.length; i < l; i++) {
			newIds.push(parseInt(list[i].id));
		}

		$(this.SELECTED_ITEMS_SELECTOR).each(function getItemId(){
			var itemId = $(this).data(DATA_ATTRIBUTE_SELECTED_ITEM_ID);
			if (!!itemId) {
				existIds.push(itemId);
			}
		});

		for (i = 0, l = newIds.length; i < l; i++) {
			var cid = newIds[i];
			if (existIds.indexOf(cid) === -1) {
				toCreate.push(cid);
			}
		}

		for (i = 0, l = list.length; i < l; i++) {
			var listItem = list[i],
				listItemId = parseInt(listItem.id);

			if (toCreate.indexOf(listItemId) !== -1) {
				this.createSelectedItem(listItem);
			}
		}

		for (i = 0, l = existIds.length; i < l; i++) {
			var existId = existIds[i];

			if (newIds.indexOf(existId) === -1) {
				this.removeSelectedItem(existId);
			}
		}
	};

	MetroWidget.prototype.onSelectedItemCloseClick = function(e) {
		var element = e.target;
		var $selectedItem = $(element).closest(this.SELECTED_ITEMS_SELECTOR);
		var itemId = $selectedItem.data(this.DATA_ATTRIBUTE_SELECTED_ITEM_ID);
		var values;

		$selectedItem.remove();
		this.findCheckbox(itemId).prop('checked', false);
		values = this.getSelectedValues();
		this.reloadFilter(values);

		e.preventDefault();
	};

	MetroWidget.prototype.getSelectedItemDataFromCheckbox = function($checkbox) {
		var id = $checkbox.val();
		var label = $checkbox.siblings('label').text();
		var color = $checkbox.data('color') || "";
		
		return {id: id, label: label, color: '#' + color};
	}

	MetroWidget.prototype.onCheck = function(e) {
		var $checkbox = $(e.target);
		var status = $checkbox.prop('checked'); 
		var id = $checkbox.val();

		if (status) {
			this.createSelectedItem(this.getSelectedItemDataFromCheckbox($checkbox));
		} else {
			this.removeSelectedItem(id);
		}

		$(document).trigger('webpower.metro.toggle', {id: id});
	};

	MetroWidget.prototype.getSelectedValues = function() {
		var values = [];
		var self = this;
		$('.filter-selected-item').each(function() {
			values.push($(this).data(self.DATA_ATTRIBUTE_SELECTED_ITEM_ID));
		});
		return values;
	};

	MetroWidget.prototype.createSelectedItem = function(selItemData) {
		var html = tmpl('metro-selected-item', selItemData);
		this.$selectedItems.append(html);
	};

	MetroWidget.prototype.findSelectedItem = function(id) {
		var selector = '[data-'+ this.DATA_ATTRIBUTE_SELECTED_ITEM_ID +'=' + id + ']';
		return this.$selectedItems.find(selector);
	}; 

	MetroWidget.prototype.removeSelectedItem = function(itemId) {
		$selectedItem = this.findSelectedItem(itemId);
		$('.js-station-id-' + itemId).trigger('statechange', false);
		$selectedItem.remove();
	};

	MetroWidget.prototype.findCheckbox = function(itemId) {
		return $('#metro_' + itemId);
	};


	MetroWidget.prototype.onChangeDistance = function(e) {
		var selectedValues = this.getSelectedValues();
		if (selectedValues.length) {
			this.selectInitialised = true;
			this.update();
		}
	};

	MetroWidget.prototype.onOpenDialogClick = function(e) {
		e.preventDefault();
		this.attachDialog();
	};

	MetroWidget.prototype.toggleSelector = function(show) {
		var $selectContainer = this.$selectDistance.closest('.select-cnt'); 
		
		if (show) {
			$selectContainer.show();
		} else {
			$selectContainer.hide();
		}
	}

	MetroWidget.prototype.reloadFilter = function(values) {
		values = values || [];
		this.toggleSelector(values.length > 0);
		

		if (!this.selectedDistance && values.length) {
			this.selectedDistance = this.DEFAULT_DISTANCE_VALUE;
			this.$selectDistance.val(this.DEFAULT_DISTANCE_VALUE);
		}

		this.$input.val(values.join(','));
		this.$inputDistance.val(values.length ? this.selectedDistance : '');
		this.$input.trigger('change');
	};

	MetroWidget.prototype.clear = function() {
		$(':checkbox', this.$dialog).prop('checked', false);
		this.$selectedItems.children().remove();
		this.selectedDistance = this.DEFAULT_DISTANCE_VALUE;
		this.$selectDistance.val(this.DEFAULT_DISTANCE_VALUE);
		this.$inputDistance.val('');
		this.$input.val('');
		this.toggleSelector(false);
	};

	MetroWidget.prototype.onClear = function(e) {
		e.preventDefault();
		this.clear();
		this.update();
	};

	MetroWidget.prototype.onFilterReset = function(e) {
		e.preventDefault();
		this.clear();
	};


	MetroWidget.prototype.update = function() {
		/** Проверяем на значение из урла, если уже было кстановлено в фильтре, берем оттуда */
		if (this.selectInitialised) {
			this.selectedDistance = this.$selectDistance.val();
		} else {
			this.selectedDistance = null;
		}

		var values = this.getSelectedValues();
		this.reloadFilter(values);
	};

	MetroWidget.prototype.createDialog = function() {
		var el = $('#metro-dialog-tpl')
			, content = el.length? el.html() : '<br>';
		var html = tmpl(
			content.replace(/(?:\r\n|\r|\n|\t)/g, ''), 
			{
				has_metro_map: this.hasMetroMap,
				is_desktop: device.desktop(),
			}
		);
		
		return html;
	};
	
	MetroWidget.prototype._initSVGMap = function() {
		var subdomain = this.$element.data('city-subdomain');
		
		console.log(this.$input);

		if (this.hasMetroMap) {
			this.metroMap = new webpower.metro.Controller(
				'.metro-map-element',
				subdomain,
				this.$input,
				function() {},
				function() {}
			);
		}
	};

	MetroWidget.prototype._initList = function() {
		var $checkboxes = this.$dialog.find(':checkbox');
		var checkeds = this.$input.val().split(',');
		
		for (var i = 0, l = checkeds.length; i < l; i++) {
			$('#metro_' + checkeds[i]).prop('checked', true);
		}

		$checkboxes.on('click', $.proxy(this.onCheck, this));
	};

	MetroWidget.prototype._initSwitcher = function() {
		var $group = $('.js-map-list-switch');
		var $buttons = $group.find('button'); 
		var onSwitch = function() {
			var UNSELECTED_CLASS = 'btn-default';
			var SELECTED_CLASS = 'btn-primary';
			var $selectedBtn, $unSelectedBtn;

			if ($buttons.eq(0).hasClass(SELECTED_CLASS)) {
				$selectedBtn = $buttons.eq(0);
				$unSelectedBtn = $buttons.eq(1);
			} else {
				$selectedBtn = $buttons.eq(1);
				$unSelectedBtn = $buttons.eq(0);
			}
			
			$selectedBtn.removeClass(SELECTED_CLASS).addClass(UNSELECTED_CLASS);
			var selector = $selectedBtn.data('toggle');
			$(selector).hide();
			
			$unSelectedBtn.removeClass(UNSELECTED_CLASS).addClass(SELECTED_CLASS);
			var selector = $unSelectedBtn.data('toggle');
			$(selector).show();
		};
		
		$buttons.on('click', onSwitch);
	}

	MetroWidget.prototype.initDialogContent = function() {
		var self = this;
		this._initList();
		this.initVal = this.getSelectedValues().join(' ');
		this._initSVGMap();
		this._initSwitcher();
			
		this.$selectedItems.find(this.SELECTED_ITEMS_SELECTOR).each(function(){
			var id = $(this).data(self.DATA_ATTRIBUTE_SELECTED_ITEM_ID);
			$('.js-station-id-' + id).trigger('statechange', true);
		});

		this.$input.on('metro.stations.updated', function(e){
			var ids = e.list.map(function(item) {
				return item.id;
			});
			$(this).val(ids.join(',')); 
			self.onMapChange(e);
		});
	}

	MetroWidget.prototype.attachDialog = function() {
		if (!this.dialogHtml) {
			this.dialogHtml = this.createDialog();
		}
		this.$dialog = $(this.dialogHtml)
			.modal()
			.on('hide.bs.modal', $.proxy(this.removeDialog, this))
			.on('shown.bs.modal', $.proxy(this.initDialogContent, this))
			.on('apply.filter.metro', $.proxy(this.onApply, this))	
			.appendTo('body');
	};

	MetroWidget.prototype.getSelectedItemDataById = function(id) {
		return this.findSelectedItem(id).data();
	};

	MetroWidget.prototype._restoreInitValues = function() {
		var self = this;
		var hasCheckboxes = this.$dialog.find(':checkbox').length > 0;
		var values = this.initVal.split(' ').filter(function(item){
			return item != ''; 
		}).map(function(id) {
			if (hasCheckboxes) {
				return self.getSelectedItemDataFromCheckbox(self.findCheckbox(id));
			} else {
				return self.getSelectedItemDataById(id);
			}
		});
		this.$input.trigger(new $.Event('metro.stations.updated', {list: values}));
	};

	MetroWidget.prototype.onApply = function() {
		this.fromApply = true;
	};

	MetroWidget.prototype.removeDialog = function(e) {
		if (this.hasMetroMap && !this.fromApply) {
			this._restoreInitValues();
		} 
		this.$input.off('metro.stations.updated');
		if (this.getSelectedValues().join(' ') != this.initVal) {
			this.update();
		}
		if (!!this.metroMap) {
			this.metroMap.remove();
		}
		this.$dialog.remove();
		this.fromApply = false;
	};

	$(function(){
		$('[data-widget=metro]').each(function(){
			new MetroWidget(this);
		});
	});
})(jQuery);
