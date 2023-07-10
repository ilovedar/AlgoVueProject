import layout from "../views/layout";
import {protoUI} from "../ui/core";
import AtomDataLoader from "../core/atomdataloader";
import i18n from "../webix/i18n";
import {assert} from "../webix/debug";
import {copy, extend, isUndefined} from "../webix/helpers";
import filters from "../webix/filters";

const api = {
	name: "filter",
	$init:function(config){
		config.mode = config.mode || "number";

		this._settings.conditions = config.conditions;
		this._settings.mode = this.mode_setter(config.mode);
		delete config.mode;

		config.rows = this._configFilter(config);

		this.$ready.push(this._afterInit);
	},
	$onLoad:function(data, driver){
		return this._fillList(data, driver);
	},
	_fillList:function(data, driver){
		const list = this._list || this.queryView("list");
		list.data.driver = driver;

		let listData = [];
		let unique = {};

		//check if datastore
		if (typeof data.serialize == "function"){
			if (data.data && data.data.name == "DataStore")
				data = data.data;
			data.each(item => this._checkItem(item, listData, unique));
		} else
			driver.getRecords(data).forEach(item => this._checkItem(item, listData, unique));

		list.clearAll();
		list.parse(listData);

		//on first init widget is not ready, parsing is enough
		if(this._list){
			const includes = this._settings.value.includes;

			this._filterList();
			this._checkListData(includes);
		}
		return true;
	},
	_checkItem:function(item, listData, unique){
		const value = item[this._settings.field];
		if(!isUndefined(value) && !unique[value]){
			unique[value] = true;
			listData.push(copy(item));
		}
	},
	_afterInit:function(){
		this._after_init_config = true;
		this._list = this.queryView("list");
		this._toggle = this.queryView("toggle");
		this._select = this.queryView("richselect");
		this._input = this.queryView({ batch: this._visibleBatch });

		//provide data-like API
		this._list.data.provideApi(this, true);
		this._list.data.attachEvent("onSyncApply", () => this._fillList(this._list, this._list.data.driver));

		this.setValue(this._settings.value, "auto");
		delete this._after_init_config;
	},
	mode_setter:function(value){
		assert(this._content[value], "Unknown filter mode");
		this._conditions = this._getConditions(this._settings.conditions, value);

		// initialization of widget
		if (!this._input){
			this._visibleBatch = this._conditions[0].batch;
		} else {
			const list = this._select.getList();

			list.clearAll();
			list.parse(this._conditions);

			this._select.config.value = "";
			this._select.setValue(this._conditions[0].id, "auto");
		}
		return value;
	},
	_configFilter:function(config){
		const inputs = this._getInputs(config.inputs);

		const filter = {
			visibleBatch: this._visibleBatch,
			cols:[
				{
					view: "richselect",
					value: this._conditions[0].id,
					width: 160,
					options: this._conditions,
					on:{
						onChange: (id, o, c) => {
							this._changeInput(id);
							this.applyFilter(c);
						}
					}
				},
				...inputs
			]
		};

		const selectAll = {
			view:"toggle",
			batch:"includes",
			onLabel:i18n.combo.unselectAll,
			offLabel:i18n.combo.selectAll,
			value:true,
			on:{
				onItemClick: () => {
					this._selectAll(this._toggle.getValue());
					this.callEvent("onChange", ["user"]);
				}
			}
		};

		const list = {
			view:"list",
			batch:"includes",
			css:"webix_multilist",
			autoheight:true,
			borderless:true,
			yCount:5,
			type:"checklist",
			template: config.template || `#${config.field}#`,
			on:{
				onItemClick: (id) => {
					const item = this._list.getItem(id);
					this._list.updateItem(id, { $checked: !item.$checked});

					this._settings.value.includes = this._getIncludes();
					this._setSubviewValue(this._toggle, this._is_all_selected());

					this.callEvent("onChange", ["user"]);
				}
			}
		};

		return [
			filter,
			selectAll,
			list
		];
	},
	_getInputs:function(inputs){
		inputs = inputs || Object.keys(this._inputs);

		for (let i=0; i<inputs.length; i++)
			if (this._inputs[ inputs[i] ]){
				inputs[i] = copy(this._inputs[ inputs[i] ]);
				if (inputs[i].on){
					const on = inputs[i].on;
					for (let handler in on)
						on[handler] = () => this.applyFilter("user");
				}
			} else
				assert(inputs[i] && inputs[i].batch, "Filter: incorrect input configuration");

		return inputs;
	},
	_inputs:{
		text: { view: "text", batch:"text", on:{ onTimedKeyPress:true }},
		datepicker: { view:"datepicker", batch:"datepicker", on:{ onChange:true }},
		daterangepicker: { view:"daterangepicker", batch:"daterangepicker", on:{ onChange:true }},
		none: { view:"spacer", batch:"none"}
	},
	_options:{
		number:filters.number,
		text:filters.text,
		date:{
			greater: { batch:"datepicker", handler:filters.date.greater},
			less: { batch:"datepicker", handler: filters.date.less},
			greaterOrEqual: { batch:"datepicker", handler: filters.date.greaterOrEqual},
			lessOrEqual: { batch:"datepicker", handler: filters.date.lessOrEqual},
			equal: { batch:"datepicker", handler:filters.date.equal},
			notEqual: { batch:"datepicker", handler: filters.date.notEqual},

			between: { batch: "daterangepicker", handler: filters.date.between},
			notBetween: { batch: "daterangepicker", handler: filters.date.notBetween}
		}
	},
	_content:{
		number: ["greater", "less", "greaterOrEqual", "lessOrEqual", "equal", "notEqual", "contains", "notContains"],
		text: ["contains", "notContains", "equal", "notEqual", "beginsWith", "notBeginsWith", "endsWith", "notEndsWith"],
		date: ["greater", "less", "greaterOrEqual", "lessOrEqual", "equal", "notEqual", "between", "notBetween"]
	},
	_getConditions:function(conditions, mode){
		conditions = conditions || this._content[mode];

		const result = [];
		for (let i=0; i<conditions.length; i++){
			const option = this._getSingleOption(conditions[i], mode);

			assert(option, "Filter: unknown option id");
			result.push(option);
		}

		return result;
	},
	_getSingleOption:function(option, mode){
		if (option && typeof option.handler === "function")
			return option;

		if (this._options[mode][option]){
			const config = { id: option, value: i18n.filter[option] };
			const extra = (typeof this._options[mode][option] === "function")
				? { batch:"text", handler: this._options[mode][option] }
				: this._options[mode][option];

			return extend(config, extra, true);
		}

		return null;
	},
	_getFilterConfig:function(type){
		for(let i = 0; i < this._conditions.length; i++)
			if(this._conditions[i].id == type)
				return this._conditions[i];
	},
	_getIncludes:function(){
		const includes = [];

		this._list.data.each(obj => {
			if(obj.$checked)
				includes.push(obj[this._settings.field]);
		});

		return includes.length == this._list.count() ? null : includes;
	},
	getValue:function(){
		return {
			condition: {
				filter: this._input.getValue ? (this._input.getValue() || "") : null,
				type: this._select.getValue()
			},
			includes: this._getIncludes()
		};
	},
	_is_all_selected:function(){
		//find method searchs through all data
		const order = this._list.data.order;
		for(let i = 0; i < order.length; i++)
			if(!this.getItem(order[i]).$checked)
				return false;
		return true;
	},
	$compareValue:function(ov, v){
		if (!ov || ov.condition.type !== v.condition.type || ov.condition.filter !== v.condition.filter)
			return false;
		if (ov.includes && v.includes){
			if (ov.includes.length !== v.includes.length)
				return false;

			const hash = {};
			for (let i=0; i<ov.includes.length; i++)
				hash[ov.includes[i]] = true;

			for (let i=0; i<v.includes.length; i++)
				if (!hash[v.includes[i]]) return false;

			return true;
		}
		return ov.includes === v.includes;
	},
	setValue:function(value, config){
		value = this.$prepareValue(value);

		if (this.$compareValue(this._settings.value, value))
			return;

		const condition = value.condition;
		const includes = value.includes;

		this._changeInput(condition.type);

		this._setSubviewValue(this._input, condition.filter);
		this._setSubviewValue(this._select, condition.type);

		this._filterList();

		this._checkListData(includes);
		this._setSubviewValue(this._toggle, this._is_all_selected());

		this._settings.value = value;
		if(!this._after_init_config) this.callEvent("onChange", [config]);
	},
	_checkListData:function(includes){
		const field = this._settings.field;
		const isDate = this._settings.mode == "date";

		if (includes && isDate) includes = includes.map(a => a && a.valueOf());

		this._list.data.each(obj => {
			const value = obj[field];

			obj.$checked = (!includes || includes.indexOf(isDate ? value && value.valueOf() : value) != -1);
		});
		this._list.refresh();
	},
	_setSubviewValue:function(view, val){
		if (view.setValue){
			view.blockEvent();
			view.setValue(val);
			view.unblockEvent();
		}
	},
	$prepareValue:function(value){
		value = value || {};

		value.condition = value.condition || {
			filter: "",
			type: this._conditions[0].id
		};
		value.includes = value.includes || null;

		return value;
	},
	_filterList:function(){
		const filter = this._input.getValue ? (this._input.getValue() || "") : null;

		if (filter === "")
			this._list.filter();
		else {
			const field = this._settings.field;
			const handler = this._getFilterConfig( this._select.getValue() ).handler;

			this._list.filter( item => handler(item[field], filter) );
		}
		this.showBatch("includes", !!this._list.count());
	},
	_changeInput:function(type){
		const config = this._getFilterConfig(type);
		const batch = config.batch;

		if (batch != this._visibleBatch){
			this._visibleBatch = batch;

			this._input = this.queryView({ batch: batch });
			if (this._input.setValue)
				this._input.setValue("", "auto");

			this._input.getParentView().showBatch(batch);
		}
	},
	applyFilter:function(config){
		this._filterList();

		this._setSubviewValue(this._toggle, true);
		this._selectAll(true);

		this.callEvent("onChange", [config]);
	},
	_selectAll:function(v){
		this._list.data.each(obj => {
			obj.$checked = v;
		});
		this._list.refresh();
		this._settings.value = this.getValue();
	},
	getFilterFunction:function(){
		const field = this._settings.field;
		const isDate = this._settings.mode == "date";
		let { includes, condition } = this.getValue();
		const handler = this._getFilterConfig(condition.type).handler;

		if (includes && isDate)
			includes = includes.map(a => a && a.valueOf());

		return function(obj){
			const value = obj[field];
			if (includes){
				return includes.indexOf(isDate ? value && value.valueOf() : value) != -1;
			} else {
				return condition.filter === "" || handler(value, condition.filter);
			}
		};
	}
};

const view = protoUI(api, AtomDataLoader, layout.view);
export default {api, view};