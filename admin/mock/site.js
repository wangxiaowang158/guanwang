// 基本信息 Mock（单例）—— 截图字段
let site = {
  webTitle: '中瑞恒——让建筑更节能 让环境更舒适',
  keywords: '暖通空调系统集成,EMC合同能源管理,综合能源节能服务,能源托管运营,智慧能源管理,能源数智化,中央空调,精密空调,净化工程,热泵节能',
  description: '国家高新技术企业、国家专精特新小巨人企业。立足智慧能源领域，以数字化的方式重构能源系统，为用户提供多场景数智解决方案，促进能源高效利用、推动能源产业数智化转型和能源技术变革。',
  phone: '010-53608607',
  website: 'www.zruiheng.com',
  recruitEmail: 'zrh30000@126.com',
  contactEmail: 'hengmarketing@163.com',
  address: '北京市顺义区空港融慧园6号楼',
  mapLng: '116.56',
  mapLat: '40.09',
  mapLink: 'https://j.map.baidu.com/e0/RDH',
  copyright: 'COPYRIGHT@ 中瑞恒(北京)科技有限公司    地址：北京市顺义区空港融慧园6号楼\n<a href="https://beian.miit.gov.cn" target="_blank">京ICP备11010169号-1</a>',
  logo: '/static/images/logo.png',
  footerLogo: '/static/images/logo02.png',
  wechatQr: '/static/images/erweima.png',
  // 网站模板：'1' 样式一（深蓝科技风）| '2' 样式二（集团品牌风）
  template: '1',
  // 首页 Hero 背景媒体：视频优先于图片，二者皆空则用默认渐变背景
  heroImage: '',
  heroVideo: ''
}

export default [
  {
    url: '/api/site/detail',
    method: 'get',
    response: () => ({ code: 200, message: '获取成功', data: site })
  },
  {
    url: '/api/site/save',
    method: 'post',
    response: ({ body }) => {
      site = { ...site, ...body }
      return { code: 200, message: '保存成功', data: null }
    }
  }
]
