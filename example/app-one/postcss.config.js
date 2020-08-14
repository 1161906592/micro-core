module.exports = {
  plugins: {
    "postcss-global-namespace": {
      getNameSpace(inputFile) {
        console.log(inputFile);
        return "#micro-appOne";
      }
    }
  }
};
