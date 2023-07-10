import suggest from "../views/suggest";
import {protoUI, $$} from "../ui/core";
import {delay, _to_array, bind, isArray} from "../webix/helpers";
import i18n from "../webix/i18n";
import {callEvent} from "../webix/customevents";

const api = {
	name:"multisuggest",
	defaults:{
		separator:",",
		type:"layout",
		button:true,
		width:0,
		filter:function(item,value){
			var itemText = this.getItemText(item.id);
			return (itemText.toString().toLowerCase().indexOf(value.toLowerCase())>-1);
		},
		body:{
			rows:[
				{ view:"list", type:"multilist", borderless:true,  autoheight:true, yCount:5, multiselect:"touch", select:true,
					on:{
						onItemClick: function(id){
							var popup = this.getParentView().getParentView();
							delay(function(){
								popup._toggleOption(id);
							});
						}
					}},
				{ view:"button", click:function(){
					var suggest = this.getParentView().getParentView();
					suggest.hide();
					delay(function(){
						callEvent("onEditEnd",[]);
					});
				}}
			]
		}
	},

	_toggleOption: function(id, ev, all){
		var value = this.getValue();
		var values = all || _to_array(value?this.getValue().split(this._settings.separator):[]);
		var master = $$(this._settings.master);
		
		if(!all) {
			if(values.find(id)<0)
				values.push(id);
			else
				values.remove(id);
		}

		var data = values.join(this._settings.separator);
		var text = this.setValue(values).join(this._settings.separator);
		if(master)
			master.setValue(data, "user");
		else if (this._last_input_target)
			this._last_input_target.value = text;

		this.callEvent("onValueSuggest", [{id:data, text:text}]);

		if(ev){ //only for clicks in checksuggest
			var checkbox = this.getList().getItemNode(id).getElementsByTagName("SPAN");
			if(checkbox && checkbox.length) checkbox[0].focus();
		}
	},
	_get_extendable_cell:function(obj){
		return obj.rows[0];
	},
	_set_on_popup_click:function(){
		var button = this.getButton();
		var text = (this._settings.button?(this._settings.buttonText || i18n.combo.select):0);
		if(button){
			if(text){
				button._settings.value = text;
				button.refresh();
			}
			else
				button.hide();
		}
		if (this._settings.selectAll)
			return this.getBody().getChildViews()[0].show();

		var list = this.getList();
		//for standalone suggests we need to have a normal show/hide logic
		//use a wrapper function, so it can later be cleared in multicombo
		list.data.attachEvent("onAfterFilter", bind(function(){
			return this._suggest_after_filter();
		}, this));
		list.data.attachEvent("onStoreLoad", bind(function(){
			return this._suggest_after_filter();
		}, this));
	},
	_show_selection:function(){
		const list = this.getList();
		let value = this.getMasterValue();

		if (value){
			value = value.toString().split(this.config.separator);
			if (value[0]){
				for (let i=0; i<value.length; i++){
					if (list.exists(value[i]))
						list.select(value[i], true);
				}
			}
		}
	},
	getButton:function(){
		return this.getBody().getChildViews()[1];
	},
	getList:function(){
		return this.getBody().getChildViews()[0];
	},
	setValue:function(value){
		const text = [];
		const list = this.getList();

		list.unselect();
		if (value){
			if (!isArray(value))
				value = value.toString().split(this.config.separator);

			if (value[0]){
				for (let i=0; i<value.length; i++){
					if (list.exists(value[i])){
						list.select(value[i], true);
						text.push(this.getItemText(value[i]));
					}
				}
			}
		}

		this._settings.value = value?value.join(this.config.separator):"";
		return text;
	},
	getValue:function(){
		return this._settings.value;
	}
};


const view = protoUI(api,  suggest.view);
export default {api, view};