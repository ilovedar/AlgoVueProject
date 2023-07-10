<template>
  <div class="dataTable">
    <h3>=== WEBIX Datatable ===</h3>
    <div id="valueChange" style="margin-bottom: 10px;"></div>
    <div ref="myWebixContainer"></div>
    <div ref="pager"></div>
  </div>
</template>

<script>

export default {
  props: {
    columns: {
      type: Array,
      default: () => []
    },
    gridData: {
      type: Array,
      default: () => []
    }
  },
  mounted() {
    this.fnGetList()
  },
  methods: {
    fnGetList() {
      if (window.webix) {
        window.webix.ui({
          view: 'datatable',
          container: this.$refs.myWebixContainer,
          id: 'gridId',
          columns: this.columns,
          data: this.gridData,
          yCount:5,
          scroll:"false",
          pager: {
            container: this.$refs.pager,
            size: 5,
            group: 5
          }
        })
      }
    },
  },
  watch: {
    gridData(newValue) {
    console.log("여기는 들어오니?" + newValue);
    // const copiedGridData = JSON.parse(JSON.stringify(this.gridData));
    // console.log("copiedGridData" + copiedGridData);
    // this.$emit('buttonClick', copiedGridData);
    // console.log("copiedGridData2" + this.gridData);
    // const container = this.$refs.myWebixContainer;
    // container.innerHTML = ''; // 기존 데이터 비우기
    window.webix.$$("gridId").clearAll();
    window.webix.$$("gridId").define("data", newValue);
    window.webix.$$("gridId").refresh();

    // this.fnGetList()
  }
}
};
</script>