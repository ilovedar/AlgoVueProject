import {preventEvent, download} from "../webix/html";
import {protoUI, $$, ui} from "../ui/core";
import {bind} from "../webix/helpers";
import {_event, event, eventRemove} from "../webix/htmlevents";

import env from "../webix/env";
import require from "../load/require";
import i18n from "../webix/i18n";

import base from "../views/view";
import EventSystem from "../core/eventsystem";
import AtomDataLoader from "../core/atomdataloader";


const api = {
	name:"pdfviewer",
	defaults:{
		scale:"auto"
	},
	$init:function(config){
		this.$view.className += " webix_pdf";

		const elm_wrapper = document.createElement("DIV");
		elm_wrapper.className="canvas_wrapper";

		const elm = document.createElement("canvas");

		this._currentPage = this.$view;
		this._container = this.$view.appendChild(elm_wrapper);
		this._canvas = this._container.appendChild(elm);
		
		this.$pdfDoc = null;
		this.$pageNum = 0;
		this.$numPages = 0;
		this._pageRendering = false;
		this._pageNumPending = null;
		this._ctx = this._canvas.getContext("2d");

		this._init_scale_value = 0.1;
		this._default_scale_delta = config.scaleDelta || 1.1;
		this._min_scale = config.minScale || 0.25;
		this._max_scale = config.maxScale || 10.0;
		this._max_auto_scale = 1.25;

		this._hPadding = 40;
		this._vPadding = 10;

		this._destroy_with_me = [];

		this.$ready.push(this._attachHandlers);
	},
	toolbar_setter:function(toolbar){
		if (typeof toolbar == "string"){
			const ui_toolbar = $$(toolbar);
			if (ui_toolbar){
				ui_toolbar.$master = this;
				ui_toolbar.refresh();
			}
			this.attachEvent("onDocumentReady", function(){
				if(ui_toolbar){
					ui_toolbar.setPage(this.$pageNum);
					ui_toolbar.setValues(this.$numPages, this._settings.scale);
				}
				else
					this.toolbar_setter(toolbar);
			});
			return toolbar;
		}
	},
	_attachHandlers:function(){
		delete this._settings.datatype; // cheat(

		this.attachEvent("onScaleChange", function(scale){
			if(this._settings.toolbar && $$(this._settings.toolbar).setScale)
				$$(this._settings.toolbar).setScale(scale);
		});

		this.attachEvent("onPageRender", function(page){
			if(this._settings.toolbar && $$(this._settings.toolbar).setPage)
				$$(this._settings.toolbar).setPage(page);
		});

		if (env.touch){
			this._touchDelta = false;
			_event(this._viewobj, env.touch.down, this._pdf_touch_down, { bind:this });

			this.attachEvent("onSwipeY", function(start, end){
				if (this._touchDelta) return;

				const ch = this.$view.clientHeight,
					sh = this.$view.scrollHeight,
					oh = this.$view.offsetHeight,
					stop = this.$view.scrollTop,
					delta = end.y-start.y;

				if (ch === sh || (delta<0 && stop > (sh - oh)) || (delta>0 && stop === 0)){
					const page = this.$pageNum + (delta > 0 ? -1 :1);
					if(page>0 && page <=this.$numPages){
						this.$pageNum = page;
						this._queueRenderPage(this.$pageNum);
						this.$view.scrollTop = delta > 0 ? sh : 0;
					}
				}
			});
		}

		_event(this.$view, "wheel", function(e){
			if (e.ctrlKey) { // Only zoom the pages, not the entire viewer
				preventEvent(e);
				if (e.wheelDelta < 0) this.zoomOut();
				else this.zoomIn();
			}
		}, { bind:this, passive:false });
	},
	_get_touch_delta:function(touches){
		const [a, b] = touches;
		return Math.sqrt(Math.pow(a.pageX - b.pageX, 2) + Math.pow(a.pageY - b.pageY, 2));
	},
	_pdf_touch_down:function(e){
		if (e.touches.length === 2){
			this._touchDelta = this._get_touch_delta(e.touches);

			this._handle_touch_events = [
				event(document.body, env.touch.move, e => this._pdf_touch_move(e), { passive:false }),
				event(document, env.touch.up, this._pdf_touch_up, { bind:this })
			];
			preventEvent(e);
		}
	},
	_pdf_touch_move:function(e){
		if (e.touches.length > 1){
			const newDelta = this._get_touch_delta(e.touches);

			if (Math.abs(newDelta - this._touchDelta) > 150){		// zoom every 150px
				if (newDelta > this._touchDelta) this.zoomIn();
				else this.zoomOut();

				this._touchDelta = newDelta;
			}
			preventEvent(e);
		}
	},
	_pdf_touch_up:function(){
		eventRemove(this._handle_touch_events[0]);
		eventRemove(this._handle_touch_events[1]);

		this._handle_touch_events = this._touchDelta = false;
	},
	$onLoad:function(data){
		if(!window.PDFJS){
			//for cross browser and compatibility
			require([env.cdn + "/extras/pdfjs/compatibility.min.js", env.cdn + "/extras/pdfjs/pdf.min.js"], function(){
				/* global PDFJS */
				PDFJS.workerSrc = env.cdn + "/extras/pdfjs/pdf.worker.min.js";
				this._getDocument(data);
			}, this);
		}
		else
			this._getDocument(data);
		return true;
	},
	_getDocument:function(data){
		if(data.name){ //File structure
			const reader = new FileReader();
			reader.onload = bind(function (e) {
				this._getDocument({data:e.target.result});
			}, this);
			reader.readAsArrayBuffer(data);
		}
		else{
			this._uploadDocument({data:data.data});
		}
	},
	_uploadDocument: function(options){
		/* global PDFJS */
		return PDFJS.getDocument({data: options.data, password: options.password})
			.then((pdfDoc_)=>{
				this.clear();
				this.$pdfDoc = pdfDoc_;
				this.$numPages = this.$pdfDoc.numPages;
				this.$pageNum = 1;

				this._renderPage(this.$pageNum).then(()=>{
					this.callEvent("onDocumentReady");
				});
			},(error)=>{
				if(error.name == "PasswordException"){
					this._tryPassword(options);
				}
			});
	},
	getPopup:function(){
		if(!this._passWin){
			this._passWin = ui({view:"window", position:"center", modal:true, head: i18n.PDFviewer.enterPassword,
				body:{
					view:"form",
					elements:[
						{view: "text", name: "password", type: "password", invalidMessage: i18n.PDFviewer.passwordError, required:true},
						{cols:[
							{view:"button", value: i18n.message.cancel, hotkey: "esc", click:()=>{
								this.getPopup().hide();
							}},
							{view:"button", css:"webix_primary", value: i18n.message.ok, hotkey: "enter", click:()=>{
								const win = this.getPopup();
								const form = win.getBody();

								if (form.validate()){
									this._uploadDocument({
										data: this._protectedData,
										password: form.getValues().password
									});
									win.hide();
								}
								else
									form.focus();
							}}
						]}
					]
				},
				on:{
					onHide: ()=>{
						const form = this.getPopup().getBody();
						form.clear("auto");
						form.clearValidation();
						delete this._protectedData;
					}
				}
			});
			this._destroy_with_me.push(this._passWin);
		}

		return  this._passWin;
	},
	_tryPassword:function(options){
		const win = this.getPopup();
		const form = win.getBody();
		this._protectedData = options.data;

		if(options.password){
			form.markInvalid("password");
			form.setValues({password: options.password}, false, "auto");
		}

		win.show();
		form.focus();
	},
	_getViewPort:function(page, scale){
		const viewport = page.getViewport(scale);
		this._canvas.height = viewport.height;
		this._canvas.width = viewport.width;
		this._container.style.width = viewport.width+"px";
		this._container.style.height = viewport.height+"px";

		return viewport;
	},
	_renderPage:function(num) {
		this._pageRendering = true;
		// Using promise to fetch the page
		return this.$pdfDoc.getPage(num).then(page => {
			//Getting 'safe' scale value
			let scale = isNaN(parseFloat(this._settings.scale))?this._init_scale_value:this._settings.scale;

			let viewport = this._getViewPort(page, scale);
			//recalc viewport if "string" scale is set
			if(scale !== this._settings.scale){
				scale =  this._getScale(this._settings.scale);
				viewport = this._getViewPort(page, scale);
				this._settings.scale = scale;
			}

			// Render PDF page into canvas context
			const renderContext = {
				canvasContext: this._ctx,
				viewport: viewport
			};

			page.cleanupAfterRender = true;

			// Wait for rendering to finish
			return page.render(renderContext).promise.then(()=>{
				this.callEvent("onPageRender", [this.$pageNum]);
				this._pageRendering = false;

				if (this._pageNumPending !== null) {
					// New page rendering is pending
					this._renderPage(this._pageNumPending);
					this._pageNumPending = null;
				}
			});
		});
	},
	_queueRenderPage:function(num) {
		if (this._pageRendering)
			this._pageNumPending = num;
		else
			this._renderPage(num);
	},
	renderPage:function(num){
		if(!this.$pdfDoc || num<=0 || num>this.$numPages)
			return;

		this.$pageNum = num;
		this._queueRenderPage(this.$pageNum);
	},
	prevPage:function() {
		if (this.$pageNum <= 1)
			return;
		this.$pageNum--;
		this._queueRenderPage(this.$pageNum);
	},
	nextPage:function() {
		if(this.$pageNum >= this.$numPages)
			return;
		this.$pageNum++;
		this._queueRenderPage(this.$pageNum);
	},
	zoomIn: function (){
		let newScale = this._settings.scale;

		newScale = (newScale * this._default_scale_delta).toFixed(2);
		newScale = Math.ceil(newScale * 10) / 10;
		newScale = Math.min(this._max_scale, newScale);
		this.setScale(newScale);
	},
	zoomOut: function (){
		let newScale = this._settings.scale;

		newScale = (newScale / this._default_scale_delta).toFixed(2);
		newScale = Math.floor(newScale * 10) / 10;
		newScale = Math.max(this._min_scale, newScale);

		this.setScale(newScale);
	},
	_getScale:function(value){
		if(!isNaN(parseFloat(value)))
			return value;
		if(isNaN(parseFloat(this._settings.scale)))
			this._settings.scale = this._init_scale_value;

		let scale = 1; //default value
		const pageWidthScale = ((this._currentPage.clientWidth - this._hPadding) * this._settings.scale/this._canvas.clientWidth).toFixed(2);
		const pageHeightScale = ((this._currentPage.clientHeight - this._vPadding) * this._settings.scale/this._canvas.clientHeight).toFixed(2);
		switch (value) {
			case "page-actual":
				scale = 1;
				break;
			case "page-width":
				scale = pageWidthScale;
				break;
			case "page-height":
				scale = pageHeightScale;
				break;
			case "page-fit":
				scale = Math.min(pageWidthScale, pageHeightScale);
				break;
			case "auto":{
				const isLandscape = (this._currentPage.clientWidth > this._currentPage.clientHeight);
				const horizontalScale = isLandscape ?  Math.min(pageHeightScale, pageWidthScale) : pageWidthScale;
				scale = Math.min(this._max_auto_scale, horizontalScale);
				break;
			}
		}
		return scale;
	},
	setScale: function(value) {
		if (!isNaN(parseFloat(value))) {
			this._setScale(value);
		} else {
			const scale = this._getScale(value);
			this._setScale(scale);
		}
	},
	_setScale:function(newScale){
		this._settings.scale = newScale;
		this.renderPage(this.$pageNum);

		this.callEvent("onScaleChange", [newScale]);
	},
	download:function(){
		if(!this.$pdfDoc) return;

		const filename = (this._settings.downloadName || "document")+".pdf";
		this.$pdfDoc.getData().then(function(data){
			/* global PDFJS */
			const blob = PDFJS.createBlob(data, "application/pdf");
			download(blob, filename);
		});
	},
	clear:function(){
		if(this.$pdfDoc){
			this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
			this._container.style.height = this._container.style.width = this._canvas.width = this._canvas.height = 0;
			this._settings.scale = "auto";
			this.$pageNum = this.$numPages = 0;
			this.$pdfDoc.transport.startCleanup();
			this.$pdfDoc.destroy();
			this.$pdfDoc = null;

			if(this._settings.toolbar && $$(this._settings.toolbar))
				$$(this._settings.toolbar).reset();
		}
	}
};


const view = protoUI(api,  EventSystem, AtomDataLoader, base.view);
export default {api, view};