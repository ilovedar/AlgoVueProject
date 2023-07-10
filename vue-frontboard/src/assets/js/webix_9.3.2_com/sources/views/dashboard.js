import gridlayout from "../views/gridlayout";
import {offset, pos as getPos, create, remove} from "../webix/html";
import {protoUI, $$} from "../ui/core";
import {uid, extend, delay, copy} from "../webix/helpers";
import {callEvent} from "../webix/customevents";
import DragControl from "../core/dragcontrol";
import Touch from "../core/touch";

const api = {
	name:"dashboard",
	$longTouchLimit: true,
	$init:function(){
		DragControl.addDrag(this.$view, this);
		DragControl.addDrop(this.$view, this, true);
	},
	_isDragNode:function(target){
		if (!target.getAttribute || target.getAttribute(/*@attr*/"webix_disable_drag") || target.getAttribute(/*@attr*/"webixignore")) return false;

		const contentEditable = target.getAttribute("contentEditable");
		if(target.tagName == "INPUT" || target.tagName == "TEXTAREA" || contentEditable == "true" || contentEditable == "")
			return false;

		const css = (target.className || "").toString();
		if (css.indexOf("panel_drag") != -1)
			return target;
		if (target.parentNode && target != this.$view)
			return this._isDragNode(target.parentNode);

		return false;
	},
	$dragCreate:function(object, e){
		if (!e.target || !this._isDragNode(e.target)) return false;

		// ok, it seem the dnd need to be started
		let sview = $$(e);
		if (!sview.$resizeMove)
			sview = sview.queryView(v => v.$resizeMove, "parent");

		const box = offset(this.$view);
		const pos = getPos(e);

		const context = DragControl._drag_context = { 
			source:sview, from:this,
			dashboard:{
				sx: pos.x - box.x - parseInt(sview.$view.style.left)+ this._settings.margin/2,
				sy: pos.y - box.y - parseInt(sview.$view.style.top)+ this._settings.margin/2
			}
		};

		if (this.callEvent("onBeforeDrag", [context, e])){
			this._addDragMarker(sview._settings.dx, sview._settings.dy);

			// hide suggests after starting drag
			callEvent("onClick", []);

			if (Touch._start_context)		//prevent inner scroll
				delay(function(){ Touch._start_context = null; });

			return sview.$view;
		}
	},
	_addDragMarker:function(x, y){
		const drag = this._dragMarker = create("div", { "class":"panel_target" });
		const size = this._getActualSize(0,0, x, y);
		drag.style.width = size.dx+"px";
		drag.style.height = size.dy+"px";

		this.$view.appendChild(this._dragMarker);
	},
	$drop:function(s,t,e){
		const context = DragControl._drag_context;
		const obj = {
			x: context.dashboard.x,
			y: context.dashboard.y
		};

		if(this.callEvent("onBeforeDrop", [context, e])){
			if (context.from === this){
				const conf = context.source.config;
				this.moveView(conf.id, obj);
			} else {
				if(context.from && context.from.callEvent && context.from.callEvent("onBeforeDropOut", [context,e])){
					for (let i = context.source.length - 1; i >= 0; i--){
						let item = copy(obj);
						item.name = context.source[i];
						item.dx = context.dashboard.dx;
						item.dy = context.dashboard.dy;
						item.id = item.name+":"+uid();

						item = this._settings.factory.call(this, item);
						if (item)
							this.addView(item);
					}
				}
				else
					return;
			}
			this.callEvent("onAfterDrop", [context, e]);
		}
	},
	$dragDestroy:function(target, html){
		html.style.zIndex = 1;
		remove(this._dragMarker);
		this._dragMarker = null;

		this._apply_new_grid();
	},
	_getPosFromCoords:function(x,y,resize){
		const margin = this._settings.margin;
		const paddingX = this._settings.paddingX || this._settings.padding;
		const paddingY = this._settings.paddingY || this._settings.padding;

		let dx = this._settings.cellWidth;
		if (!dx) dx = (this.$width - 2 * paddingX + margin) / this._settings.gridColumns - margin;
		let dy = this._settings.cellHeight;
		if (!dy) dy = (this.$height - 2 * paddingY + margin) / this._actual_rows - margin;

		x+=resize ? margin : -paddingX;
		y+=resize ? margin : -paddingY;

		x = Math.round(x/(dx+margin));
		y = Math.round(y/(dy+margin));

		// for dnd, leave one block on the right to achieve minimum width (dx = 1)
		x = Math.max(0, Math.min(x, this._settings.gridColumns - (resize?0:1)));
		y = Math.max(0, Math.min(y, this._actual_rows));

		return {
			x:x, y:y,
			width: dx, height:dy, margin:margin,	
			rx: x*(dx+margin)+paddingX,
			ry: y*(dy+margin)+paddingY
		};
	},
	$dragOut:function(s,t,d,e){
		const context = DragControl._drag_context;
		this.callEvent("onDragOut", [context,e]);
		if (this._dragMarker && context.external){
			remove(this._dragMarker);
			this._dragMarker = null;
		}
	},
	$dragIn:function(to, from, e){
		const context = DragControl._drag_context;

		if(this.callEvent("onBeforeDragIn", [context,e])){
			if (!this._dragMarker){
				// drag source must provide getItem method
				if (!context.from || !context.from.getItem) return false;
				// when factory not defined, do not allow external drag-n-drop
				if (!this._settings.factory)
					return false;

				const item = context.from.getItem(context.source[0]);

				extend(context, {
					external:true,
					dashboard:{ dx : item.dx, dy : item.dy }
				}, true);

				this._addDragMarker(item.dx, item.dy);
			}
			if (context.external){
				const drag = this._dragMarker;
				const evPos = getPos(e);
				const box = offset(this.$view);

				const inpos = this._getPosFromCoords(evPos.x - box.x, evPos.y - box.y);
				extend(context.dashboard , inpos, true);
				drag.style.left = inpos.rx+"px";
				drag.style.top = inpos.ry+"px";
			}

			return true;
		}
	},
	$dragPos: function(pos, e){
		const context = DragControl._drag_context;

		const evPos = getPos(e);
		const box = offset(this.$view);
		const dash = context.dashboard;

		const inpos = this._getPosFromCoords(evPos.x - box.x - dash.sx , evPos.y - box.y - dash.sy);
		pos.x = evPos.x - dash.sx - box.x;
		pos.y = evPos.y - dash.sy - box.y;

		//drag marker
		const drag = this._dragMarker;
		drag.style.left = inpos.rx+"px";
		drag.style.top = inpos.ry+"px";

		extend(dash , inpos, true);
	},
};

const view = protoUI(api,  gridlayout.view);
export default {api, view};
