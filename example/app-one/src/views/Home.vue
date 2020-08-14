<template>
  <div class="home">
    <img alt="Vue logo" src="../assets/logo.png" />
    <div>
      修改全局状态值：<input type="text" v-model="name" @input="changeName" />
    </div>
  </div>
</template>

<script>
export default {
  name: "Home",
  data() {
    return {
      name: window.appStarter.asyncStore.getState().appNavStore.name
    };
  },
  methods: {
    changeName() {
      window.appStarter.asyncStore.dispatch({
        type: "NAV_NAME",
        name: this.name
      });
    }
  }
};
</script>
