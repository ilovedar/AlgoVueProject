<template>
  <div class="test4">
    <h1>This is a test4 page</h1>
    <PageLogin :form1="form1" formId="loginForm" />
  </div>
</template>

<script>
import PageLogin from './webixComponents/PageLogin.vue';

export default {
  setup() {
    const form1 = [
      { view: "text", type: 'email', name: 'email', label: "Email" },
      { view: "text", type: 'password', name: 'password', label: "Password" },
      {
        margin: 5, cols: [
          { view: "button", value: "Login", css: "webix_primary", click: login }
        ]
      }
    ];

    function login() {
      const loginFormData = window.webix.$$("loginForm").getValues();
      const email = loginFormData.email;
      const password = loginFormData.password;
      console.log("email : " + email);
      console.log("password : " + password);

      if (email === "seungyeon@algograp.com" && password === "1234") {
        console.log("로그인 성공");
        alert("로그인 성공");
      } else {
        console.log("로그인 실패");
        alert("이메일 혹은 비밀번호가 올바르지 않습니다.");
      }
    }

    return {
      form1,
      login
    };
  },
  components: {
    PageLogin,
  }
};
</script>