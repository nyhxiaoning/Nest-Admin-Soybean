// 简单的 i18n 测试脚本
console.log('Testing i18n configuration...')

// 检查语言包文件是否存在
const fs = require('fs')
const path = require('path')

const files = [
  'src/locales/index.ts',
  'src/locales/zh-CN/index.ts',
  'src/locales/en-US/index.ts',
  'src/common/composables/useI18n.ts',
  'src/common/components/LanguageSwitcher/index.vue'
]

files.forEach(file => {
  const filePath = path.join(__dirname, file)
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists`)
  } else {
    console.log(`❌ ${file} missing`)
  }
})

console.log('Test completed!')