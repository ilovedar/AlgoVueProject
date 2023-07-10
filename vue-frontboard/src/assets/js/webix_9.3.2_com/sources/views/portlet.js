import layout from "../views/layout";
import {create, remove, addCss, removeCss, offset, pos as getPos} from "../webix/html";
import {protoUI, ui, $$} from "../ui/core";
import {isArray, delay} from "../webix/helpers";
import {_each} from "../ui/helpers";
import {callEvent} from "../webix/customevents";
import DragControl from "../core/dragcontrol";
import Touch from "../core/touch";

import state from "../core/state";


const api = {
	name:"portlet",
	defaults:{
		layoutType:"wide",
		icon:"wxi-drag",
	},
	$longTouchLimit: true,
	$init:function(config){
		this._viewobj.style.position = "relative";

		if (config.header && config.body)
			config.body = [ { template:config.header, type:"header" }, config.body ];

		this.attachEvent("onDestruct", function(){
			this._markerbox = null;
		});
		this.$ready.push(this._init_drag_area);
	},
	_refreshChildScrolls: function(source){
		_each(source, function(view){
			if (view._restore_scroll_state)
				view._restore_scroll_state();
		});
	},
	_init_drag_area:function(){
		const childs = this.getChildViews();
		if (childs.length > 1)
			DragControl.addDrag(childs[0].$view, this);
		else if (this._settings.icon){
			const dragIcon = create("div", { "class":"portlet_drag" }, "<span class='webix_icon "+this._settings.icon+"'></span>");
			this._viewobj.appendChild(dragIcon);
			DragControl.addDrag(dragIcon, this);
		} else {
			DragControl.addDrag(this.$view, this);
		}
	},
	body_setter:function(value){
		return this.rows_setter(isArray(value) ? value : [value]);
	},
	markDropArea:function(target, mode){
		if (!target)
			return remove(this._markerbox);

		if (!this._markerbox)
			this._markerbox = create("div", null, "&nbsp;");

		if (["left", "right", "top", "bottom"].indexOf(mode) === -1) mode = "";
		this._markerbox.className = "portlet_marker" + mode;

		target = $$(target);
		target.$view.appendChild(this._markerbox);
	},
	movePortlet:function(target, mode){
		let parent = target.getParentView();
		const source = this.getParentView();

		let tindex = parent.index(target);
		const sindex = source.index(this);

		if (!callEvent("onBeforePortletMove", [source, parent, this, target, mode])) return;

		state._freeze_resize = true;

		let shift = (source != parent ? 1 : 0);
		const isv = parent._vertical_orientation;		
		if (mode == "top" || mode == "bottom"){
			if (isv !== 1){
				parent = ui({ type:target._settings.layoutType, rows:[] }, parent, tindex+shift);
				ui(target, parent, 0);
				tindex = 0; shift = 1;
			}
			if (mode == "bottom") shift += 1;
		} else if (mode == "left" || mode == "right"){
			if (isv !== 0){
				parent = ui({ type:target._settings.layoutType, cols:[] }, parent, tindex+shift);
				ui(target, parent, 0);
				tindex = 0; shift = 1;
			}
			if (mode == "right") shift += 1;
		}

		if (sindex < tindex) shift -= 1;
		ui(this, parent, tindex+shift);

		if (mode == "replace") ui(target, source, sindex);
		this._removeEmptySource(source);

		state._freeze_resize = false;

		target.resize();
		if (!source.$destructed){
			source.resize();
			this._refreshChildScrolls(source);
		}
		callEvent("onAfterPortletMove", [source, parent, this, target, mode]);
	},
	_removeEmptySource:function(view){
		let childview, maxcount = 0;

		while (view.getChildViews().length <= maxcount){
			childview = view;
			view = view.getParentView();
			maxcount = 1;
		}

		if (childview)
			view.removeView(childview);
	},
	$drag:function(object){
		addCss(this._viewobj, "portlet_in_drag");
		DragControl._drag_context = {source:object, from:object};

		// hide suggests after starting drag
		callEvent("onClick", []);

		if (Touch._start_context)		//prevent inner scroll
			delay(function(){ Touch._start_context = null; });

		return this._viewobj.innerHTML;
	},
	$dragDestroy:function(target, html){
		removeCss(this._viewobj, "portlet_in_drag");
		remove(html);

		if (this._portlet_drop_target){
			this.movePortlet(this._portlet_drop_target, this._portlet_drop_mode);
			this._portlet_drop_target = this._portlet_drop_mode = null;
			// remove marker
			this.markDropArea();
		}
	},
	_getDragItemPos: function(){
		return offset(this.$view);
	},
	$dragPos: function(pos, e){
		const evPos = getPos(e);

		const top = document.body.scrollTop || document.documentElement.scrollTop || 0;
		const left = document.body.scrollLeft ||  document.documentElement.scrollLeft || 0;

		// elementFromPoint need to be corrected on scroll value
		const node = document.elementFromPoint(evPos.x-left, evPos.y-top);
		const view = node ? $$(node) : null;

		let target = this._portlet_drop_target = this._getPortletTarget(view);
		let mode = this._portlet_drop_mode = this._getPortletMode(this._portlet_drop_target, e);

		if (target == this || (target && !callEvent("onPortletDrag", [this, target, mode])))
			target = mode = this._portlet_drop_target = this._portlet_drop_mode = null;

		this.markDropArea(target, mode);

		const context = DragControl._drag_context;
		pos.y += context.y_offset;
		pos.x += context.x_offset;

		DragControl._skip = true;
	},
	_getPortletMode:function(view, ev){
		let drop = "";
		let mode = "";

		if (view && ev){
			const box = offset(view.$view);
			const pos = getPos(ev);
			const erx = (pos.x-box.x) - box.width/2;
			const ery = (pos.y-box.y) - box.height/2;

			mode = view._settings.mode;
			if (!mode)
				mode = Math.abs(erx)*(box.height/box.width) > Math.abs(ery) ? "cols" : "rows";

			if (mode == "cols"){
				drop = erx >=0 ? "right" :"left";
			} else if (mode == "rows"){
				drop = ery >=0 ? "bottom" : "top";
			}
		}

		return drop || mode;
	},
	_getPortletTarget:function(view){
		while (view){
			if (view.movePortlet)
				return view;
			else
				view = view.getParentView();
		}
	}
};


const view = protoUI(api,  layout.view);
export default {api, view};