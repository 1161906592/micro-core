export default () => {
  const node = document.getElementById('global-loading')
  if (node) {
    document.body.removeChild(node)
  }
}
