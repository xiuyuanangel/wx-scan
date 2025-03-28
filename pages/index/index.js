Page({
  data: {
    scanResult: '' // 存储扫描结果
  },

  // 扫码方法
  scanCode() {
    wx.scanCode({
      // 只针对二维码
      onlyFromCamera: false, // 允许从相册选择
      scanType: ['qrCode'], // 只扫描二维码
      success: (res) => {
        console.log('扫码成功：', res)
        this.setData({
          scanResult: res.result
        })
      },
      fail: (err) => {
        console.error('扫码失败：', err)
        wx.showToast({
          title: '扫码失败',
          icon: 'none',
          duration: 2000
        })
      }
    })
  },

  onLoad() {
    // 页面加载时执行
  }
})