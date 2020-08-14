module.exports = {
  plugins: {
    "postcss-global-namespace": {
      getNameSpace(inputFile) {
        console.log(inputFile);
        return "#whale-appOne";
      }
    }
  }
};
