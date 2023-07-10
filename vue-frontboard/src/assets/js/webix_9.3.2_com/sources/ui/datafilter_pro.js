import {create, stopEvent, addCss, removeCss, offset} from "../webix/html";
import template from "../webix/template";
import {delay, extend} from "../webix/helpers";
import daterange from "../views/daterange";
import {ui, $$} from "../ui/core";
import i18n from "../webix/i18n";


import datafilter from "./datafilter";

datafilter.excelFilter = {
	getValue:function(node){
		const filter = this._get_filter(node);
		if (filter)
			return filter.getValue();
	},
	setValue:function(node, value){
		const filter = this._get_filter(node);
		if (filter){
			value = value || {};
			filter.setValue(value);
			this._mark_column(value, node);
		}
	},
	$icon:true,
	refresh:function(master, node, config){
		if (master.$destructed) return;

		config.node = node;

		node.$webix = config.filter;
		master.registerFilter(node, config, this);

		const popup = $$(config.filter);
		const filter = popup.getBody();

		const data = this._get_data(master, config);

		filter.clearAll();
		filter.parse(data);

		if (config.value){
			this.setValue(node, config.value);
		} else
			// unfilter only if we have no value
			config.compare = function(){ return true; };

		node.onclick = (e) => {
			const target = e.target.className;
			if (target.indexOf("webix_excel_filter") !== -1 && !popup.isVisible())
				popup.show(this._get_position(node, popup));
		};
	},
	render:function(master, config){
		if (!config.filter){
			if (config.template)
				config.template = template(config.template);

			const filterConfig = extend(config.filterConfig||{}, {
				view:"filter", mode:config.mode, field:"value",
				template: function(obj, type){
					let value = obj["value"];

					if (value === undefined || value === null) value = "";
					if (config.format) value = config.format(value);
					if (config.template) value = config.template(obj, type, value);

					return value;
				}
			}, true);

			const suggest = ui({ view:"popup", body:filterConfig });
			const filter = suggest.getBody();

			filter.attachEvent("onChange", () => {
				const handler = filter.getFilterFunction();
				config.compare = function(val, f, obj){
					return handler({ value: obj[config.columnId] });
				};
				master.filterByAll();

				// change state after filtering
				if (config.value)
					this._mark_column(config.value, config.node);
			});
			master.attachEvent("onScrollX", () => suggest.hide());

			config.originText = config.text || "";
			config.filter = suggest._settings.id;

			master._destroy_with_me.push(suggest);
		}
		config.css = (config.css||"") + " webix_ss_excel_filter";
		return "<span class='webix_excel_filter webix_icon wxi-filter'></span>" + config.originText;
	},
	_get_position:function(node, popup){
		const off = offset(node);
		return {
			x: (off.x + off.width - popup.$width),
			y: (off.y + off.height)
		};
	},
	_mark_column:function(value, node){
		if (value.includes || (value.condition && value.condition.filter))
			addCss(node, "webix_ss_filter_active", true);
		else removeCss(node, "webix_ss_filter_active");
	},
	_get_filter:function(node){
		const popup = $$(node.$webix);
		return popup ? popup.getBody() : null;
	},
	_get_data:function(master, config){
		let data;

		if (config.options){
			data = master._collectValues.call(config.options, "id", "value");
		} else
			data = master.collectValues(config.columnId, config.collect);

		return data;
	}
};

datafilter.serverExcelFilter = extend({
	$server:true
}, datafilter.excelFilter);

