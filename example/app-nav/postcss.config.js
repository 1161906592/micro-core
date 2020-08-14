module.exports = {
  "plugins": {
    "postcss-global-namespace": {
      getNameSpace (inputFile) {
        return "#micro-appNav";
      }
    }
  }
};
