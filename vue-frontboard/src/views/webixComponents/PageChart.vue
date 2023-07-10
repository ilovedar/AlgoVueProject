<template>
    <div class="chart">
    <div ref="myWebixChart" style="height: 500px;"></div>
</div>
  </template>
  
  <script>
import { ref, watch, onBeforeMount, onMounted } from 'vue';
  
  export default {
    props: {
        series: {
            type: Array,
            default: () => []
        },
        data: {
            type: Array,
            default: () => []
        },
        chartType: {
            type: String,
            default: "line"
        },
        xAxis: {
            type: Array,
            default: () => []
        },
        yAxis: {
            type: Array,
            default: () => []
        }
    },
    setup(props) {
        const myWebixChart = ref(null);

        onBeforeMount(() => {
            // 기존에 생성된 webix 컴포넌트가 있을 경우 삭제
            if(window.webix.$$(props.chartId) != undefined) {
                window.webix.$$(props.chartId).destructor();
            }
        });

        onMounted(() => {
            init();
        });

        function init() {
            if (window.webix) {
                window.webix.ui({
                    container: myWebixChart.value,
                    view: 'chart',
                    id: props.chartId,
                    type: props.chartType,
                    value: '#sales#',
                    width: 1500,
                    heigth: 600,
                    xAxis: {
                        template: '#year#',
                        title: 'Year'
                    },
                    yAxis: {
                        start: 0,
                        end: 100,
                        step: 20,
                        title: 'Sales'
                    },
                    series: props.series,
                    data: props.data
                })
             }
        }

        watch(
            () => props.data,
            (newValue) => {
                window.webix.$$(props.chartId).clearAll();
                window.webix.$$(props.chartId).define("data", newValue);
                window.webix.$$(props.chartId).refresh();
            }
        );

        return {
            myWebixChart,
            init
        }
    }
        
  };
  </script>
  