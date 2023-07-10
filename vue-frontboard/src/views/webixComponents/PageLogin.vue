<template>
  <div class="login">
    <h3>=== WEBIX LOGIN ===</h3>
    <div ref="myWebixLogin" style="height: 200px;"></div>
    <div id="nav">
      <router-link to="/test5">아이디 찾기</router-link> |
      <router-link to="/test5">비밀번호 찾기</router-link> |
      <router-link to="/test5">회원가입</router-link>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';

export default {
  props: {
    form1: {
      type: Array,
      default: () => []
    },
    userList: {
      type: Array,
      default: () => []
    }
  },
  setup(props) {
    const myWebixLogin = ref(null);

    onMounted(() => {
      init ();
    });

    function init() {
      if (window.webix) {
        window.webix.ui({
          view: 'form',
          container: myWebixLogin.value,
          id: 'loginForm',
          scroll: false,
          width: 600,
          elements: props.form1,
          elementsConfig: {
            labelPosition: "top"
          },
          rules: {
            $all:window.webix.rules.isNotEmpty
          }
        });
      }
    }

    return {
      myWebixLogin
    };
  }
};
</script>