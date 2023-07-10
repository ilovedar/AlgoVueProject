<template>
  <div class="register">
    <h3>=== WEBIX REGISTER ===</h3>
    <div ref="myWebixRegister" style="height: auto;"></div>
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
    form2: {
      type: Array,
      default: () => []
    }
  },
  setup(props) {
    const myWebixRegister = ref(null);

    onMounted(() => {
      init();
    });

    function init() {
      if (window.webix) {
        window.webix.ui({
          view: "form",
          container: myWebixRegister.value,
          id: "registerForm",
          scroll: false,
          width: 500,
          elementsConfig: {
            labelPosition: "top"
          },
          elements: [...props.form1, ...props.form2],
          rules: {
            $obj: function (data) {
              if (!data.id) {
                window.webix.message("아이디를 입력해주세요.");
                return false;
              }
              if (data.email != undefined) {
                const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
                if (!emailRegex.test(data.email)) {
                  alert("이메일 형식이 올바르지 않습니다.");
                  return false;
                }
              }
              if(data.pass1 != undefined) {
                if (!data.pass1) {
                  window.webix.message("비밀번호를 입력해주세요.");
                  return false;
                }
                if (data.pass1 != data.pass2) {
                  window.webix.message("비밀번호가 일치하지 않습니다. 다시 한번 확인해주세요.");
                  return false;
                }
                return true;
              }
            }
          }
        });
      }
    }

    return {
      myWebixRegister,
      init
    };
  }
};
</script>