datafilter.richSelectFilter = {
	getInputNode:function(node){
		return $$(node.$webix) || null;
	},
	getValue:function(node, text){
		var ui = this.getInputNode(node);
		if (text && ui && ui.getText)
			return ui.getText();

		return ui?ui.getValue():"";
	},
	setValue:function(node, value){
		const ui = this.getInputNode(node);
		return ui ? ui.setValue(value) : "";
	},
	compare:function(a,b){
		return a == b;
	},
	refresh:function(master, node, value){
		if (master.$destructed) return;

		let select = $$(value.richselect);

		//IE11 can destory the content of richselect, so recreating
		if (!select.$view.parentNode) {
			let d = create("div", { "class" : "webix_richfilter" });
			d.appendChild(select.$view);
		}

		node.$webix = value.richselect;

		value.compare = value.compare || this.compare;
		value.prepare = value.prepare || this.prepare;
		master.registerFilter(node, value, this);

		const data = datafilter._get_data(master, value);
		let list = select.getPopup().getList();

		//reattaching node back to master container
		node.appendChild(select.$view.parentNode);

		//load data in list, must be after reattaching, as callback of parse can try to operate with innerHTML
		if (list.parse){
			list.clearAll();
			list.parse(data);

			if ((!this.$noEmptyOption && value.emptyOption !== false) || value.emptyOption){
				let emptyOption = { id:"$webix_empty", value: value.emptyOption||"", $empty: true };
				list.add(emptyOption,0);
			}
		}

		//repaint the filter control
		select.render();
		
		//set actual value for the filter
		if (value.value) this.setValue(node, value.value);

		//adjust sizes after full rendering
		delay(select.resize, select);
	},
	render:function(master, config){
		if (!config.richselect){
			var d = create("div", { "class" : "webix_richfilter" });

			var richconfig = {
				container:d,
				view:this.inputtype,
				options:[]
			};

			var inputConfig = extend( this.inputConfig||{}, config.inputConfig||{}, true );
			extend(richconfig, inputConfig);

			if (config.separator)
				richconfig.separator = config.separator;
			if (config.suggest)
				richconfig.suggest = config.suggest;

			var richselect = ui(richconfig);
			richselect.attachEvent("onChange", function(){
				master.filterByAll();
			});
			
			config.richselect = richselect._settings.id;
			master._destroy_with_me.push(richselect);
		}

		config.css = (config.css||"") + " webix_div_filter";
		return " ";
	},
	inputtype:"richselect"
};

datafilter.serverRichSelectFilter = extend({
	$server:true
}, datafilter.richSelectFilter);

datafilter.multiSelectFilter = extend({
	$noEmptyOption: true,
	inputtype:"multiselect",
	prepare:function(value, filter){
		if (!value) return value;
		var hash = {};
		var parts = value.toString().split(filter.separator || ",");
		for (var i = 0; i < parts.length; i++)
			hash[parts[i]] = 1;
		return hash;
	},
	compare:function(a,b){
		return !b || b[a];
	}
}, datafilter.richSelectFilter);

datafilter.serverMultiSelectFilter = extend({
	$server:true,
	_on_change:function(){
		var id = this._comp_id;
		$$(id).filterByAll();
	}
}, datafilter.multiSelectFilter);

datafilter.multiComboFilter = extend({
	inputtype:"multicombo",
	inputConfig:{
		tagMode: false
	}
}, datafilter.multiSelectFilter);

datafilter.serverMultiComboFilter = extend({
	inputtype:"multicombo",
	inputConfig:{
		tagMode: false
	}
}, datafilter.serverMultiSelectFilter);

datafilter.datepickerFilter = extend({
	prepare:function(value){ return value||""; },
	compare:function(a,b){ return a*1 == b*1; },
	inputtype:"datepicker"
}, datafilter.richSelectFilter);


datafilter.columnGroup = {
	getValue:function(node){ return node.innerHTML; },
	setValue:function(){},
	getHelper:function(node, config){
		return {
			open:function(){ config.closed = true; node.onclick(); },
			close:function(){ config.closed = false; node.onclick(); },
			isOpened:function(){ return config.closed; }
		};
	},
	refresh:function(master, node, config){
		node.onclick = function(e){
			stopEvent(e);
			const mark = this.firstChild;
			if (config.closed){
				config.closed = false;
				mark.className = "webix_tree_open";
			} else {
				config.closed = true;
				mark.className = "webix_tree_close";
			}

			delay(function(){
				master.callEvent("onColumnGroupCollapse", [config.columnId, config.batch, !config.closed]);
				master.showColumnBatch(config.batch, !config.closed);
			});
		};

		if (!config.firstRun){
			config.firstRun = true;
			if (config.closed)
				master.showColumnBatch(config.batch, false);
		}
	},
	render:function(master, config){
		return "<div role='button' tabindex='0' aria-label='"+i18n.aria[config.closed?"openGroup":"closeGroup"]+"' class='"+(config.closed?"webix_tree_close":"webix_tree_open")+"'></div>"+(config.groupText||"");
	}
};

datafilter.dateRangeFilter = extend({
	prepare:function(value){
		if (!value.start && !value.end) return "";
		return daterange.api.$prepareValue(value);
	},
	compare:function(a, b){
		return ((!b.start || a>=b.start) && (!b.end || a<=b.end));
	},
	inputtype:"daterangepicker"
}, datafilter.richSelectFilter);

datafilter.serverDateRangeFilter = extend({
	$server:true
}, datafilter.dateRangeFilter);
