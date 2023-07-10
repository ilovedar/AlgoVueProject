

const Mixin = {
	topSplit_setter:function(value){
		if (this.data)
			this.data.$freeze = value;
		return value;
	},
	freezeRow:function(id, mode){
		let freezeLine = this._settings.topSplit;

		// ignore if pager is defined
		if (this._settings.pager || !this._dtable_fully_ready) return;

		if (id){
			const order = this.data.order;
			const filterOrder = this.data._filter_order;

			id = id.toString();
			freezeLine = this._moveFrozenRow(id, mode, order, freezeLine);
			if (filterOrder)
				this._moveFrozenRow(id, mode, filterOrder, freezeLine, true);
		}
		else if (!mode)
			freezeLine = 0; // unfreeze all rows

		this.define("topSplit", freezeLine);
		this.refresh();
	},
	_moveFrozenRow(id, mode, order, freezeLine, skip){
		const index = this.data.pull[id]
			? order.find(id)
			: -1;

		if (mode && index >= freezeLine){
			if (!skip) freezeLine++;
			for (let i=index; i>=freezeLine; i--){
				order[i] = order[i-1];
			}
			order[freezeLine-1] = id;
		}
		if (!mode && index < freezeLine){
			if (!skip) freezeLine--;
			for (let i=index; i<freezeLine; i++){
				order[i] = order[i+1];
			}
			order[freezeLine] = id;
		}
		return freezeLine;
	}
};

export default Mixin;