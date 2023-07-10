import base from "../views/view";
import EventSystem from "../core/eventsystem";
import {protoUI} from "../ui/core";
import env from "../webix/env";
import {bind} from "../webix/helpers";
import {assert} from "../webix/debug";

const api = {
	name: "gage",
	defaults: {
		value: 0,
		minRange: 0,
		maxRange: 100,
		minWidth:250,
		minHeight:200,
		smoothFlow: true,
		scale:3,
		stroke:7
	},
	$init: function() {
		this.$ready.push(bind(this._setDefaultView, this));
		this.attachEvent("onDestruct", function(){
			this._circleGradient = this._gageGradientPoint = this._gage = null;
		});
	},
	$setSize: function(x, y) {
		if (base.api.$setSize.call(this, x, y)){
			this._refresh();
		}
	},
	_refresh: function() {
		this._value = this.config.value;
		const curves = this.$view.querySelector(".webix_gage_curves"),
			gageInfo = this.$view.querySelector(".webix_gage_info"),
			kx = this.config.scale,
			x = Math.min(this.$width, this.$height),
			width = x / 100 * this.config.stroke,
			r = x / kx;

		curves.setAttribute("r", r);
		curves.setAttribute("strokeDasharray", Math.round(Math.PI * r));
		curves.style.r = r;
		curves.style.strokeDasharray = Math.round(Math.PI * r);
		curves.style["stroke-width"] = width + "px";

		gageInfo.setAttribute("style", "width: "+Math.round(r*2)+"px;");
		this._gage.setAttribute("style", "height: "+Math.round(r + width)+"px;");
		this._circleGradient.setAttribute("r", r);
		this._circleGradient.setAttribute("style", "stroke-dasharray: " + Math.round(this.gradientLength * Math.PI * r) + ", 1900; stroke-width:" + width + "px");
		this._draw_line(r);
		this._animate();
	},
	_safeValue: function(value){
		return Math.min(Math.max(value, this._settings.minRange), this._settings.maxRange);
	},
	_draw_line: function(radius) {
		const svgCoord = this.$width,
			width = Math.min(this.$width, this.$height) / 100 * this.config.stroke;

		this._gageGradientPoint.style.transformOrigin = (svgCoord / 2) + "px 0 0";
		this._gageGradientPoint.setAttribute("y1", "0");
		this._gageGradientPoint.setAttribute("x1", Math.round(svgCoord) / 2  + width);

		this._gageGradientPoint.setAttribute("y2", "0");
		this._gageGradientPoint.setAttribute("x2", Math.round((svgCoord + width)/2 + radius));
	},
	_animate: function() {
		const value = this.config.value;
		const webixGageValue = this.$view.querySelector(".webix_gage_value");
		const currentChartValue = this._safeValue(value) - this.config.minRange;
		const degrees = Math.round(currentChartValue * 180 / (this.config.maxRange - this.config.minRange));
		const viewSize = Math.min(this.$width,this.$height);

		this.$view.style.fontSize = Math.floor(viewSize/8)+"px";
		webixGageValue.innerHTML = value;
		this._circleGradient.style.stroke = this.color;
		this._circleGradient.setAttribute("stroke", this.color);
		this._gageGradientPoint.setAttribute("transform", "rotate(" + degrees + " "+ this.$width/2 +" 0)");
		this._gageGradientPoint.style.transform = "rotate(" + degrees + "deg)";
	},
	_setDash: function() {
		assert(this.config.minRange < this.config.maxRange, "Invalid Range Values");
		this.gradientLength = (this._safeValue(this.config.value) - this.config.minRange) / (this.config.maxRange - this.config.minRange);

		const template = this.config.color;
		if (template){
			if (typeof template === "function")
				this.color = template.call(this, this.config.value);
			else
				this.color = template;
		} else
			this.color = "hsl(" + (120 - Math.round(this.gradientLength * 120)) + ", 100%, 50%)";

		if (this.config.animation === true) {
			this.defaultColor = "hsl(125, 100%, 50%)";
		} else {
			this.defaultColor = "hsl(" + (120 - Math.round(this.gradientLength * 120)) + ", 100%, 50%)";
		}
	},
	_setDefaultView: function() {
		const animation = this.config.smoothFlow && env.svganimation && !env.isEdge;

		this.gradientLength = 0;
		this._setDash();
		this.$view.innerHTML = `<div class="webix_gage_box"><div>
			<div class="webix_gage_label"><span>${this.config.label||""}</span></div>
			<svg class="webix_gage_body" style="height:300px; position: relative;">
				<circle class="webix_gage_curves" r="0" cx="50%" cy="0" stroke="#EEEEEE" fill="none"></circle>
				<circle class="webix_gage_gradient${animation?" webix_gage_animated":""}" r="0" stroke=${this.defaultColor} cx="50%" cy="0" fill="none" style="stroke-dasharray: 0, 1900;"></circle>
				<line class="webix_gage_gradient_point${animation?" webix_gage_gradient_point_animated":""}" x1="0" x2="0" y1="0" y2="0" style="stroke:#B0B0B0; stroke-width:4;"></line>
			</svg>
			<div class="webix_gage_info">
				<div class="webix_gage_min_range">${this.config.minRange}</div>
				<div class="webix_gage_max_range">${this.config.maxRange}</div>
				<div class="webix_gage_placeholder">
					<div class="webix_gage_value">${this.config.value}</div>
					<div class="webix_gage_range_info">${this.config.placeholder||""}</div>
				</div>
			</div>
		</div></div>`;
		this._circleGradient = this.$view.querySelector(".webix_gage_gradient");
		this._gageGradientPoint = this.$view.querySelector(".webix_gage_gradient_point");
		this._gage = this.$view.querySelector(".webix_gage_body");
	},
	refresh: function() {
		//for animated gages, if value changes - repaint with old value first, then set new value for nice animation
		const value = this.config.value;
		if(this.config.smoothFlow && value != this._value)
			this.config.value = this._value;

		this._setDefaultView();
		this._refresh();

		if(this._value != value){
			//refresh dom, needed for animation
			if(this._viewobj.parentNode.clientHeight)
				this.setValue(value);
		}
	},
	setValue: function(value) {
		this.config.value = value;
		this._setDash();
		this._refresh();
	},
	getValue: function() {
		return this.config.value;
	}
};

const view = protoUI(api,  EventSystem, base.view);
export default {api, view};