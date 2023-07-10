import {remove, create} from "../../webix/html";
import Touch from "../../core/touch";
import env from "../../webix/env";
import {bind, uid} from "../../webix/helpers";


const Mixin = {
	spans_setter:function(value){
		if (value && !this._spans_pull)
			this._init_spans_once();

		return value;
	},
	_init_spans_once:function(){
		this._spans_pull = {};
		this._spans_areas = [];

		this.data.attachEvent("onStoreLoad", bind(function(driver, data){
			if (data && data.spans)
				this.addSpan(data.spans);
		}, this));

		this.data.attachEvent("onClearAll", bind(function(){
			this._spans_pull = {};
		}, this));
		
		// touch scroll
		this.attachEvent("onSyncScroll", function(x,y,t){
			for (var i=0; i<3; i++) {
				Touch._set_matrix(this._spans_areas[i], (i==1?x:0), y, t);
			}
		});

		this.attachEvent("onScrollY", this._adjust_spans_xy);
		this.attachEvent("onScrollX", this._adjust_spans_xy);
		this.attachEvent("onAfterRender", this._paint_spans);
		this.attachEvent("onColumnResize", this._paint_spans);
		this.attachEvent("onSelectChange", this._paint_spans_selection);
	},
	addSpan:function(id, index, width, height, value, css){
		//accept an array of objects
		if (typeof id == "object"){
			for (var i = 0; i < id.length; i++)
				this.addSpan.apply(this, id[i]);
			return;
		}

		height = height || 1;
		width  = width  || 1;

		if (!this._spans_pull[id])
			this._spans_pull[id] = {};

		this._spans_pull[id][index] = [width, height, value, css];
	},

	removeSpan:function(id, index){
		if(!arguments.length)
			this._spans_pull = {};

		var line = this._spans_pull[id];
		if (line)
			delete line[index];
	},
	getSpan: function(row, column){
		if (!row) return this._spans_pull;

		var i, iSpan, j, jSpan, span,
			spans = this._spans_pull;

		i = this.getIndexById(row);
		j = this.getColumnIndex(column);

		for(row in spans){
			for(column in spans[row]){
				span = spans[row][column];
				iSpan = this.getIndexById(row);
				jSpan = this.getColumnIndex(column);
				if(jSpan >= 0 && iSpan >=0 && !(i > iSpan+span[1]-1 || i < iSpan || j > jSpan+span[0]-1|| j < jSpan)){
					return [row,column].concat(span);
				}
			}
		}

		return null;
	},
	_paint_spans:function(){
		var area, i, rightNum = this._columns.length - this._settings.rightSplit;
		remove(this._spans_areas);
		for (i=0; i<3; i++){
			area = this._spans_areas[i] = create("DIV",{ "class" : "webix_span_layer" });
			this._body.childNodes[i].appendChild(area);
		}

		this._adjust_spans_xy();
		
		if (this._settings.leftSplit)
			this._paint_spans_area(this._spans_areas[0],0,this._settings.leftSplit);
		if (this._settings.rightSplit)
			this._paint_spans_area(this._spans_areas[2],rightNum,this._columns.length);

		this._paint_spans_area(this._spans_areas[1],this._settings.leftSplit,rightNum);

		if (this._settings.topSplit && !env.touch)
			this._paintSpansTop();
	},
	_getSplitSizesX: function(){
		var i = 0, leftWidth=0, centerWidth=0, rightWidth= 0, rightNum;

		while (i<this._settings.leftSplit){
			leftWidth += this._columns[i].width;
			i++;
		}

		i =  this._columns.length-1;
		rightNum = i-this._settings.rightSplit;

		while (i>= rightNum){
			rightWidth += this._columns[i].width;
			i--;
		}

		for(i = this._settings.leftSplit; i < this._columns.length-this._settings.rightSplit; i++)
			centerWidth += this._columns[i].width;

		return [leftWidth, centerWidth, rightWidth];
	},
	_paintSpansTop: function(){
		for (let i=3; i<6; i++){
			this._spans_areas[i] = create("DIV",{ "class" : "webix_span_layer_top" });
			this._body.childNodes[i-3].appendChild(this._spans_areas[i]);
		}

		const widths = this._getSplitSizesX();
		if (this._settings.leftSplit){
			this._spans_areas[3].style.width = widths[0]+"px";
			this._paint_spans_area(this._spans_areas[3],0,this._settings.leftSplit, true);
		}

		const rightNum = this._columns.length - this._settings.rightSplit;
		if (this._settings.rightSplit){
			this._spans_areas[5].style.width = widths[2]+"px";
			this._paint_spans_area(this._spans_areas[5],rightNum,this._columns.length, true);
		}

		this._spans_areas[4].style.width = widths[1]+"px";
		this._paint_spans_area(this._spans_areas[4],this._settings.leftSplit, rightNum, true);
	},
	_paint_spans_area:function(area, start, end, topsplit){
		var top = 0,cid;
		var min = this.data.$min || 0;
		var max = this.data.$max || (this.data._filter_order?this.data._filter_order.length:this.data.order.length);
		for (var i = min; i < max; i++) {
			let id = this.data._filter_order?this.data._filter_order[i]:this.data.order[i];
			if (!id) {
				top += this._settings.rowHeight;
				continue;
			}
			var line = this._spans_pull[id];
			if (line && (!topsplit || i<this._settings.topSplit)){
				for (var j = start; j < end; j++){					

					if(this._hidden_column_order.length)
						cid = this._hidden_column_order[j];
					else
						cid = this._columns[j].id;
					if (line[cid])
						this._add_span_to_area(area, i, j, line, top, start, id, cid);
				}
			}
			if(!this.data._filter_order || this.data.order.find(id)>-1)
				top += this._getRowHeight(this.getItem(id));
		}
	},

	_paint_spans_selection:function(){
		var config = this.config.select;
		var cell = (config == "cell" || config == "column");

		var selected = this.getSelectedId(true);
		var newselected = [];
		var last = this._last_selected || [];
		var id = uid()+"";
		var repaint = false;
		
		for (let i = 0; i < selected.length; i++){
			let line = this._spans_pull[selected[i]];
			if (line && (!cell || line[selected[i].column])){
				if (!line.$selected || line.$selected.id != selected[i].id)
					repaint = true;
				line.$selected = selected[i];
				line.$time = id;
				newselected.push(selected[i].id);
			}
		}


		for (let i = 0; i < last.length; i++){
			let line = this._spans_pull[last[i]];
			if (line && line.$time !== id){
				delete line.$selected;
				repaint = true;
			}
		}

		this._last_selected = [].concat(selected);
		if (repaint)
			this._paint_spans();
	},

	_span_sum_width:function(start, end){
		var summ = 0, next;

		for (let i = start; i < end; i++){
			if(this._hidden_column_order.length)
				next = this.getColumnConfig(this._hidden_column_order[i]);
			else
				next = this._columns[i];
			summ += next&&!next.hidden?next.width:0;
		}

		return summ;
	},

	_span_sum_height:function(start, end){
		var summ = 0;
		const order = this.data._filter_order || this.data.order;
		for (var i = start; i < end; i++){
			var next = this.getItem(order[i]);
			if(!this.data._filter_order || this.data.order.find(next.id)>-1)
				summ += next?this._getRowHeight(next):this._settings.rowHeight;
		}

		return summ;
	},

	_add_span_to_area:function(area, ind, cind, config, top, start, id, cid){
		const line = config[cid];
		const width = this._span_sum_width(cind, cind+line[0]);
		if(!width)
			return false;
		const height = this._span_sum_height(ind, ind+line[1]);
		if(!height)
			return false;
		const value = line[2] || this.getText(id, cid);
		let selected = "";
		if (config.$selected && (this._settings.select === "row" || config.$selected.column === cid))
			selected = "webix_selected ";
		if(this.data._filter_order){
			while(this.getIndexById(id)<0){
				ind++;
				id = this.data._filter_order[ind];
			}
			ind = this.getIndexById(id);
		}

		let borderCss = "";
		if(ind + line[1] == this._settings.topSplit)
			borderCss += " webix_last_topcell";
		if(cind + line[0] == this._settings.leftSplit)
			borderCss += " webix_last_rightcell";

		const attributes = {
			/*@attr*/"column": cind,
			/*@attr*/"row" : ind,
			"class" : selected+"webix_cell webix_table_cell webix_dtable_span "+(line[3]||"")+borderCss,
			"aria-colindex":cind+1,
			"aria-rowindex":ind+1
		};

		if(line[0]>1) attributes["aria-colspan"] = line[0];
		if(line[1]>1) attributes["aria-rowspan"] = line[1];

		var span = create("DIV", attributes, ""+value);

		span.style.top    = top+"px";
		span.style.left   = this._span_sum_width(start, cind)+"px";
		span.style.width  = width+"px";
		span.style.height = height+"px";

		area.appendChild(span);
	},

	_adjust_spans_xy:function(){
		if(!this._settings.prerender){
			var state = this.getScrollState();
			for (var i=0; i<3; i++)
				this._spans_areas[i].style.top = "-"+(state.y||0) +"px";
		}
	},
	_checkCellMerge:function(id0,id1){
		var span0, span1,
			result = false;

		if(this._spans_pull){
			span0 = this.getSpan(id0.row,id0.column);
			span1 = this.getSpan(id1.row,id1.column);
			if(span0 && span1 && span0[0] == span1[0] && span0[1] == span1[1])
				result = true;
		}
		return result;
	},
	getSpanNode:function(id){
		var areas = this._spans_areas;
		var rind = this.getIndexById(id.row);
		var cind = this.getColumnIndex(id.column);

		for(var a = 0; a<areas.length; a++){
			var parts = areas[a].childNodes;
			for(var i = 0; i<parts.length; i++){
				if(parts[i].getAttribute(/*@attr*/"row")==rind && parts[i].getAttribute(/*@attr*/"column")==cind)
					return parts[i];
			}
		}
		return null;
	}
};

export default Mixin;