<!-- PageTest2.vue -->
<template>
    <div class="test2">
        <h1>This is an test2 page</h1>
        <PageChart :series="series" :data="data" chartId="chartId1" chartType="line" />
        <PageChart :series="series" :data="data" chartId="chartId2" chartType="bar" />
        <PageChart :series="series" :data="data" chartId="chartId3" chartType="donut" />
        <PageChart :series="series" :data="data" chartId="chartId4" chartType="pie" />
        <PageChart :series="series" :data="data" chartId="chartId4" chartType="radar" />
    </div>
</template>

<script>
import PageChart from './webixComponents/PageChart.vue'

export default {
    setup() {
        const series = [
        {
            value: '#sales#',
            color: '#67b7dc',
            label: '#sales#'
        }
        ];

        const data = [
            { year: '2015', sales: 50 },
            { year: '2016', sales: 75 },
            { year: '2017', sales: 100 },
            { year: '2018', sales: 65 },
            { year: '2019', sales: 80 },
            { year: '2020', sales: 90 }
        ];

        function handleChart() {
            const chartFormData = window.webix.$$("chartId1").getValues();
            console.log("chart 값은?" + chartFormData)
        }

        return {
            series,
            data,
            handleChart,
        }
    },
    components: {
        PageChart
    }
}
</script>