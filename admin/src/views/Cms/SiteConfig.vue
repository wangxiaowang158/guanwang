<template>
  <div class="site-config">
    <div class="form-card">
      <a-spin :spinning="loading">
        <a-tabs v-model:active-key="tab" class="cfg-tabs">
          <a-tab-pane key="basic" tab="基本信息" />
          <a-tab-pane key="home" tab="首页布局" />
          <a-tab-pane key="footer" tab="页脚设置" />
          <a-tab-pane key="ext" tab="统计与显示" />
        </a-tabs>
        <!-- 各页签独立保存：首页布局、页脚、统计与显示只提交自己的字段，不会把另一页签未保存的修改带上去。
             导航顺序与显隐统一在「栏目管理」的栏目树上调整，这里不再重复提供入口 -->
        <HomeLayoutPanel
          v-if="tab === 'home'"
          :value="form.homeLayout"
          :contact-heading="form.contactHeading"
          :website="form.website"
          :channels="channels"
          @saved="(v) => (form.homeLayout = v)"
        />
        <FooterPanel v-else-if="tab === 'footer'" :value="form.footerConfig" :channels="channels" @saved="(v) => (form.footerConfig = v)" />
        <ExtPanel v-else-if="tab === 'ext'" :value="form.extConfig" @saved="(v) => (form.extConfig = v)" />
        <a-form
          v-show="tab === 'basic'" ref="formRef" :model="form" :rules="rules" :label-col="{ style: { width: '110px' } }">
          <a-divider orientation="left" class="group-title group-title--first">品牌与模板</a-divider>
          <a-form-item label="网站模板" name="template">
            <div class="template-row">
              <a-radio-group v-model:value="form.template">
                <a-radio value="1">样式一（深蓝科技风）</a-radio>
                <a-radio value="2">样式二（集团品牌风）</a-radio>
              </a-radio-group>
              <a-button type="link" class="preview-btn" @click="previewOpen = true">
                <EyeOutlined /> 样式预览
              </a-button>
            </div>
            <div class="field-tip">切换后前台官网整体视觉随之变化，内容数据不受影响</div>
          </a-form-item>
          <a-form-item label="网站名称" name="webTitle" extra="显示在浏览器标签页与搜索结果标题里">
            <a-input v-model:value="form.webTitle" :maxlength="200" />
          </a-form-item>
          <a-form-item label="公司全称" name="companyName" extra="版权兜底文案与隐私政策里的主体名称；留空用「北京中瑞恒有限责任公司」">
            <a-input v-model:value="form.companyName" :maxlength="100" placeholder="北京中瑞恒有限责任公司" />
          </a-form-item>
          <a-form-item label="公司简称" name="companyShort" extra="没上传 LOGO 时页头页脚显示的文字；留空用「中瑞恒」">
            <a-input v-model:value="form.companyShort" :maxlength="30" placeholder="中瑞恒" />
          </a-form-item>
          <a-form-item label="英文名" name="companyEn" extra="文字 LOGO 下方的一行英文；留空用「ZRUIHENG」">
            <a-input v-model:value="form.companyEn" :maxlength="50" placeholder="ZRUIHENG" />
          </a-form-item>
          <a-form-item label="站点图标" name="favicon">
            <ImageUpload v-model="form.favicon" raw ai-scene="square" tip="浏览器标签页上的小图标，建议 64×64px 方形 PNG" />
          </a-form-item>
          <a-form-item label="网站 LOGO" name="logo">
            <ImageUpload v-model="form.logo" raw ai-scene="square" tip="页头左上角，建议 180×50px 透明底 PNG" />
          </a-form-item>
          <a-form-item label="页脚 LOGO" name="footerLogo">
            <ImageUpload v-model="form.footerLogo" raw ai-scene="square" tip="页脚深色底上显示，建议浅色版，180×50px" />
          </a-form-item>

          <a-divider orientation="left" class="group-title">首页首屏</a-divider>
          <a-form-item label="主标语" name="slogan" extra="首屏最大的一行标题">
            <a-input v-model:value="form.slogan" :maxlength="200" />
          </a-form-item>
          <a-form-item label="副标语" name="subSlogan" extra="首屏主标语上方的一行小字，页脚简介也会引用；留空用内置文案">
            <a-input v-model:value="form.subSlogan" :maxlength="200" />
          </a-form-item>
          <a-form-item label="背景视频" name="heroVideo">
            <VideoUpload v-model="form.heroVideo" />
            <div class="field-tip">
              配了视频优先播放视频（自动静音循环）；手机端为省流量改显示下方背景图
            </div>
          </a-form-item>
          <a-form-item label="背景图" name="heroImage">
            <ImageUpload v-model="form.heroImage" ai-scene="banner" tip="建议 1920×1080px；没配视频时显示，也是视频加载前的画面" />
          </a-form-item>
          <a-form-item label="主按钮文字" name="heroPrimaryText" extra="点击后弹出预约表单（需求类型预选「节能测算」）；留空显示「免费节能测算」">
            <a-input v-model:value="form.heroPrimaryText" :maxlength="20" placeholder="免费节能测算" />
          </a-form-item>
          <a-form-item label="次按钮文字" name="heroSecondaryText" extra="点击后滚动到首页第一个板块；留空显示「了解业务」">
            <a-input v-model:value="form.heroSecondaryText" :maxlength="20" placeholder="了解业务" />
          </a-form-item>
          <a-form-item label="数据口径" name="heroStatsNote" extra="显示在首屏业绩数字下方，注明统计时间与来源更可信；留空不显示">
            <a-input v-model:value="form.heroStatsNote" :maxlength="60" placeholder="如：数据截至 2026.06，来源：中瑞恒能源管理平台" />
          </a-form-item>

          <a-divider orientation="left" class="group-title">联系方式</a-divider>
          <a-form-item label="联系电话" name="phone">
            <a-input v-model:value="form.phone" :maxlength="50" />
          </a-form-item>
          <a-form-item label="联系邮箱" name="contactEmail">
            <a-input v-model:value="form.contactEmail" :maxlength="100" />
          </a-form-item>
          <a-form-item label="招聘邮箱" name="recruitEmail">
            <a-input v-model:value="form.recruitEmail" :maxlength="100" />
          </a-form-item>
          <a-form-item label="公司地址" name="address">
            <a-input v-model:value="form.address" :maxlength="200" />
          </a-form-item>
          <a-form-item label="地图链接" name="mapLink" extra="点击地址时打开的地图页，可在百度/高德地图里搜索公司后复制分享链接">
            <a-input v-model:value="form.mapLink" :maxlength="500" placeholder="https://" />
          </a-form-item>
          <a-form-item label="微信二维码" name="wechatQr">
            <ImageUpload v-model="form.wechatQr" raw no-ai tip="建议 300×300px，请上传公众号后台下载的二维码原图" />
          </a-form-item>
          <a-divider orientation="left" class="group-title">搜索引擎</a-divider>
          <a-form-item label="网站域名" name="website" extra="正式访问地址，用于分享卡片、搜索收录与后台预览；不写 https:// 时自动补上">
            <a-input v-model:value="form.website" :maxlength="200" placeholder="如 www.example.com" />
          </a-form-item>
          <a-form-item label="搜索关键词" name="keywords" extra="多个词用英文逗号分隔，如：智慧能源,建筑节能">
            <a-textarea v-model:value="form.keywords" :rows="2" :maxlength="500" />
          </a-form-item>
          <a-form-item label="搜索摘要" name="description" extra="搜索结果标题下方的一段介绍，建议 150 字以内">
            <a-textarea v-model:value="form.description" :rows="3" :maxlength="1000" show-count />
          </a-form-item>
          <a-form-item label="默认分享图" name="shareImage">
            <ImageUpload v-model="form.shareImage" raw ai-scene="cover" tip="链接分享到微信等处时的卡片图，建议 1200×630px；文章有封面时用封面" />
          </a-form-item>
          <!-- 首页在搜索结果与微信里的样子，填上面几项时即时变化 -->
          <a-form-item label="效果预览">
            <SeoPreview :title="form.webTitle" :description="form.description" :image="form.shareImage" :url="form.website" />
          </a-form-item>

          <a-divider orientation="left" class="group-title">页脚备案</a-divider>
          <a-form-item label="版权信息" name="copyright" extra="支持换行；可写超链接，如 &lt;a href=&quot;https://beian.miit.gov.cn&quot;&gt;备案查询&lt;/a&gt;">
            <a-textarea v-model:value="form.copyright" :rows="3" :maxlength="300" />
          </a-form-item>
          <a-form-item label="ICP 备案号" name="icpCode" extra="留空则页脚不显示">
            <a-input v-model:value="form.icpCode" :maxlength="100" placeholder="如 京ICP备12345678号" />
          </a-form-item>
          <a-form-item label="公安备案号" name="policeCode" extra="留空则页脚不显示">
            <a-input v-model:value="form.policeCode" :maxlength="100" placeholder="如 京公网安备11010502000000号" />
          </a-form-item>
          <a-form-item :wrapper-col="{ offset: 0 }" class="form-actions">
            <a-button type="primary" :loading="saving" @click="onSave">保存</a-button>
          </a-form-item>
        </a-form>
      </a-spin>
    </div>

    <!-- 样式预览弹窗 -->
    <TemplatePreview v-model:open="previewOpen" :current="form.template" @apply="onApplyTemplate" />
  </div>
