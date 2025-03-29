App({
  onLaunch() {
    // 检查并初始化存储
    this.initStorage()
  },

  globalData: {
    maxHistoryItems: 50, // 最大历史记录数量
    supportedTypes: ['wifi', 'url', 'json', 'number', 'text'], // 支持的结果类型
    version: '1.0.0', // 应用版本号
    pendingBarcode: null // 待处理的商品条码
  },

  // 初始化存储
  initStorage() {
    try {
      // 检查历史记录
      const history = wx.getStorageSync('scanHistory')
      if (!history) {
        wx.setStorageSync('scanHistory', [])
      }

      // 清理过期的临时数据
      wx.removeStorageSync('lastScanResult')
    } catch (err) {
      console.error('初始化存储失败：', err)
    }
  },

  // 获取应用配置
  getConfig() {
    return {
      maxHistoryItems: this.globalData.maxHistoryItems,
      supportedTypes: this.globalData.supportedTypes,
      version: this.globalData.version
    }
  }
})