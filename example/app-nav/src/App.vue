<template>
  <div class="nav">
    <div @click="linkTo('/one')">one</div>
    |
    <div @click="linkTo('/b')">b</div>
    |
    <div @click="linkTo('/c')">c</div>
    |
    <div @click="refresh">刷新</div>
  </div>
</template>

<script>
export default {
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
}
</style>