</template>

<script setup lang="ts">
// 基本信息管理（单例）：进入展示当前配置，编辑后保存
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import { EyeOutlined } from '@ant-design/icons-vue'
import { getChannelList, getSiteInfo, saveSiteInfo, type Channel, type SiteInfo } from '@/api/cms'
import { sanitizeHtml } from '@/utils/sanitize'
import ImageUpload from './components/ImageUpload.vue'
import SeoPreview from '@/components/SeoPreview/index.vue'
import VideoUpload from './components/VideoUpload.vue'
import TemplatePreview from './components/TemplatePreview.vue'
import HomeLayoutPanel from './components/site/HomeLayoutPanel.vue'
import FooterPanel from './components/site/FooterPanel.vue'
import ExtPanel from './components/site/ExtPanel.vue'

const formRef = ref()
const loading = ref(false)
const saving = ref(false)
const previewOpen = ref(false)
const tab = ref<'basic' | 'home' | 'footer' | 'ext'>('basic')
/** 全部栏目：页脚分栏要用 */
const channels = ref<Channel[]>([])

const loadChannels = async () => {
  try {
    const res = await getChannelList()
    if (res.data.code === 200) channels.value = res.data.data
  } catch {
    // 页脚分栏会显示为空，不影响基本信息编辑
  }
}

