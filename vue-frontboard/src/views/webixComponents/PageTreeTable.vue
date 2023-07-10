<template>
    <div class="treeTable">
      <h3>=== WEBIX Treetable ===</h3>
      <div ref="myWebixTreeTable" style="height: 500px; width: 500px;"></div>
    </div>
  </template>
  
  <script>
  
  export default {
    props: {
        html: {
            type: Array,
            default: () => []
        },
      columns: {
        type: Array,
        default: () => []
      },
      data: {
        type: Array,
        default: () => []
      }
    },
    mounted() {
      this.fnTreeTable()
    },
    methods: {
        fnTreeTable() {
        if (window.webix) {
            window.webix.ui({
                view: "treetable",
                container: this.$refs.myWebixTreeTable,
                tooltip: true,
                scroll: "auto",
                columns: this.columns,
                data: this.data,
                elements: this.html
            })
          }
      }
    }
  };
  </script>