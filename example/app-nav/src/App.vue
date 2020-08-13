<template>
  <div id="app">
    <div class="nav">
      <div @click="linkTo('/list')">list</div>
      |
      <div @click="linkTo('/b')">b</div>
      |
      <div @click="linkTo('/c')">c</div>
      |
      <div @click="refresh">刷新</div>
    </div>
  </div>
</template>

<script>
export default {
  methods: {
    linkTo(path) {
      window.microRouter.push(path);
    },
    refresh() {
      window.microRouter.go(0);
    }
  }
};
</script>

<style lang="scss" scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

.nav {
  padding: 30px;
  display: flex;
  align-items: center;
  width: 200px;
  margin: auto;
}
</style>
