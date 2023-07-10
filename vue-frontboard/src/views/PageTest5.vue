<template>
    <div class="test5">
      <h1>This is an test5 page</h1>
      <PageRegister :form1="form1" :form2="form2" formId="registerForm"/>
    </div>
  </template>
  
  <script>
  import PageRegister from './webixComponents/PageRegister.vue';
  
  export default {
    components: {
      PageRegister
    },
    setup() {
      const form1 = [
        { view: "text", label: "이름", name: "name", placeholder: "(e.g. John Smith)" },
        { view: "text", label: "아이디", name: "id", required: true, bottomLabel: "* spaces are allowed" },
        { view: "text", type: "password", label: "비밀번호", name: "pass1", bottomPadding: 35, bottomLabel: "* The password must have at least 6 characters" },
        { view: "text", type: "password", label: "비밀번호 재확인", name: "pass2", bottomPadding: 35 },
        { view: "text", label: "이메일", name: "email", placeholder: "(e.g. john@some.com)" }
      ];
  
      const form2 = [
        { view: "select", label: "Version", options: ["1.0", "1.5", "2.0"] },
        { view: "datepicker", inputWidth: 300, label: '생년월일', labelWidth: 90 },
        { view: "radio", label: "성별", labelPosition: "top", options: [{ id: "1", value: "남" }, { id: "2", value: "여" }], value: "1" },
        { view: "switch", label: "Light", labelWidth: 60, labelRight: "Darkness", value: 1 },
        { view: "switch", label: "Theme", labelWidth: 60, value: 0, onLabel: "DARK", offLabel: "LIGHT" },
        { view: "checkbox", labelRight: "동의", labelWidth: 0, value: 1 },
        { view: "button", value: "완료" ,click: handleRegister}
      ];
  
      function handleRegister() {
        if(this.getParentView().validate()) {
          const registerFormData = window.webix.$$("registerForm").getValues();
          console.log("받은 데이터? " + JSON.stringify(registerFormData));
          alert("회원가입 되었습니다.")
        }
      }
  
      return {
        form1,
        form2,
        handleRegister
      };
    }
  };
  </script>