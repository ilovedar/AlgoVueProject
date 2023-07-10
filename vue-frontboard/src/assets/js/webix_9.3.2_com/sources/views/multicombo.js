import richselect from "../views/richselect";
import button from "../views/button";
import {protoUI, ui, $$} from "../ui/core";
import UIManager from "../core/uimanager";
import {$active} from "../webix/skin";
import {_to_array, copy, isArray, extend, uid, delay, isUndefined} from "../webix/helpers";
import popup from "../views/popup";
import base from "../views/view";
import i18n from "../webix/i18n";
import {create} from "../webix/html";
import {_event} from "../webix/htmlevents";
import template from "../webix/template";


const api = {
	name:"multicombo",
	$cssName:"text",
	defaults:{
		keepText: false,
		separator: ",",
		stringResult: true,
		icon: false,
		iconWidth: 0,
		tagMode: true,
		tagTemplate: function(values){
			return (values.length?values.length+" item(s)":"");
		},
		template:function(obj,common){
			return common._render_value_block(obj, common);
		}
	},
	$init:function(){
		this.$view.className += " webix_multicombo";

		this.attachEvent("onAfterRender", function(){
			this._last_size = null;
		});
		// prevent scroll to input
		_event(this.$view, "scroll", () => { this.$view["scrollTop"] = 0; });
	},
	$skin:function(){
		richselect.api.$skin.call(this);

		this._inputHeight = $active.inputHeight;
	},
	on_click: {
		"webix_multicombo_delete": function(e,view,node){
			if(!this._settings.readonly && node)
				this._removeValue(node.parentNode.getAttribute("optvalue"));
			return false;
		},
		"webix_inp_label": function(e){this._ignoreLabelClick(e);},
		"webix_inp_top_label": function(e){this._ignoreLabelClick(e);}
	},
	$onBlur:function(){
		const input = this.getInputNode();
		let value = input.value;

		//blurring caused by clicks in the suggest list cannot affect new values
		if (value && this._settings.newValues && new Date()-(this.getPopup()._click_stamp||0)>100){
			value = value.trim();
			this._addNewValue(value, "user");
		}

		this._inputValue = input.value = (this._settings.keepText) ? value : "";
		this.$setValue();
	},
	_reset_value:function(){
		const value = this._settings.value||[];
		if (value.length && !this.getPopup().isVisible())
			this.$setValue();
	},
	_removeValue: function(value){
		const values = _to_array(copy(this._settings.value||[]));

		let index;
		if (value && (index = values.find(value)) !== -1){
			values.removeAt(index);
			this.setValue(values, "user");

			const suggest = $$(this.config.suggest);
			if (suggest && suggest._settings.selectAll)
				suggest.getBody()._cells[0].setValue(0, "auto");
		}
	},
	_addValue: function(newValue, config){
		var suggest = $$(this.config.suggest);
		var list = suggest.getList();
		var item = list.getItem(newValue);

		if(item){
			var values = suggest.getValue();
			if(values && typeof values == "string")
				values = values.split(suggest.config.separator);
			values = _to_array(values||[]);
			if(values.find(newValue)<0){
				values.push(newValue);
				suggest.setValue(values, config);
				this.setValue(suggest.getValue(), config);
			}
		}
	},
	_addNewValue: function(value, config){
		const suggest = $$(this.config.suggest);
		const list = suggest.getList();

		value = template.escape( value.trim() );

		let id;
		if (value){
			for (let i in list.data.pull)
				if (suggest.getItemText(i) == value) id = i;

			if (!id) id = list.add({value: value});
			this._addValue(id, config);
		}
	},
	_suggest_config:function(value){
		var isObj = !isArray(value) && typeof value == "object" && !value.name,
			suggest = { view:"checksuggest", separator:this.config.separator, buttonText: this.config.buttonText, button: this.config.button },
			combo = this;
		
		if (isObj){
			extend(suggest, value, true);
		}
		if (!suggest.width && this._settings.optionWidth){
			extend(suggest, {width:this._settings.optionWidth, fitMaster: false}, true);
		}
		suggest.width = suggest.fitMaster || isUndefined(suggest.fitMaster) ? 0 : suggest.width;

		var view = ui(suggest);
		if(!suggest.width)
			view.$customWidth = function(){
				this.config.width = combo._get_input_width(combo._settings);
			};
		view.attachEvent("onBeforeShow",function(node,mode, point){
			if(this._settings.master){
				this.setValue($$(this._settings.master).config.value, "auto");

				if($$(this._settings.master).getInputNode().value || this.isVisible()){
					this.getList().refresh();
					this._dont_unfilter = true;
				}
				else
					this.getList().filter();

				if(node.tagName && node.tagName.toLowerCase() == "input"){
					popup.api.show.apply(this, [node.parentNode,mode, point]);
					return false;
				}
			}

		});

		var list = view.getList();
		if (typeof value == "string")
			list.load(value);
		else if (!isObj)
			list.parse(value);

		//prevent default show-hide logic
		view._suggest_after_filter = function(){
			if (!this._resolve_popup) return true;
			this._resolve_popup = false;

			this.show(combo._getInputDiv());
		};

		return view;
	},
	_render_value_block:function(obj, common){
		var id, input, inputAlign,inputStyle, inputValue, inputWidth,
			height, html, label, list, message, padding, readOnly,  width,
			bottomLabel = "",
			top =  this._settings.labelPosition == "top";

		id = "x"+uid();
		width = common._get_input_width(obj);
		inputAlign = obj.inputAlign || "left";

		height = this._input_height - 2*$active.inputPadding -2;

		inputValue = (this._inputValue||"");
		list = "<ul class='webix_multicombo_listbox' style='line-height:"+height+"px'></ul>";

		inputWidth = Math.min(width,(common._inputWidth||7));

		inputStyle = "width:"+inputWidth+"px;height:"+height+"px;max-width:"+(width-20)+"px";

		readOnly = obj.readonly?" readonly ":"";
		input = "<input id='"+id+"' role='combobox' aria-multiline='true' aria-label='"+template.escape(obj.label)+"' tabindex='0' type='text' class='webix_multicombo_input' "+readOnly+" style='"+inputStyle+"' value='"+inputValue+"'/>";
		html = "<div class='webix_inp_static' onclick='' style='line-height:"+height+"px;width:"+width+"px;text-align:"+inputAlign+";height:auto' >"+list+input +"</div>";

		label = common.$renderLabel(obj,id);

		padding = this._settings.awidth - width - $active.inputPadding*2;
		message = (obj.invalid ? obj.invalidMessage : "") || obj.bottomLabel;
		if (message)
			bottomLabel =  "<div class='webix_inp_bottom_label' style='width:"+width+"px;margin-left:"+Math.max(padding,$active.inputPadding)+"px;'>"+message+"</div>";

		if (top)
			return label+"<div class='webix_el_box' style='width:"+this._settings.awidth+"px; height:auto;'>"+html+bottomLabel+"</div>";
		else
			return "<div class='webix_el_box' style='width:"+this._settings.awidth+"px; height:auto; min-height:"+this._settings.aheight+"px;'>"+label+html+bottomLabel+"</div>";
	},
	_getValueListBox: function(){
		return this._getBox().getElementsByTagName("UL")[0];
	},
	_set_inner_size: function(){
		const popup = this.getPopup();
		if (popup) {
			const textArr = (popup ? popup.setValue(this._settings.value, "auto") : null);
			if (popup._toMultiValue)
				this._settings.value = popup._toMultiValue(this._settings.value);
			let html = "";
			const listbox = this._getValueListBox();
			const text = textArr && textArr.length;
			if (text){
				// 2px border; 6px margin
				const width = this._get_input_width(this._settings) - 2 - 6;
				const height = this._input_height - 2*$active.inputPadding - 2 - 6;
				const values = this._settings.value || [];

				if (this._settings.tagMode) {
					for (let i = 0; i < textArr.length; i++){
						html += this.$renderTag(textArr[i], width, height, values[i]);
					}
				} else {
					html += "<li class='webix_multicombo_tag' style='line-height:"+height+"px;max-width:"+width+"px;'><span class='webix_multicombo_text'>"+this._settings.tagTemplate(values)+"</span></li>";
				}

			}
			listbox.innerHTML = html;
			// reset placeholder
			const inp = this.getInputNode();
			if (this._settings.placeholder) {
				if (text) {
					inp.placeholder = "";
					if (!inp.value && inp.offsetWidth > 20)
						inp.style.width = "20px";
				} else if (!inp.value) {
					inp.placeholder = this._settings.placeholder;
					inp.style.width = this._get_input_width(this._settings)+"px";
				}
			}

			if (!this._settings.tagMode && listbox.firstChild)
				inp.style.width = this._getMultiComboInputWidth() +"px";
		}
		this._resizeToContent();
	},
	$renderTag(text, width, height, value){
		const c = this._settings;
		const content = "<span class='webix_multicombo_text'>"+text+"</span>";
		const remove = c.readonly ? "" : "<span class='webix_multicombo_delete' role='button' aria-label='"+i18n.aria.removeItem+"'></span>";
		return "<li class='webix_multicombo_value"+(c.readonly?" webix_readonly":"")+"' style='line-height:"+height+"px;max-width:"+width+"px;' optvalue='"+template.escape(value)+"'>"+content+remove+"</li>";
	},
	_focusAtEnd: function(input){
		input = input||this.getInputNode();
		if (input){
			const length = input.value.length;
			input.selectionStart = length;
			input.selectionEnd = length;
			input.focus();
		}
	},
	_resizeToContent: function(enter){
		const top = this._settings.labelPosition == "top";
		const inputDiv = this._getInputDiv();
		let inputHeight = Math.max(inputDiv.offsetHeight + 2*$active.inputPadding, this._input_height);

		if (top) inputHeight += this._labelTopHeight;
		inputHeight += this._settings.bottomPadding ||0;

		const sizes = this.$getSize(0,0);
		if(inputHeight != sizes[2]){
			const calcHeight = inputDiv.offsetHeight + (top?this._labelTopHeight:0) + 2*$active.inputPadding;
			const topView = this.getTopParentView();

			clearTimeout(topView._template_resize_timer);
			topView._template_resize_timer = delay(function(){
				if (this.config.height != calcHeight){
					this.config.height = calcHeight;
					this.resize();
				}

				if (UIManager.getFocus() === this){
					if (enter)
						this.getInputNode().select();
					else
						this._focusAtEnd(this.getInputNode());
				}

				const suggest = this.getPopup();
				if (suggest.isVisible())
					suggest.show(this._getInputDiv());

			}, this);
		}
		if (enter)
			this.getInputNode().select();
	},
	_getInputDiv: function(){
		var parentNode = this._getBox();
		var nodes = parentNode.childNodes;
		for(var i=0; i < nodes.length; i++){
			if(nodes[i].className && nodes[i].className.indexOf("webix_inp_static")!=-1)
				return nodes[i];
		}
		return parentNode;
	},
	getInputNode: function(){
		return this._dataobj.getElementsByTagName("INPUT")[0];
	},
	$compareValue:function(oldvalue, value){
		return oldvalue.toString() == value.toString();
	},
	$prepareValue:function(value){
		value = value || [];
		if (typeof value === "string")
			return value.split(this._settings.separator);
		return isArray(value) ? value : [ button.api.$prepareValue.call(this, value) ];
	},
	$setValue:function(){
		if (this._rendered_input)
			this._set_inner_size();
	},
	getValue:function(config){
		if(typeof config == "object" && config.options)
			return this._getSelectedOptions();

		const value = this._settings.value||[];

		if (this._settings.stringResult)
			return value.join(this._settings.separator);
		return value;
	},
	getText:function(){
		var value = this._settings.value||[];
		if(!value.length) return "";

		var text = [];
		for(var i = 0; i<value.length; i++)
			text.push(this.getPopup().getItemText(value[i]));
		return text.join(this._settings.separator);
	},
	_getSelectedOptions: function(){
		var i, item, popup,
			options = [],
			value = this._settings.value||[];

		if (!value.length) return value;

		popup = this.getPopup();

		for(i = 0; i < value.length; i++){
			item = popup.getList().getItem(value[i]) || (popup._valueHistory?popup._valueHistory[value[i]]:null);
			if(item)
				options.push(item);
		}

		return options;
	},
	$setSize:function(x,y){
		var config = this._settings;
		if(base.api.$setSize.call(this,x,y)){
			if (!x || !y) return;
			if (config.labelPosition == "top"){
				config.labelWidth = 0;
			}
			this.render();
		}
	},
	$render:function(){},
	_calcInputWidth: function(value){
		const tmp = create("span", {type:"text", style:"visibility:visible; white-space:pre-wrap; position:absolute; top:-9999px;"});
		tmp.className = "webix_el_text";
		tmp.innerHTML = `<span class="webix_multicombo_input" style="margin:0;">${value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</span>`;

		document.body.appendChild(tmp);
		const width = tmp.offsetWidth+1;

		document.body.removeChild(tmp);
		return width;
	},
	_getMultiComboInputWidth: function(){
		const listbox = this._getValueListBox();
		const width = listbox.offsetWidth - (listbox.firstChild.offsetWidth + 1);
		return (width <= 25)? listbox.offsetWidth-12: width-15;
	},
	_getLastInputValue:function(value, config){
		const newValues = value.split(this._settings.separator);
		const suggest = this.getPopup();
		let last = "";

		for (let i=0; i<newValues.length; i++){
			let nValue = newValues[i].trim();
			if (nValue){
				last = nValue;
				// add new values
				if (this._settings.newValues){
					this._addNewValue(nValue, config);
				}
				// or select existing
				else {
					const id = suggest.getItemId(nValue);
					if (id) this._addValue(id, config);
				}
			}
		}
		return last;
	},
	_init_onchange:function(){
		// input focus and focus styling
		_event(this._getBox(),"click",function(e){
			const input = this.getInputNode();
			if (input.contains(e.target))
				input.focus();
			else
				this._focusAtEnd(input);
		},{bind:this});

		_event(this.getInputNode(),"focus",function(){
			if(this._getBox().className.indexOf("webix_focused") == -1)
				this._getBox().className += " webix_focused";

		},{bind:this});

		_event(this.getInputNode(),"blur",function(){
			this._getBox().className = this._getBox().className.replace(" webix_focused","");
		},{bind:this});

		_event(this.getInputNode(),"input",function(){
			const input = this.getInputNode();
			let enter = false;

			// update input value
			if ((this._settings.tagMode &&  input.value.indexOf(this._settings.separator) > -1)){
				const nValue = this._getLastInputValue(input.value, "user");
				this._inputValue = input.value = (this._settings.keepText) ? nValue : "";
				enter = this._settings.keepText;
			}

			// to show placeholder
			let calcWidth, width;
			const value = this._settings.value||[];
			if (this._settings.placeholder && !input.value && !value.length)
				width = this._get_input_width(this._settings);
			else {
				width = calcWidth = this._calcInputWidth(input.value);
				if(!this._settings.tagMode && this._getValueListBox().firstChild)
					width = this._getMultiComboInputWidth();
			}

			// resize
			input.style.width = width + "px";

			if (enter || calcWidth != this._inputWidth){
				this._inputWidth = calcWidth||width;

				// save value before possible rendering
				this._inputValue = input.value;
				this._resizeToContent(enter);
			}

		},{bind:this});

		_event(this.getInputNode(), "keydown", function(e){
			const input = this.getInputNode();
			const suggest = this.getPopup();

			const code = e.which || e.keyCode;

			// remove the last value on Backspace click
			const node = this._getValueListBox().lastChild;
			if (code == 8 && !this._settings.readonly && node){
				if(!input.value && ((new Date()).valueOf() - (this._backspaceTime||0) > 100)){
					this._removeValue(node.getAttribute("optvalue"));
				} else {
					this._backspaceTime = (new Date()).valueOf();
				}
			}

			if (code == 13 || code == 9){
				let nValue = input.value;
				if (!suggest.getList().getSelectedId()){
					nValue = this._getLastInputValue(input.value, "user");
				}
				this._inputValue = input.value = (this._settings.keepText) ? nValue : "";

				const value = this._settings.value||[];
				if (code == 13 && !input.value && !value.length){
					suggest.getList().filter();

					// correct input width to show placeholder
					if (this._settings.placeholder)
						input.style.width = this._get_input_width(this._settings) + "px";
				}
				this._resizeToContent(code == 13);
			}
		},{bind:this});

		$$(this._settings.suggest).linkInput(this);
	}
};


const view = protoUI(api,  richselect.view);
export default {api, view};