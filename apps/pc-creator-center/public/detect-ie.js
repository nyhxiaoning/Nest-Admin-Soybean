/**
 * 检测 IE 浏览器并提示用户升级
 */
;(function () {
  var isIE = /*@cc_on!@*/ false || !!document.documentMode

  if (isIE) {
    var message = '您正在使用过时的浏览器，为了更好的体验，请升级您的浏览器。'
    alert(message)
  }
})()
