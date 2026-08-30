// 内容 Mock —— list/single 栏目下的记录，按 channelKey 分组持久化
let cseed = 5000
const cid = () => ++cseed
const now = () => new Date().toLocaleString('zh-CN', { hour12: false })

// 按 channelKey 分组的内容库（初始样例数据来自截图）
const store = {
  'home-intro': [
    { id: cid(), channelKey: 'home-intro', title: '您身边专业的智慧能源提供商', sort: 218, isTop: true, createTime: '2021-8-31 15:36:14' },
    { id: cid(), channelKey: 'home-intro', title: '联系人', sort: 1052, isTop: false, createTime: '2024-10-16 14:53:47' }
  ],
  'home-business': [
    { id: cid(), channelKey: 'home-business', title: '节能咨询设计服务', sort: 222, isTop: false, createTime: '2021-8-31 15:40:46' },
    { id: cid(), channelKey: 'home-business', title: '智慧能源综合服务', sort: 221, isTop: false, createTime: '2021-8-31 15:40:08' },
    { id: cid(), channelKey: 'home-business', title: '智慧能源技术服务', sort: 220, isTop: false, createTime: '2021-8-31 15:41:20' },
    { id: cid(), channelKey: 'home-business', title: '未来人居环境服务', sort: 219, isTop: false, createTime: '2021-8-31 15:38:36' }
  ],
  'home-view': [
    { id: cid(), channelKey: 'home-view', title: '北京电视台财经频道《数说北京》栏目', sort: 986, isTop: false, createTime: '2022-9-15 10:40:37' },
    { id: cid(), channelKey: 'home-view', title: '北京电视台财经频道《北京直通车》栏目', sort: 985, isTop: false, createTime: '2022-9-15 10:12:52' },
    { id: cid(), channelKey: 'home-view', title: '全国卫生产业企业管理协会医院建筑工程装备分会', sort: 944, isTop: false, createTime: '2021-10-13 17:56:53' },
    { id: cid(), channelKey: 'home-view', title: '中国节能协会节能服务产业委员会', sort: 930, isTop: false, createTime: '2021-10-13 17:56:37' }
  ],
  'hvac-category': [
    { id: cid(), channelKey: 'hvac-category', name: '多联机、单元机', sort: 934, isTop: false, createTime: '2021-8-30 17:33:28' },
    { id: cid(), channelKey: 'hvac-category', name: '冷水机组、热泵机组', sort: 933, isTop: false, createTime: '2021-8-30 17:31:57' },
    { id: cid(), channelKey: 'hvac-category', name: '空调末端设备', sort: 101, isTop: false, createTime: '2021-11-15 13:17:36' },
    { id: cid(), channelKey: 'hvac-category', name: '精密空调', sort: 100, isTop: false, createTime: '2021-11-15 13:18:03' },
    { id: cid(), channelKey: 'hvac-category', name: '锅炉', sort: 97, isTop: false, createTime: '2021-9-9 11:40:43' },
    { id: cid(), channelKey: 'hvac-category', name: '直燃机', sort: 95, isTop: false, createTime: '2021-10-12 9:52:36' }
  ],
  'hvac-product': [
    { id: cid(), channelKey: 'hvac-product', title: '大金——VRV 水源热泵系列', sort: 911, isTop: false, createTime: '2021-9-9 14:39:15' },
    { id: cid(), channelKey: 'hvac-product', title: '大金——VRV 更新用Q系列', sort: 910, isTop: false, createTime: '2021-9-9 14:40:28' },
    { id: cid(), channelKey: 'hvac-product', title: '大金——VRV 大空间用系列', sort: 909, isTop: false, createTime: '2021-9-9 14:41:10' }
  ],
  'case-industry': [
    { id: cid(), channelKey: 'case-industry', title: '医疗卫生', sort: 21, isTop: false, createTime: '2021-8-27 10:45:32' },
    { id: cid(), channelKey: 'case-industry', title: '教育文体', sort: 20, isTop: false, createTime: '2021-8-27 10:45:38' },
    { id: cid(), channelKey: 'case-industry', title: '政府/事业单位', sort: 19, isTop: false, createTime: '2021-8-27 10:45:24' },
    { id: cid(), channelKey: 'case-industry', title: '商业/办公楼/厂房', sort: 18, isTop: false, createTime: '2021-8-27 10:45:15' }
  ]
}

const list = (key) => (store[key] || (store[key] = []))

export default [
  {
    url: '/api/content/list',
    method: 'get',
    response: ({ query }) => {
      let data = [...list(query.channelKey)]
      if (query.keyword) {
        const kw = query.keyword
        data = data.filter(d => (d.title || d.name || '').includes(kw))
      }
      // 创建日期范围筛选
      if (query.startDate) data = data.filter(d => (d.createTime || '') >= query.startDate)
      if (query.endDate) data = data.filter(d => (d.createTime || '') <= query.endDate + ' 23:59:59')
      // 置顶优先，其次按 sort 降序
      data.sort((a, b) => (Number(b.isTop) - Number(a.isTop)) || ((b.sort || 0) - (a.sort || 0)))
      return { code: 200, message: '获取成功', data }
    }
  },
  {
    url: '/api/content/detail',
    method: 'get',
    response: ({ query }) => {
      const item = list(query.channelKey).find(d => d.id === Number(query.id))
      return { code: 200, message: '获取成功', data: item || null }
    }
  },
  {
    url: '/api/content/save',
    method: 'post',
    response: ({ body }) => {
      const arr = list(body.channelKey)
      if (body.id) {
        const item = arr.find(d => d.id === body.id)
        if (item) Object.assign(item, body)
      } else {
        arr.push({ ...body, id: cid(), createTime: now() })
      }
      return { code: 200, message: '保存成功', data: null }
    }
  },
  {
    url: '/api/content/delete',
    method: 'delete',
    response: ({ query }) => {
      const arr = list(query.channelKey)
      const ids = String(query.ids).split(',').map(Number)
      for (let i = arr.length - 1; i >= 0; i--) {
        if (ids.includes(arr[i].id)) arr.splice(i, 1)
      }
      return { code: 200, message: '删除成功', data: null }
    }
  },
  {
    url: '/api/content/top',
    method: 'put',
    response: ({ body }) => {
      const item = list(body.channelKey).find(d => d.id === body.id)
      if (item) item.isTop = !item.isTop
      return { code: 200, message: '操作成功', data: null }
    }
  },
  {
    url: '/api/content/sort',
    method: 'put',
    response: ({ body }) => {
      const item = list(body.channelKey).find(d => d.id === body.id)
      if (item) item.sort = body.sort
      return { code: 200, message: '操作成功', data: null }
    }
  }
]
