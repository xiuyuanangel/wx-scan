
// 引入二维码生成工具
const { drawQrcode, QRErrorCorrectLevel } = require('../../utils/weapp-qrcode.js')

Page({
  data: {
    groupList: [], // 分组列表
    filteredGroupList: [], // 过滤后的分组列表
    showGroupForm: false, // 是否显示分组表单
    showQrCodePopup: false, // 是否显示二维码弹窗
    editGroup: null, // 当前编辑的分组
    formData: { // 表单数据
      id: '',
      name: '',
      description: ''
    },
    currentQrCodeId: '', // 当前显示二维码的分组ID
    searchKeyword: '', // 搜索关键词
    searchHistory: [], // 搜索历史
    showSearchHistory: false // 是否显示搜索历史
  },

  onLoad() {
    this.loadGroupList();
    this.loadSearchHistory();
    this.searchTimer = null;
  },

  onShow() {
    // 如果有搜索关键词，重新执行搜索
    if (this.data.searchKeyword) {
      this.filterGroups();
    }
  },

  // 加载分组列表
  loadGroupList() {
    const groups = wx.getStorageSync('component_groups') || [];
    this.setData({ 
      groupList: groups,
      filteredGroupList: groups // 初始时显示所有分组
    });
  },

  // 加载搜索历史
  loadSearchHistory() {
    const history = wx.getStorageSync('search_history') || [];
    this.setData({ searchHistory: history });
  },

  // 保存搜索历史
  saveSearchHistory(keyword) {
    if (!keyword.trim()) return;
    
    let history = wx.getStorageSync('search_history') || [];
    // 删除已存在的相同关键词
    history = history.filter(item => item !== keyword);
    // 添加到开头
    history.unshift(keyword);
    // 限制历史记录数量
    if (history.length > 10) {
      history = history.slice(0, 10);
    }
    
    wx.setStorageSync('search_history', history);
    this.setData({ searchHistory: history });
  },

  // 清除搜索历史
  clearSearchHistory() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('search_history');
          this.setData({ 
            searchHistory: [],
            showSearchHistory: false
          });
        }
      }
    });
  },

  onUnload() {
    // 清理定时器
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
  },

  // 搜索框获得焦点
  onSearchFocus() {
    this.setData({
      showSearchHistory: true
    });
  },

  // 搜索框失去焦点
  onSearchBlur() {
    // 延迟隐藏搜索历史，以便能点击历史记录
    setTimeout(() => {
      this.setData({
        showSearchHistory: false
      });
    }, 200);
  },

  // 搜索输入处理（带防抖）
  onSearchInput(e) {
    const keyword = e.detail.value;
    
    // 清除之前的定时器
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    // 设置新的定时器
    this.searchTimer = setTimeout(() => {
      this.setData({
        searchKeyword: keyword
      }, () => {
        this.filterGroups();
        if (keyword.trim()) {
          this.saveSearchHistory(keyword);
        }
      });
    }, 300); // 300ms 的防抖延迟
  },

  // 点击历史记录项
  onHistoryItemTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({
      searchKeyword: keyword,
      showSearchHistory: false
    }, () => {
      this.filterGroups();
    });
  },

  // 清除搜索
  clearSearch() {
    this.setData({
      searchKeyword: ''
    }, () => {
      this.filterGroups();
    });
  },

  // 过滤分组列表
  filterGroups() {
    const { groupList, searchKeyword } = this.data;
    
    if (!searchKeyword) {
      // 如果没有搜索关键词，显示全部
      this.setData({
        filteredGroupList: groupList
      });
      return;
    }

    // 执行搜索过滤
    const keyword = searchKeyword.toLowerCase();
    const filtered = groupList.filter(group => {
      const name = (group.name || '').toLowerCase();
      const desc = (group.description || '').toLowerCase();
      return name.includes(keyword) || desc.includes(keyword);
    });

    this.setData({
      filteredGroupList: filtered
    });
  },

  // 显示添加分组表单
  showAddGroup() {
    this.setData({
      showGroupForm: true,
      editGroup: null,
      formData: {
        id: this.generateGroupId(),
        name: '',
        description: ''
      }
    })
  },

  // 隐藏分组表单
  hideGroupForm() {
    this.setData({
      showGroupForm: false,
      editGroup: null,
      formData: {
        id: '',
        name: '',
        description: ''
      }
    })
  },

  // 显示二维码
  showQrCode(e) {
    const { id } = e.currentTarget.dataset
    this.setData({
      showQrCodePopup: true,
      currentQrCodeId: id
    }, () => {
      this.generateQrCode(id)
    })
  },

  // 隐藏二维码
  hideQrCode() {
    // 获取 canvas 上下文并清除内容
    const query = wx.createSelectorQuery();
    query.select('#qrcode')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res[0] && res[0].node) {
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      });

    this.setData({
      showQrCodePopup: false,
      currentQrCodeId: ''
    });
  },

  // 删除分组
  deleteGroup(e) {
    const { id } = e.currentTarget.dataset;
    
    // 获取要删除的分组信息
    const group = this.data.groupList.find(g => g.id === id);
    if (!group) return;

    wx.showModal({
      title: '确认删除',
      content: `确定要删除分组"${group.name}"吗？删除后无法恢复。`,
      success: (res) => {
        if (res.confirm) {
          // 获取现有分组
          const groups = wx.getStorageSync('component_groups') || [];
          // 过滤掉要删除的分组
          const newGroups = groups.filter(group => group.id !== id);
          // 保存更新后的分组列表
          wx.setStorageSync('component_groups', newGroups);

          // 如果当前有搜索关键词，且删除后搜索结果为空，则清空搜索
          if (this.data.searchKeyword && 
              this.data.filteredGroupList.length === 1 && 
              this.data.filteredGroupList[0].id === id) {
            this.clearSearch();
          } else {
            // 否则仅刷新列表
            this.loadGroupList();
          }
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  },

  // 清除搜索并重置列表
  clearSearch() {
    this.setData({
      searchKeyword: ''
    }, () => {
      this.loadGroupList();
    });
  },

  // 处理输入
  onInput(e) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    this.setData({
      [`formData.${field}`]: value
    })
  },

  // 保存分组
  saveGroup() {
    const { formData, editGroup } = this.data
    
    // 验证输入
    if (!formData.name) {
      wx.showToast({
        title: '请输入分组名称',
        icon: 'none'
      })
      return
    }

    // 获取现有分组
    const groups = wx.getStorageSync('component_groups') || []
    
    if (editGroup) {
      // 编辑模式
      const index = groups.findIndex(g => g.id === editGroup)
      if (index !== -1) {
        groups[index] = { 
          ...groups[index],
          ...formData,
          updateTime: new Date().getTime()
        }
      }
    } else {
      // 添加模式
      groups.push({
        ...formData,
        count: 0,
        createTime: new Date().getTime(),
        updateTime: new Date().getTime()
      })
    }

    // 保存到存储
    wx.setStorageSync('component_groups', groups)
    
    // 刷新列表并关闭表单
    this.loadGroupList()
    this.hideGroupForm()

    // 清空搜索状态
    this.setData({
      searchKeyword: ''
    }, () => {
      // 保存成功后显示二维码
      const groupId = formData.id
      this.setData({
        showQrCodePopup: true,
        currentQrCodeId: groupId
      }, () => {
        this.generateQrCode(groupId)
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })
      })
    })
  },

  // 显示分组详情
  showGroupDetail(e) {
    const { id } = e.currentTarget.dataset
    // TODO: 跳转到分组详情页面
    wx.showToast({
      title: '分组详情开发中',
      icon: 'none'
    })
  },

  // 生成分组ID
  generateGroupId() {
    const timestamp = new Date().getTime()
    const random = Math.floor(Math.random() * 1000)
    return `G${timestamp}${random}`
  },

  // 生成二维码
  generateQrCode(groupId) {
    try {
      // 创建二维码内容
      const qrContent = JSON.stringify({
        type: 'component_group',
        id: groupId,
        time: new Date().getTime()
      });

      // 使用 weapp-qrcode 生成二维码
      drawQrcode({
        width: 200,
        height: 200,
        canvasId: 'qrcode',
        typeNumber: -1, // 自动计算类型
        correctLevel: QRErrorCorrectLevel.M, // 使用 M 级别的纠错
        background: '#ffffff',
        foreground: '#000000',
        text: qrContent,
        callback: (res) => {
          if (res && res.errMsg != 'ok') {
            console.error('生成二维码失败：', res.errMsg);
            wx.showToast({
              title: '生成二维码失败',
              icon: 'none'
            });
          }
        }
      });
    } catch (error) {
      console.error('生成二维码失败：', error);
      wx.showToast({
        title: '生成二维码失败',
        icon: 'none'
      });
    }
  }
})