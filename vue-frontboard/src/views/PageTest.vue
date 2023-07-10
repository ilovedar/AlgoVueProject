<!-- PageTest.vue -->
<template>
    <div class="test">
        <h1>This is an test page</h1>
        <button @click="updateDataTable">데이터값 변경</button>
        <PageDataTable :columns="columns" :gridData="gridData" /> <!-- @buttonClick="updateDataTable" /> -->
    </div>
</template>

<script>
import PageDataTable from './webixComponents/PageDataTable.vue'

export default {
    data() {
    return {
      columns: [
            { id: 'id', header: 'ID', fillspace: true },
            { id: 'name', header: 'Name', fillspace: true },
            { id: 'age', header: 'Age', fillspace: true }
      ],
      gridData: [
        { id: 1, name: 'John Doe', age: 25 },
        { id: 2, name: 'Jane Smith', age: 30 },
        { id: 3, name: 'Jane Smith', age: 30 },
        { id: 4, name: 'Jane Smith', age: 30 },
        { id: 5, name: 'Jane Smith', age: 30 },
        { id: 6, name: 'Jane Smith', age: 30 },
        { id: 7, name: 'Jane Smith', age: 30 },
        { id: 8, name: 'Jane Smith', age: 30 },
        { id: 9, name: 'Jane Smith', age: 30 },
        { id: 10, name: 'Jane Smith', age: 30 },
        { id: 11, name: 'Jane Smith', age: 30 },
        { id: 12, name: 'Jane Smith', age: 30 },
        { id: 13, name: 'Jane Smith', age: 30 }
      ],
      gridData2: [
        { id: 1, name: '하나', age: 21 },
        { id: 2, name: '두울', age: 22 },
        { id: 3, name: '세엣', age: 23 },
        { id: 4, name: '네엣', age: 24 },
        { id: 5, name: '다섯', age: 25 },
        { id: 6, name: '여섯', age: 26 },
        { id: 7, name: '일곱', age: 27 },
        { id: 8, name: '여덟', age: 28 },
        { id: 9, name: '아홉', age: 29 },
        { id: 10, name: '여얼', age: 30 },
      ],
    }
  },
    components: {
        PageDataTable,
  },
  methods: {
    updateDataTable() {
      // console.log("여기는??");
      this.gridData = this.gridData2;
      console.log("gridData변경됨??" + this.gridData);
    }
  }
}
</script>