const form = reactive<SiteInfo>({
  webTitle: '', keywords: '', description: '', slogan: '', subSlogan: '', phone: '', website: '',
  recruitEmail: '', contactEmail: '', address: '', mapLng: '', mapLat: '',
  mapLink: '', copyright: '', icpCode: '', policeCode: '',
  logo: '', footerLogo: '', wechatQr: '', template: '1',
  heroImage: '', heroVideo: '',
  heroPrimaryText: '', heroSecondaryText: '', heroStatsNote: '', contactHeading: '',
  companyName: '', companyShort: '', companyEn: '', favicon: '', shareImage: '',
  homeLayout: null, footerConfig: null, extConfig: null
})

/** http(s) 绝对地址，与服务端 site-config.dto 的 HTTP_URL 一致 */
const HTTP_URL = /^https?:\/\/[^\s\\'"<>]+$/i
/** 站点域名，与服务端 site-config.dto 的 SITE_DOMAIN 一致 */
const SITE_DOMAIN = /^(https?:\/\/)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(:\d{1,5})?\/?$/i

const rules: Record<string, Rule[]> = {
  webTitle: [{ required: true, message: '请填写网站标题', trigger: 'blur' }],
  phone: [{ required: true, message: '请填写电话', trigger: 'blur' }],
  contactEmail: [{ type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }],
  recruitEmail: [{ type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }],
  // 背景视频限定 http/https 外链或 / 开头的站内上传地址，拦截 javascript:/data: 等非法协议
  // 站内地址必须放行：上传接口返回的是 /uploads/YYYYMM/xxx.mp4 这种相对路径
  heroVideo: [{
    pattern: /^(https?:\/\/[^\s]+|\/[^\s]*)\.(mp4|webm|ogv|ogg)(\?[^\s]*)?$/i,
    message: '请上传视频，或填写 http(s):// 开头的 MP4 / WebM / Ogg 地址',
    trigger: 'blur'
  }],
  // 与接口校验一致：协议头可省（后端补 https），域名会被拼进分享卡片与搜索收录地址
  website: [{ pattern: SITE_DOMAIN, message: '格式如 www.example.com 或 https://www.example.com', trigger: 'blur' }],
  mapLink: [{ pattern: HTTP_URL, message: '请以 http:// 或 https:// 开头', trigger: 'blur' }]
}

onMounted(async () => {
  void loadChannels()
  loading.value = true
  try {
    const res = await getSiteInfo()
    if (res.data.code === 200) Object.assign(form, res.data.data)
  } catch {
    message.error('数据加载失败，请刷新重试')
  } finally {
    loading.value = false
  }
})

const onSave = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  saving.value = true
  try {
    // 版权信息含 HTML（备案链接），保存前净化；首页布局与页脚在各自页签保存，这里不提交
    const basic: Partial<SiteInfo> = { ...form, copyright: sanitizeHtml(form.copyright) }
    delete basic.homeLayout
    delete basic.footerConfig
    delete basic.extConfig
    const res = await saveSiteInfo(basic)
    if (res.data.code === 200) {
      message.success('保存成功')
    } else {
      message.error(res.data.message || '保存失败，请稍后重试')
    }
  } catch {
    message.error('保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

// 预览弹窗中点击"应用此样式"：回填模板选项（仍需点保存才生效）
const onApplyTemplate = (tpl: string) => {
  form.template = tpl
  previewOpen.value = false
}
</script>

<style scoped>
.site-config {
  background: transparent;
}

.cfg-tabs {
  margin-top: -8px;
}

.form-card {
  background: #fff;
  border-radius: 8px;
  padding: 28px 32px;
  /* 充满内容区，仅限制超宽屏的极限宽度，避免输入框拉得过长 */
  max-width: 1400px;
}

.field-tip {
  margin-top: 4px;
  font-size: 12px;
  color: #8c8c8c;
}

/* 分组标题：把 20 多个字段切成几段，运营按段找，不必从头滚到尾 */
.group-title {
  margin: 32px 0 20px;
  font-size: 15px;
  font-weight: 600;
  color: #262626;
}

.group-title--first {
  margin-top: 8px;
}

/* 模板单选 + 预览按钮同行 */
.template-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.preview-btn {
  padding: 0;
}

/* 保存按钮右对齐 */
.form-actions :deep(.ant-form-item-control-input-content) {
  display: flex;
  justify-content: flex-end;
}
</style>
