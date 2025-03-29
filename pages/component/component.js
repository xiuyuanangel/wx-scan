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
    // 每次显示页面时刷新数据
    this.loadGroupList();
    // 如果有搜索关键词，重新执行搜索
    if (this.data.searchKeyword) {
      this.filterGroups();
    }
  },

  // 供其他页面调用的刷新方法
  refreshData() {
    this.loadGroupList();
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
      // 检查分组名称和描述
      const name = (group.name || '').toLowerCase();
      const desc = (group.description || '').toLowerCase();
      if (name.includes(keyword) || desc.includes(keyword)) {
        return true;
      }

      // 检查分组下的元件信息
      let components = [];
      try {
        const componentsKey = `components_${group.id}`;
        components = wx.getStorageSync(componentsKey) || [];
      } catch (error) {
        console.error(`获取分组 ${group.id} 的元件信息失败：`, error);
        return false;
      }

      // 使用提取的方法检查元件是否匹配
      return components.some(component => this.isComponentMatch(component, keyword));
    });

    // 更新过滤后的列表
    this.setData({
      filteredGroupList: filtered
    });

    // 统计匹配信息
    if (filtered.length > 0) {
      let totalMatchedComponents = 0;
      let matchedTypes = new Set();

      filtered.forEach(group => {
        try {
          const componentsKey = `group_components_${group.id}`;
          const components = wx.getStorageSync(componentsKey) || [];
          const matchedComponents = components.filter(component => {
            const isMatch = this.isComponentMatch(component, keyword);
            if (isMatch && component.type) {
              matchedTypes.add(component.type);
            }
            return isMatch;
          });

          totalMatchedComponents += matchedComponents.length;
        } catch (error) {
          console.error('计算匹配元件数量失败：', error);
        }
      });
    }
  },

  // 新增的公共搜索方法
  isComponentMatch(component, keyword) {
    const componentName = (component.name || '').toLowerCase();
    const componentType = (component.type || '').toLowerCase();
    const componentModel = (component.model || '').toLowerCase();
    const componentDesc = (component.description || '').toLowerCase();
    const componentSpecs = (component.specifications || '').toLowerCase();
    const componentParams = (component.parameters || '').toLowerCase();

    let paramsSearchText = '';
    try {
      const params = JSON.parse(component.parameters);
      paramsSearchText = Object.entries(params)
        .map(([key, value]) => `${key}${value}`)
        .join(' ')
        .toLowerCase();
    } catch (e) {
      paramsSearchText = componentParams;
    }

    return componentName.includes(keyword) ||
      componentType.includes(keyword) ||
      componentModel.includes(keyword) ||
      componentDesc.includes(keyword) ||
      componentSpecs.includes(keyword) ||
      paramsSearchText.includes(keyword);
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
    });
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
    });
  },

  // 显示二维码
  showQrCode(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({
      showQrCodePopup: true,
      currentQrCodeId: id
    }, () => {
      this.generateQrCode(id);
    });
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
      content: `确定要删除分组"${group.name}"吗？删除后该分组下的所有元件数据也将被删除，且无法恢复。`,
      success: (res) => {
        if (res.confirm) {
          try {
            // 开始删除操作
            wx.showLoading({
              title: '正在删除...',
              mask: true
            });

            // 1. 删除分组数据
            const groups = wx.getStorageSync('component_groups') || [];
            const newGroups = groups.filter(group => group.id !== id);
            wx.setStorageSync('component_groups', newGroups);

            // 2. 删除分组下的元件数据
            const componentsKey = `components_${id}`;
            wx.removeStorageSync(componentsKey);

            // 3. 删除分组统计数据
            const statsKey = `group_stats_${id}`;
            wx.removeStorageSync(statsKey);

            // 4. 通知其他页面分组已删除
            const pages = getCurrentPages();
            pages.forEach(page => {
              // 如果是详情页且显示的是被删除的分组，则返回上一页
              if (page.route === 'pages/component-detail/component-detail' && 
                  page.options.id === id) {
                wx.navigateBack({
                  delta: 1
                });
              }
              // 如果页面有refreshData方法，调用它刷新数据
              if (typeof page.refreshData === 'function') {
                page.refreshData();
              }
            });

            // 5. 更新当前页面显示
            if (this.data.searchKeyword && 
                this.data.filteredGroupList.length === 1 && 
                this.data.filteredGroupList[0].id === id) {
              this.clearSearch();
            } else {
              this.loadGroupList();
            }

            wx.hideLoading();
          } catch (error) {
            console.error('删除分组失败：', error);
            wx.hideLoading();
          }
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
        typeCount: 0,
        totalCount: 0,
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
      })
    })
  },

  // 显示分组详情
  showGroupDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/component-detail/component-detail?id=${id}`
    });
  },

  // 生成分组ID
  generateGroupId() {
    const timestamp = new Date().getTime()
    const random = Math.floor(Math.random() * 1000)
    return `G${timestamp}${random}`
  },

  // 生成组合图片（二维码+分组信息）
  async generateCombinedImage(groupId) {
    const query = wx.createSelectorQuery();
    const group = this.data.groupList.find(g => g.id === groupId);
    
    return new Promise((resolve, reject) => {
      query.select('#qrcode')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (res[0] && res[0].node) {
            const canvas = res[0].node;
            canvas.width = 800;  // 设置为二维码宽度的2倍，为右侧文本留出空间
            canvas.height = 400; // 保持二维码为正方形

            const ctx = canvas.getContext('2d');

            // 清空画布
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 先生成二维码
            const qrContent = JSON.stringify({
              type: 'component_group',
              id: groupId,
              time: new Date().getTime()
            });

            // 使用 Promise 包装二维码生成
            new Promise((resolveQr) => {
              drawQrcode({
                width: 400,
                height: 400,
                canvasId: 'qrcode',
                typeNumber: -1,
                correctLevel: QRErrorCorrectLevel.M,
                background: '#ffffff',
                foreground: '#000000',
                text: qrContent,
                callback: (res) => {
                  resolveQr(res);
                }
              });
            }).then(() => {
              // 绘制分割线
              ctx.beginPath();
              ctx.moveTo(420, 40);  // 留出一些边距
              ctx.lineTo(420, 360); // 不要占满整个高度
              ctx.strokeStyle = '#eee';
              ctx.stroke();

              // 绘制分组信息
              // 标题样式
              ctx.fillStyle = '#333333';
              ctx.font = 'bold 24px sans-serif';  // 增大字号
              ctx.fillText('分组信息', 460, 80);

              // 分组名称
              ctx.fillStyle = '#333333';
              ctx.font = 'bold 20px sans-serif';
              ctx.fillText('名称：', 460, 160);
              
              ctx.fillStyle = '#666666';
              ctx.font = '20px sans-serif';
              const groupName = group ? group.name : '';
              // 如果文本过长，进行截断
              const maxWidth = 280; // 最大宽度
              let displayName = groupName;
              if (ctx.measureText(groupName).width > maxWidth) {
                let ellipsis = '...';
                let textWidth = ctx.measureText(ellipsis).width;
                let i = groupName.length - 1;
                while (i > 0) {
                  textWidth += ctx.measureText(groupName[i]).width;
                  if (textWidth > maxWidth) {
                    displayName = groupName.slice(0, i) + ellipsis;
                    break;
                  }
                  i--;
                }
              }
              ctx.fillText(displayName, 460, 200);
              
              // 分组ID
              ctx.fillStyle = '#333333';
              ctx.font = 'bold 20px sans-serif';
              ctx.fillText('ID：', 460, 260);
              
              ctx.fillStyle = '#666666';
              ctx.font = '20px sans-serif';
              ctx.fillText(groupId, 460, 300);

              resolve(canvas);
            });
          } else {
            reject(new Error('Canvas not found'));
          }
        });
    });
  },

  // 分享功能
  onShareAppMessage(res) {
    if (res.from === 'button' && res.target.dataset.type === 'qrcode') {
      const group = this.data.groupList.find(g => g.id === this.data.currentQrCodeId);
      return {
        title: `${group ? group.name : '分组'}的元件管理二维码`,
        path: `/pages/component/component?scan=true&groupId=${this.data.currentQrCodeId}`,
        imageUrl: '', // 这里可以设置自定义分享图片
      };
    }
    return {
      title: '元件管理',
      path: '/pages/component/component'
    };
  },

  // 生成组合图片（二维码+分组信息）
  async generateCombinedImage(groupId) {
    const query = wx.createSelectorQuery();
    const group = this.data.groupList.find(g => g.id === groupId);
    
    return new Promise((resolve, reject) => {
      query.select('#qrcode')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (res[0] && res[0].node) {
            const canvas = res[0].node;
            canvas.width = 800;  // 设置为二维码宽度的2倍，为右侧文本留出空间
            canvas.height = 400; // 保持二维码为正方形

            const ctx = canvas.getContext('2d');

            // 清空画布
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 先生成二维码
            const qrContent = JSON.stringify({
              type: 'component_group',
              id: groupId,
              time: new Date().getTime()
            });

            // 使用 Promise 包装二维码生成
            new Promise((resolveQr) => {
              drawQrcode({
                width: 400,
                height: 400,
                canvasId: 'qrcode',
                typeNumber: -1,
                correctLevel: QRErrorCorrectLevel.M,
                background: '#ffffff',
                foreground: '#000000',
                text: qrContent,
                callback: (res) => {
                  resolveQr(res);
                }
              });
            }).then(() => {
              // 绘制分割线
              ctx.beginPath();
              ctx.moveTo(420, 40);  // 留出一些边距
              ctx.lineTo(420, 360); // 不要占满整个高度
              ctx.strokeStyle = '#eee';
              ctx.stroke();

              // 绘制分组信息
              // 标题样式
              ctx.fillStyle = '#333333';
              ctx.font = 'bold 24px sans-serif';  // 增大字号
              ctx.fillText('分组信息', 460, 80);

              // 分组名称
              ctx.fillStyle = '#333333';
              ctx.font = 'bold 20px sans-serif';
              ctx.fillText('名称：', 460, 160);
              
              ctx.fillStyle = '#666666';
              ctx.font = '20px sans-serif';
              const groupName = group ? group.name : '';
              // 如果文本过长，进行截断
              const maxWidth = 280; // 最大宽度
              let displayName = groupName;
              if (ctx.measureText(groupName).width > maxWidth) {
                let ellipsis = '...';
                let textWidth = ctx.measureText(ellipsis).width;
                let i = groupName.length - 1;
                while (i > 0) {
                  textWidth += ctx.measureText(groupName[i]).width;
                  if (textWidth > maxWidth) {
                    displayName = groupName.slice(0, i) + ellipsis;
                    break;
                  }
                  i--;
                }
              }
              ctx.fillText(displayName, 460, 200);
              
              // 分组ID
              ctx.fillStyle = '#333333';
              ctx.font = 'bold 20px sans-serif';
              ctx.fillText('ID：', 460, 260);
              
              ctx.fillStyle = '#666666';
              ctx.font = '20px sans-serif';
              ctx.fillText(groupId, 460, 300);

              resolve(canvas);
            });
          } else {
            reject(new Error('Canvas not found'));
          }
        });
    });
  },

  generateQrCode(groupId) {
    try {
      this.generateCombinedImage(groupId).catch(error => {
        console.error('生成组合图片失败：', error);
      });
    } catch (error) {
      console.error('生成二维码失败：', error);
    }
  },

  // 保存二维码到相册
  async saveQrCodeToAlbum() {
    wx.showLoading({
      title: '正在保存...',
      mask: true
    });

    try {
      const canvas = await this.generateCombinedImage(this.data.currentQrCodeId);
      
      // 将 canvas 转换为临时文件路径
      wx.canvasToTempFilePath({
        canvas: canvas,
        success: (res) => {
          // 保存图片到相册
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.hideLoading();
              wx.showToast({
                title: '已保存到相册',
                icon: 'success'
              });
            },
            fail: (err) => {
              wx.hideLoading();
              if (err.errMsg.includes('auth deny')) {
                wx.showModal({
                  title: '提示',
                  content: '需要您授权保存到相册',
                  success: (res) => {
                    if (res.confirm) {
                      wx.openSetting();
                    }
                  }
                });
              } else {
                wx.showToast({
                  title: '保存失败',
                  icon: 'error'
                });
              }
            }
          });
        },
        fail: () => {
          wx.hideLoading();
          wx.showToast({
            title: '生成图片失败',
            icon: 'error'
          });
        }
      });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '生成图片失败',
        icon: 'error'
      });
    }
  },

  // 分享功能
  async onShareAppMessage(res) {
    if (res.from === 'button' && res.target.dataset.type === 'qrcode') {
      const group = this.data.groupList.find(g => g.id === this.data.currentQrCodeId);
      
      try {
        const canvas = await this.generateCombinedImage(this.data.currentQrCodeId);
        const tempFile = await new Promise((resolve, reject) => {
          wx.canvasToTempFilePath({
            canvas: canvas,
            success: res => resolve(res.tempFilePath),
            fail: reject
          });
        });

        return {
          title: `${group ? group.name : '分组'}的元件管理二维码`,
          path: `/pages/component/component?scan=true&groupId=${this.data.currentQrCodeId}`,
          imageUrl: tempFile,
        };
      } catch (error) {
        console.error('生成分享图片失败：', error);
        return {
          title: `${group ? group.name : '分组'}的元件管理二维码`,
          path: `/pages/component/component?scan=true&groupId=${this.data.currentQrCodeId}`,
        };
      }
    }
    return {
      title: '元件管理',
      path: '/pages/component/component'
    };
  },

  // 创建二维码内容
  generateQrCodeContent(groupId) {
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
        }
      }
    });
  }
})