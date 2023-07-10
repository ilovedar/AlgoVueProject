<template>
    <div class="barcode">
    <div ref="myWebixBarcode" style="height: 500px;"></div>
</div>
  </template>
  
  <script>
  
  export default {
    props: {
        series: {
            type: Array,
            default: () => []
        },
        data: {
            type: Array,
            default: () => []
        }
    },
    mounted() {
        this.barcode()
    },
    methods: {
        barcode() {
            if (window.webix) {
                window.webix.ui({
                    container: this.$refs.myWebixBarcode,
                    view:"barcode",
                    id:"barcode",
                    type:"ean13",
                    value:"123456789012"
                })
            }
        }
    }
  };
  </script>