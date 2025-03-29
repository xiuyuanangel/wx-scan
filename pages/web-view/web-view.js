
Page({
  data: {
    url: ''
  },

  onLoad: function () {
    const app = getApp()
    const url = app.globalData.webViewUrl || ''
    console.log('网址',url)
    this.setData({
      url: url
    })
  }
})