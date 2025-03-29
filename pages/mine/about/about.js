
Page({
  data: {
    version: '1.0.0'
  },

  onLoad() {
    // 可以在这里获取实际的版本号
    const version = wx.getAccountInfoSync().miniProgram.version || '1.0.0';
    this.setData({ version });
  },

  // 复制版本号
  copyVersion() {
    wx.setClipboardData({
      data: this.data.version,
      success() {
        wx.showToast({
          title: '版本号已复制',
          icon: 'success'
        });
      }
    });
  }
});