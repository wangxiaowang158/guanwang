<template>
  <div class="site-config">
    <a-breadcrumb class="crumb">
      <a-breadcrumb-item><HomeOutlined /></a-breadcrumb-item>
      <a-breadcrumb-item>基本信息管理</a-breadcrumb-item>
    </a-breadcrumb>

    <div class="form-card">
      <a-spin :spinning="loading">
        <a-form ref="formRef" :model="form" :rules="rules" :label-col="{ style: { width: '110px' } }">
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
          <a-form-item label="网站标题" name="webTitle">
            <a-input v-model:value="form.webTitle" :maxlength="100" />
          </a-form-item>
          <a-form-item label="网站关键字" name="keywords">
            <a-textarea v-model:value="form.keywords" :rows="2" />
          </a-form-item>
          <a-form-item label="网站描述" name="description">
            <a-textarea v-model:value="form.description" :rows="3" />
          </a-form-item>
          <a-form-item label="电话" name="phone">
            <a-input v-model:value="form.phone" :maxlength="20" />
          </a-form-item>
          <a-form-item label="网址" name="website">
            <a-input v-model:value="form.website" />
          </a-form-item>
          <a-form-item label="招聘邮箱" name="recruitEmail">
            <a-input v-model:value="form.recruitEmail" />
          </a-form-item>
          <a-form-item label="联系邮箱" name="contactEmail">
            <a-input v-model:value="form.contactEmail" />
          </a-form-item>
          <a-form-item label="地址" name="address">
            <a-input v-model:value="form.address" :maxlength="100" />
          </a-form-item>
          <a-form-item label="地图经度" name="mapLng">
            <a-input v-model:value="form.mapLng" />
          </a-form-item>
          <a-form-item label="地图纬度" name="mapLat">
            <a-input v-model:value="form.mapLat" />
          </a-form-item>
          <a-form-item label="地图链接地址" name="mapLink">
            <a-input v-model:value="form.mapLink" />
          </a-form-item>
          <a-form-item label="版权信息" name="copyright">
            <a-textarea v-model:value="form.copyright" :rows="3" />
          </a-form-item>
          <a-form-item label="LOGO" name="logo">
            <ImageUpload v-model="form.logo" tip="建议尺寸：180*50px" />
          </a-form-item>
          <a-form-item label="底部LOGO" name="footerLogo">
            <ImageUpload v-model="form.footerLogo" tip="建议尺寸：180*50px" />
          </a-form-item>
          <a-form-item label="微信二维码" name="wechatQr">
            <ImageUpload v-model="form.wechatQr" tip="建议尺寸：160*160px" />
          </a-form-item>
          <a-form-item label="首页背景图" name="heroImage">
            <ImageUpload v-model="form.heroImage" tip="首页 Hero 背景图，建议 1920*1080px；若同时配了背景视频则视频优先" />
          </a-form-item>
          <a-form-item label="首页背景视频" name="heroVideo">
            <a-input v-model:value="form.heroVideo" placeholder="视频地址（mp4），留空则用背景图或默认渐变" />
            <div class="field-tip">填写视频直链（.mp4）。视频优先级高于背景图，自动静音循环播放</div>
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
import { HomeOutlined, EyeOutlined } from '@ant-design/icons-vue'
import { getSiteInfo, saveSiteInfo, type SiteInfo } from '@/api/cms'
import { sanitizeHtml } from '@/utils/sanitize'
import ImageUpload from './components/ImageUpload.vue'
import TemplatePreview from './components/TemplatePreview.vue'

const formRef = ref()
const loading = ref(false)
const saving = ref(false)
const previewOpen = ref(false)

const form = reactive<SiteInfo>({
  webTitle: '', keywords: '', description: '', phone: '', website: '',
  recruitEmail: '', contactEmail: '', address: '', mapLng: '', mapLat: '',
  mapLink: '', copyright: '', logo: '', footerLogo: '', wechatQr: '', template: '1',
  heroImage: '', heroVideo: ''
})

const rules: Record<string, Rule[]> = {
  webTitle: [{ required: true, message: '请填写网站标题', trigger: 'blur' }],
  phone: [{ required: true, message: '请填写电话', trigger: 'blur' }],
  contactEmail: [{ type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }],
  recruitEmail: [{ type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }],
  // 背景视频限定 http/https 的 .mp4 直链，拦截 javascript:/data: 等非法协议
  heroVideo: [{
    pattern: /^https?:\/\/.+\.mp4(\?.*)?$/i,
    message: '请填写以 http(s):// 开头的 .mp4 视频地址',
    trigger: 'blur'
  }]
}

onMounted(async () => {
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
    // 版权信息含 HTML（备案链接），保存前净化
    const res = await saveSiteInfo({ ...form, copyright: sanitizeHtml(form.copyright) })
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

.crumb {
  margin-bottom: 16px;
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
