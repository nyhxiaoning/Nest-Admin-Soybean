import type { FormInstance, FormRules } from "element-plus"
import { ElMessage } from "element-plus"
import { ArrowDown, ChatDotRound, Lock, User } from "@element-plus/icons-vue"
import { computed, defineComponent, onBeforeUnmount, reactive, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { sendLoginCodeApi, authLoginIn } from "@/api/auth"
import { useUserStore } from "@/pinia/modules/user"
import { SUPPORT_LOCALES, getLocale, getLocaleDisplayName, setLocale } from "@/locales"
// 多语言测试
import { useAppI18n } from "@/common/composables/useI18n.ts"
interface LoginForm {
  username: string
  password: string
  code: string
}

interface LocaleOption {
  value: string
  label: string
}

export default defineComponent({
  name: "LoginPage",
  setup() {
    const { t } = useAppI18n()
    const route = useRoute()
    const router = useRouter()
    const userStore = useUserStore()
    const formRef = ref<FormInstance>()
    const submitting = ref(false)
    const sendingCode = ref(false)
    const codeCountdown = ref(0)
    let countdownTimer: ReturnType<typeof window.setInterval> | undefined
    const loginType = ref<"CODE" | "PASSWORD">("CODE")
    const codeButtonText = computed(() =>
      codeCountdown.value > 0 ? `${codeCountdown.value}s` : t("common.pxm_login_get_code")
    )
    const codeButtonDisabled = computed(() => sendingCode.value || codeCountdown.value > 0)

    const isChineseLocale = computed(() => {
      const locale = getLocale()
      return locale === 'zh-CN' || locale.startsWith('zh')
    })
    const fieldLabel = computed(() =>
      isChineseLocale.value
        ? t("common.pxm_login_phone_label")
        : t("common.pxm_login_email_label")
    )
    const fieldPlaceholder = computed(() =>
      isChineseLocale.value
        ? t("common.pxm_login_phone_placeholder")
        : t("common.pxm_login_email_placeholder")
    )
    const secondLabel = computed(() =>
      loginType.value === "CODE" ? t("common.pxm_login_code_label") : t("common.pxm_login_password_label")
    )
    const secondPlaceholder = computed(() =>
      loginType.value === "CODE"
        ? t("common.pxm_login_code_placeholder")
        : t("common.pxm_login_password_placeholder")
    )

    // 语言切换：默认用浏览器语言
    const browserLocale = (navigator.language || "zh-CN") as string
    const defaultLocale: string = SUPPORT_LOCALES.includes(browserLocale as any)
      ? browserLocale
      : browserLocale.startsWith("zh")
        ? "zh-CN"
        : "en-US"
    const currentLocale = ref((getLocale() || defaultLocale) as string)

    const localeOptions = computed<LocaleOption[]>(() =>
      SUPPORT_LOCALES.map((loc) => ({
        value: loc,
        label: getLocaleDisplayName(loc)
      }))
    )

    function handleLocaleChange(locale: string) {
      setLocale(locale as any)
      currentLocale.value = locale
    }

    const form = reactive<LoginForm>({
      username: "",
      password: "",
      code: ""
    })

    const getRules = computed<FormRules<LoginForm>>(() => {
      if (loginType.value === "CODE") {
        return {
          username: [
            { required: true, message: t("common.pxm_login_required"), trigger: "blur" }
          ],
          password: [],
          code: [
            {
              validator: (_rule, value, callback) => {
                if (!String(value || "").trim()) {
                  callback(new Error(t("common.pxm_login_required")))
                  return
                }
                callback()
              },
              trigger: "blur"
            }
          ]
        }
      }
      return {
        username: [{ required: true, message: t("common.pxm_login_required"), trigger: "blur" }],
        password: [
          {
            validator: (_rule, value, callback) => {
              if (!String(value || "").trim()) {
                callback(new Error(t("common.pxm_login_required")))
                return
              }
              callback()
            },
            trigger: "blur"
          }
        ],
        code: []
      }
    })

    async function handleLogin() {
      // ElMessage.success(t("common.pxm_login_success"))
      // const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/settings"
      // router.replace(redirect)
      // return;
      if (submitting.value) return
      await formRef.value?.validate()
      submitting.value = true
      try {
        const account = form.username.trim()
        console.log('account', account, loginType.value, form.password.trim(), 'form---')
        userStore.loginUserName = account;
        const res = await authLoginIn({
          username: account,
          loginType: loginType.value,
          password: loginType.value === "PASSWORD" ? form.password.trim() : undefined,
          code: loginType.value === "CODE" ? form.code.trim() : undefined
        })

        // 判断一下：这里如果
        userStore.setLogin(res)
        userStore.avatar = res?.avatar ? res?.avatar:''
        console.log(res?.avatar, 'avatarrrrrr')
        ElMessage.success(t("common.pxm_login_success"))
        const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/works"
        router.replace(redirect)
      } catch (error) {
        console.log(error, 'errorrrr')
        ElMessage.error(t("common.pxm_login_failed"))
        submitting.value = false
      }
    }

    async function sendCode() {
      if (codeButtonDisabled.value) return
      const account = form.username.trim()
      if (!account) {
        ElMessage.warning(t("common.pxm_login_required"))
        return
      }
      sendingCode.value = true

      // alert(JSON.stringify(account))
      try {
        let res = await sendLoginCodeApi(account)
        // alert(JSON.stringify(res))
        // 验证码倒计时
        startCountdown()
        ElMessage.success(t("common.pxm_login_code_sent"))
      } finally {
        sendingCode.value = false
      }
    }

    function startCountdown() {
      clearCountdown()
      codeCountdown.value = 60
      countdownTimer = window.setInterval(() => {
        codeCountdown.value -= 1
        if (codeCountdown.value <= 0) {
          clearCountdown()
        }
      }, 1000)
    }

    function clearCountdown() {
      if (countdownTimer) {
        window.clearInterval(countdownTimer)
        countdownTimer = undefined
      }
      if (codeCountdown.value < 0) {
        codeCountdown.value = 0
      }
    }

    onBeforeUnmount(clearCountdown)

    return {

      formRef,
      form,
      getRules,
      submitting,
      sendingCode,
      codeButtonText,
      codeButtonDisabled,
      loginType,
      fieldLabel,
      fieldPlaceholder,
      secondLabel,
      secondPlaceholder,
      User,
      Lock,
      ChatDotRound,
      ArrowDown,
      handleLogin,
      sendCode,
      currentLocale,
      localeOptions,
      handleLocaleChange
    }
  }
})
