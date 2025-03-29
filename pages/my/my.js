
Page({
  data: {
    userInfo: {},
    hasUserInfo: false,
    version: '1.0.0',
    isCheckingUpdate: false
  },

  onLoad() {
    // 检查是否已有存储的用户信息
    const storedUserInfo = wx.getStorageSync('userInfo')
    if (storedUserInfo) {
      console.log('已有存储的用户信息：', storedUserInfo)
      this.setData({
        userInfo: storedUserInfo,
        hasUserInfo: true
      })
    }
    
    // 检查更新
    this.checkUpdate()
  },

  onShow() {
    // 每次显示页面时检查用户信息
    const storedUserInfo = wx.getStorageSync('userInfo')
    if (storedUserInfo) {
      console.log('页面显示，更新用户信息：', storedUserInfo)
      this.setData({
        userInfo: storedUserInfo,
        hasUserInfo: true
      })
    }
  },

  // 处理头像选择和登录
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    console.log('选择的头像URL：', avatarUrl)

    wx.showLoading({
      title: '登录中...',
      mask: true
    })

    // 获取登录凭证
    wx.login({
      success: (loginRes) => {
        if (loginRes.code) {
          console.log('登录成功，code:', loginRes.code)
          
          // 构建用户信息
          const userInfo = {
            avatarUrl: avatarUrl,
            nickName: '微信用户' // 默认昵称
          }
          
          // 更新状态并保存
          this.setData({
            userInfo: userInfo,
            hasUserInfo: true
          }, () => {
            wx.setStorageSync('userInfo', userInfo)
            wx.hideLoading()
            wx.showToast({
              title: '登录成功',
              icon: 'success',
              duration: 2000
            })
          })
        } else {
          console.error('登录失败：', loginRes)
          wx.hideLoading()
          wx.showToast({
            title: '登录失败',
            icon: 'none',
            duration: 2000
          })
        }
      },
      fail: (err) => {
        console.error('登录失败：', err)
        wx.hideLoading()
        wx.showToast({
          title: '登录失败',
          icon: 'none',
          duration: 2000
        })
      }
    })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            // 清除用户信息
            wx.removeStorageSync('userInfo')
            
            // 重置状态
            this.setData({
              userInfo: {},
              hasUserInfo: false
            }, () => {
              // 确保状态更新后再显示提示
              wx.showToast({
                title: '已退出登录',
                icon: 'success',
                duration: 2000
              })
            })
          } catch (err) {
            console.error('退出登录失败：', err)
            wx.showToast({
              title: '退出失败',
              icon: 'none',
              duration: 2000
            })
          }
        }
      }
    })
  },

  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '提示',
      content: '确定要清除缓存吗？这将清除所有本地存储的数据，包括用户信息和扫码历史。',
      success: (res) => {
        if (res.confirm) {
          try {
            // 清除用户信息
            wx.removeStorageSync('userInfo')
            // 清除扫码历史
            wx.removeStorageSync('scanHistory')
            
            // 重置用户信息状态
            this.setData({
              userInfo: {},
              hasUserInfo: false
            })

            wx.showToast({
              title: '缓存已清除',
              icon: 'success',
              duration: 2000
            })
          } catch (err) {
            console.error('清除缓存失败：', err)
            wx.showToast({
              title: '清除失败',
              icon: 'none',
              duration: 2000
            })
          }
        }
      }
    })
  },

  // 检查更新
  checkUpdate() {
    this.setData({ isCheckingUpdate: true })
    
    const updateManager = wx.getUpdateManager()
    
    updateManager.onCheckForUpdate((res) => {
      if (res.hasUpdate) {
        wx.showModal({
          title: '更新提示',
          content: '发现新版本，是否重启应用？',
          success: (res) => {
            if (res.confirm) {
              updateManager.applyUpdate()
            }
          }
        })
      }
    })

    updateManager.onUpdateReady(() => {
      wx.showModal({
        title: '更新提示',
        content: '新版本已经准备好，是否重启应用？',
        success: (res) => {
          if (res.confirm) {
            updateManager.applyUpdate()
          }
        }
      })
    })

    updateManager.onUpdateFailed(() => {
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      })
    })

    this.setData({ isCheckingUpdate: false })
  },

  // 跳转到商品管理
  goToProduct() {
    wx.navigateTo({
      url: '/pages/product/product'
    })
  },

  // 显示关于我们
  showAbout() {
    wx.showModal({
      title: '关于我们',
      content: `这是一个简单的二维码扫描工具，支持扫描并保存二维码内容，方便用户随时查看历史记录。\n\n开发者：Craft\n版本：${this.data.version}${this.data.isCheckingUpdate ? ' (检查更新中...)' : ''}`,
      showCancel: false,
      confirmText: '我知道了'
    })
  }
})