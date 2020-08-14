<template>
  <div class="nav">
    <div @click="linkTo('/one')">one</div>
    <div @click="linkTo('/b')">路由拦截</div>
    <div @click="linkTo('/c')">c</div>
    <div @click="refresh">刷新</div>
    <div>全局状态值：{{ name }}</div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      name: window.appStarter.asyncStore.getState().appNavStore.name
    };
  },
  created() {
    const store = window.appStarter.asyncStore;
    this.unsubscribe = store.subscribe(() => {
      this.name = store.getState().appNavStore.name;
    });
  },
  destroyed() {
    this.unsubscribe();
  },
  methods: {
    linkTo(path) {
      window.appStarter.router.push(path);
    },
    refresh() {
      window.appStarter.router.go(0);
    }
  }
};
</script>

<style lang="scss" scoped>
.nav {
  position: fixed;
  top: 0;
  width: 100%;
  padding: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  div {
    padding: 0 32px;
    & + div {
      border-left: 2px solid #999;
    }
  }
}
</style>
