import {pos as getPos, create, remove, removeCss, preventEvent, addCss} from "../webix/html";
import state from "../core/state";
import {$$} from "../ui/core";
import {delay} from "../webix/helpers";

import env from "../webix/env";
import {$active} from "../webix/skin";
import {_event, event, eventRemove} from "../webix/htmlevents";
import {attachEvent} from "../webix/customevents";


const CustomScroll = {
	scrollStep: 40,
	init:function(){
		if (!env.scrollSize || env.$customScroll)
			return !!env.$customScroll;

		this.scrollStep = $active.rowHeight;
		env.$customScroll = true;
		env.scrollSize = 0;

		state.destructors.push({
			obj:{
				destructor:function(){
					this._last_active_node = null;
				}
			}
		});
		attachEvent("onReconstruct", CustomScroll._on_reconstruct);
		attachEvent("onResize", CustomScroll._on_reconstruct);

		//adjusts scroll after view repainting
		//for example, opening a branch in the tree
		//it will be better to handle onAfterRender of the related view
		attachEvent("onClick", CustomScroll._on_reconstruct);
		return env.$customScroll;
	},
	resize:function(){
		this._on_reconstruct();
	},
	_enable_datatable:function(view){
		view._body._custom_scroll_view = view._settings.id;
		view.attachEvent("onAfterRender", function(){
			var scroll = CustomScroll._get_datatable_sizes(this);
			var y = Math.max(scroll.dy - scroll.py, 0);
			var x = Math.max(scroll.dx - scroll.px, 0);

			if (this._y_scroll && this._scrollTop > y){
				this._y_scroll.scrollTo(y);
			}
			else if (this._x_scroll && this._scrollLeft > x){
				this._x_scroll.scrollTo(x);
			}

			if (CustomScroll._last_active_node == this._body)
				CustomScroll._on_reconstruct();
		});

		_event(view._body, "pointerover", 	CustomScroll._mouse_in 	);
		_event(view._body, "pointerout", 	CustomScroll._mouse_out	);
		if (env.touch){
			view.attachEvent("onTouchStart", () => CustomScroll._touch_start(view._body));
			if (view.config.prerender)
				view.attachEvent("onSyncScroll", () => CustomScroll._update_scroll(view._body));
		}
	},
	enable:function(view, mode){
		if (view.mapCells)
			return this._enable_datatable(view);

		var node = view;
		if (view._dataobj)
			node = view._dataobj.parentNode;

		node._custom_scroll_mode = mode||"xy";
		node.className += " webix_custom_scroll";

		_event(node, "pointerover", CustomScroll._mouse_in 	);
		_event(node, "pointerout", 	CustomScroll._mouse_out	);
		_event(node, "wheel", CustomScroll._mouse_wheel, { passive:false });
		if (env.touch)
			_event(node, "scroll", () => CustomScroll._update_scroll(node));

		this._set_additional_handlers(view);
	},
	_on_reconstruct:function(){
		const last = CustomScroll._last_active_node;

		if (last && last._custom_scroll_size){
			const webixView = $$(last);
			const scrolls = webixView ? webixView.queryView(view => {
				const node = CustomScroll._getViewNode(view);
				return node && node._custom_scroll_size;
			}, "all").map(view => CustomScroll._getViewNode(view)) : [];

			scrolls.push(last);

			scrolls.forEach(node => {
				CustomScroll._mouse_out_timed.call(node);
				CustomScroll._mouse_in.call(node, false);
			});
		}
	},
	_getViewNode(view){
		return view._body || (view._dataobj && view._dataobj.parentNode) || view.$view;
	},
	_mouse_in:function(e){
		if (e && e.pointerType !== "mouse") return;

		CustomScroll._last_active_node = this;
		clearTimeout(this._mouse_out_timer);

		if (this.className.indexOf("webix_modalbox_inside") != -1) return;
		if (this._custom_scroll_size || CustomScroll._active_drag_area) return;

		var view = $$(this);
		if (view && !view.isEnabled()) return;

		var sizes;
		if (this._custom_scroll_view){
			//ger related view
			view = $$(this._custom_scroll_view);
			//if view was removed, we need not scroll anymore
			if (!view) return;
			sizes = CustomScroll._get_datatable_sizes(view);
		} else {
			sizes = {
				dx:this.scrollWidth,
				dy:this.scrollHeight,
				px:this.clientWidth,
				py:this.clientHeight
			};
			sizes._scroll_x = sizes.dx > sizes.px && this._custom_scroll_mode.indexOf("x") != -1;
			sizes._scroll_y = sizes.dy > sizes.py && this._custom_scroll_mode.indexOf("y") != -1;
		}

		this._custom_scroll_size = sizes;
		if (sizes._scroll_x){
			sizes._scroll_x_node = CustomScroll._create_scroll(this, "x", sizes.dx, sizes.px, "width", "height");
			sizes._sx = (sizes.px - sizes._scroll_x_node.offsetWidth - 4);
			sizes._vx = sizes.dx - sizes.px;
			if(CustomScroll.trackBar)
				sizes._bar_x = CustomScroll._create_bar(this,"x");
		}
		if (sizes._scroll_y){
			sizes._scroll_y_node = CustomScroll._create_scroll(this, "y", sizes.dy, sizes.py, "height", "width");
			sizes._sy = (sizes.py - sizes._scroll_y_node.offsetHeight - 4);
			sizes._vy = sizes.dy - sizes.py;

			if(CustomScroll.trackBar)
				sizes._bar_y = CustomScroll._create_bar(this,"y");
		}

		CustomScroll._update_scroll(this);
	},
	_create_bar: function(node, mode){
		var bar = create("DIV", {
			/*@attr*/"webixignore":"1",
			"class":"webix_c_scroll_bar_"+mode
		},"");

		node.appendChild(bar);
		return bar;
	},
	_adjust_scroll:function(node, old, pos){
		var config = node._custom_scroll_size;
		var view = node._custom_scroll_view;
		if (view) view = $$(view);

		if (config._scroll_x_node == node._scroll_drag_enabled){
			let next = (pos.x - old.x)*config._vx/config._sx;
			if (view)
				view._x_scroll.scrollTo(view._scrollLeft+next);
			else
				CustomScroll._set_scroll_value(node, "scrollLeft", next);
		}
		if (config._scroll_y_node == node._scroll_drag_enabled){
			let next = (pos.y - old.y)*config._vy/config._sy;
			if (view)
				view._y_scroll.scrollTo(view._scrollTop+next);
			else
				CustomScroll._set_scroll_value(node, "scrollTop", next);
		}

		node._scroll_drag_pos = pos;
		CustomScroll._update_scroll(node);
	},
	_get_datatable_sizes:function(view){
		var sizes = {};
		if (view._x_scroll && view._settings.scrollX){
			sizes.dx = view._x_scroll.getSize();
			sizes.px = view._x_scroll._last_set_size || 1;
			sizes._scroll_x = sizes.dx - sizes.px > 1;
		}
		if (view._y_scroll && view._settings.scrollY){
			sizes.dy = view._y_scroll.getSize();
			sizes.py = view._y_scroll._last_set_size || 1;
			sizes._scroll_y = sizes.dy - sizes.py > 1;
		}
		return sizes;
	},
	_mouse_out:function(e){
		if (e && e.pointerType !== "mouse") return;

		clearTimeout(this._mouse_out_timer);
		this._mouse_out_timer = delay(CustomScroll._mouse_out_timed, this, [], 200);
	},
	_removeScroll:function(scroll){
		if (scroll){
			remove(scroll);
			eventRemove(scroll._webix_event_sc1);
			eventRemove(scroll._webix_event_sc2);
		}
	},
	_mouse_out_timed:function(){
		if (this._custom_scroll_size){
			if (this._scroll_drag_enabled){
				this._scroll_drag_released = true;
				return;
			}

			const sizes = this._custom_scroll_size;
			CustomScroll._removeScroll(sizes._scroll_x_node);
			CustomScroll._removeScroll(sizes._scroll_y_node);

			if (sizes._bar_x) remove(sizes._bar_x);
			if (sizes._bar_y) remove(sizes._bar_y);

			this._custom_scroll_size = null;
		}
	},
	_mouse_wheel:function(e){
		if (e.ctrlKey) return false;

		let toblock = false;
		const step = e.deltaMode === 0 ? 30 : 1;
		const sizes = this._custom_scroll_size;
		if (sizes){
			const forceX = !sizes._scroll_y || e.shiftKey;
			if ((e.deltaX && Math.abs(e.deltaX) > Math.abs(e.deltaY)) || forceX){
				const x_dir = (forceX ? e.deltaY : e.deltaX) / step;
				//x-scroll
				if (sizes._scroll_x_node)
					toblock = CustomScroll._set_scroll_value(this, "scrollLeft", x_dir*CustomScroll.scrollStep);
			} else {
				//y-scroll
				if (sizes._scroll_y_node)
					//lesser flickering of scroll in IE
					//also prevent scrolling outside of borders because of scroll-html-elements
					toblock = CustomScroll._set_scroll_value(this, "scrollTop", (e.deltaY/step)*CustomScroll.scrollStep);
			}
		}

		CustomScroll._update_scroll(this);
		if (toblock !== false)
			return preventEvent(e);
	},
	_set_scroll_value:function(node, pose, value){
		const sizes = node._custom_scroll_size;
		const max_scroll = (pose == "scrollLeft") ? (sizes.dx - sizes.px) : (sizes.dy - sizes.py);
		const now = node[pose];

		if (now + value > max_scroll)
			value = max_scroll - now;
		if (!value || (now + value < 0 && now === 0))
			return false;

		if (env.isIE){
			CustomScroll._update_scroll(node, pose, value + now);
			node[pose] += value;
		} else
			node[pose] += value;

		return true;
	},
	_create_scroll:function(node, mode, dy, py, dim){
		var scroll = create("DIV", {
			/*@attr*/"webixignore":"1",
			"class":"webix_c_scroll_"+mode
		},"<div></div>");

		scroll.style[dim] = Math.max((py*py/dy-7),40)+"px";
		scroll.style[dim == "height"?"top":"left"] = "0px";
		node.style.position = "relative";
		node.appendChild(scroll);

		node._webix_event_sc1 = event(scroll, env.mouse.down, CustomScroll._scroll_drag(node, "mouse"));
		if (env.touch)
			node._webix_event_sc2 = event(scroll, env.touch.down, CustomScroll._scroll_drag(node, "touch"));

		return scroll;
	},
	_init_drag:function(e, pointer){
		if (pointer === "touch"){
			CustomScroll._drag_events = [
				event(e.target, env[pointer].move, function(e){
					CustomScroll._adjust_scroll(CustomScroll._active_drag_area, CustomScroll._active_drag_area._scroll_drag_pos, getPos(e));
				}),
				event(e.target, env[pointer].up, CustomScroll._scroll_drop)
			];
		} else {
			CustomScroll._drag_events = [
				event(document.body, env[pointer].move, function(e){
					CustomScroll._adjust_scroll(CustomScroll._active_drag_area, CustomScroll._active_drag_area._scroll_drag_pos, getPos(e));
				}),
				event(document, env[pointer].up, CustomScroll._scroll_drop),
				event(document.body, "mouseleave", CustomScroll._scroll_drop)
			];
		}
	},
	_scroll_drag:function(node, pointer){
		return function(e){
			addCss(document.body,"webix_noselect",1);
			this.className += " webix_scroll_active";
			node._scroll_drag_enabled = this;
			node._scroll_drag_pos = getPos(e);

			CustomScroll._active_drag_area = node;
			CustomScroll._init_drag(e, pointer);

			if (e.cancelable) preventEvent(e);
		};
	},
	_scroll_drop:function(){
		const node = CustomScroll._active_drag_area;
		if (node._scroll_drag_enabled){
			removeCss(document.body,"webix_noselect");
			node._scroll_drag_enabled.className = node._scroll_drag_enabled.className.toString().replace(" webix_scroll_active","");
			node._scroll_drag_enabled = false;
			CustomScroll._active_drag_area = false;
			if (node._scroll_drag_released){
				CustomScroll._mouse_out_timed.call(node);
				node._scroll_drag_released = false;
			}
		}

		if (CustomScroll._drag_events){
			for (let i=0; i<CustomScroll._drag_events.length; i++)
				eventRemove(CustomScroll._drag_events[i]);
			CustomScroll._drag_events = null;
		}
	},
	_update_scroll:function(node, pose, value){
		var sizes = node._custom_scroll_size;
		if (sizes && (sizes._scroll_x_node||sizes._scroll_y_node)){
			var view = node._custom_scroll_view;

			var left_scroll = pose === "scrollLeft" ? value : Math.round(node.scrollLeft);
			var left = view ? $$(view)._scrollLeft : left_scroll;
			var shift_left = view ? 0 : left;

			var top_scroll = pose === "scrollTop" ? value : Math.round(node.scrollTop);
			var top = view ? $$(view)._scrollTop : top_scroll;
			var shift_top = view ? 0 : top;

			if (sizes._scroll_x_node){
				sizes._scroll_x_node.style.bottom = 1 - shift_top + "px";
				sizes._scroll_x_node.style.left = Math.round(sizes._sx*left/(sizes.dx-sizes.px)) + shift_left + 1 + "px";
				if (sizes._bar_x){
					sizes._bar_x.style.bottom = 1 - shift_top + "px";
					sizes._bar_x.style.left = shift_left + "px";
				}
			}
			if (sizes._scroll_y_node){
				sizes._scroll_y_node.style.right = 0 - shift_left + "px";
				sizes._scroll_y_node.style.top = Math.round(sizes._sy*top/(sizes.dy-sizes.py)) + shift_top + 1 + "px";
				if (sizes._bar_y){
					sizes._bar_y.style.right = 0 - shift_left + "px";
					sizes._bar_y.style.top = shift_top + "px";
				}
			}
		}
	},
	_set_additional_handlers:function(view){
		// update scroll when showing view
		if (view.attachEvent){
			view.attachEvent("onViewShow", () => this._resize_scroll(view));
			view.attachEvent("onAfterAutoScroll", () => this._resize_scroll(view));
			if (view._level_up)		// grouplist: resize scroll after animation
				view.attachEvent("onAfterRender", () => this._resize_scroll(view));
			if (env.touch)
				view.attachEvent("onTouchStart", () => this._touch_start(view._dataobj.parentNode));
		}

		// update scroll on data change
		if (view.data && view.data.attachEvent)
			view.data.attachEvent("onStoreUpdated", () => this._resize_scroll(view));
	},
	_touch_start:function(current){
		const node = CustomScroll._last_active_node;
		if (node !== current){
			if (node) CustomScroll._mouse_out.call(node, false);
			CustomScroll._mouse_in.call(current, false);
		}
	},
	_resize_scroll:function(view){
		const node = CustomScroll._last_active_node;
		if (node && view.$view.contains(node))
			CustomScroll._on_reconstruct();
		else
			CustomScroll._mouse_out_timed.call(view._dataobj.parentNode);
	}
};

export default CustomScroll;