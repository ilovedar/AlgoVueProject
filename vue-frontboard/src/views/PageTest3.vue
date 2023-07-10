<!-- PageTest3.vue -->
<template>
    <div class="test3">
        <h1>This is an test3 page</h1>
        <PageTreeTable :html="html" :columns="columns" :data="data" />
    </div>
</template>

<script>
import PageTreeTable from './webixComponents/PageTreeTable.vue'

export default {
    data() {
    return {
        html: [
            { id:1, title:"The Shawshank Redemption", year:1994, votes:678790, rating:9.2, rank:1, category:"Thriller"},
            { id:2, title:"The Godfather", year:1972, votes:511495, rating:9.2, rank:2, category:"Crime"},
            { id:3, title:"The Godfather: Part II", year:1974, votes:319352, rating:9.0, rank:3, category:"Crime"},
            { id:4, title:"The Good, the Bad and the Ugly", year:1966, votes:213030, rating:8.9, rank:4, category:"Western"},
            { id:5, title:"Pulp fiction", year:1994, votes:533848, rating:8.9, rank:5, category:"Crime"},
            { id:6, title:"12 Angry Men", year:1957, votes:164558, rating:8.9, rank:6, category:"Western"}
        ],
        columns: [
            { id:"id", header:"", width:50},
            { id:"value", header:"Film title", width:250,
            template:"{common.treetable()} #value#" },
            { id:"chapter", header:"Mode", width:200}
        ],    
        data: [
            { "id":"1", "value":"The Shawshank Redemption", "open":true, "data":[
            { "id":"1.1", "value":"Part 1", "chapter":"alpha"},
            { "id":"1.2", "value":"Part 2", "chapter":"beta", "open":true, "data":[
                { "id":"1.2.1", "value":"Part 1", "chapter":"beta-twin"}
            ]}
            ]}
        ]
    }
  },
    components: {
        PageTreeTable,
    }
}
</script>