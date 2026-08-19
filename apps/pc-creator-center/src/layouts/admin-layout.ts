import { computed, defineComponent, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { ADMIN_MENUS, isMenuGroup, type AdminMenuEntry, type AdminMenuItem } from "@/shared/manage-menu"
import { useUserStore } from "@/pinia/modules/user"
import { MoreFilled, Place, SwitchButton, ArrowDown } from "@element-plus/icons-vue"
import { getLocale, getLocaleDisplayName, toggleLocale } from "@/locales"
import { sendLoginOut } from "@/api/auth"
import { UserSearch } from "lucide-vue-next"




export default defineComponent({
  name: "AdminLayout",
  components: { MoreFilled, Place, SwitchButton, ArrowDown },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const userStore = useUserStore()
    const collapsedGroups = ref<string[]>([])

    const menu = computed<AdminMenuEntry[]>(() => {
      const entries: AdminMenuEntry[] = []
      ADMIN_MENUS.forEach((item) => {
        entries.push(item)
      })
      return entries
    })

    const localeName = computed(() => getLocaleDisplayName(getLocale()))

    function isActive(item: AdminMenuItem) {
      return route.path === item?.path
    }

    function isGroupActive(item: AdminMenuEntry) {
      return isMenuGroup(item) && item.children.some((child) => isActive(child))
    }

    function isGroupExpanded(item: AdminMenuEntry) {
      return isMenuGroup(item) && !collapsedGroups.value.includes(item.title)
    }

    function toggleGroup(item: AdminMenuEntry) {
      if (!isMenuGroup(item)) return
      if (collapsedGroups.value.includes(item.title)) {
        collapsedGroups.value = collapsedGroups.value.filter((title) => title !== item.title)
      } else {
        collapsedGroups.value = [...collapsedGroups.value, item.title]
      }
    }

    function handleUserCommand(command: string) {
      if (command === "logout") {
        userStore.logout()
        router.push("/login")
      } else if (command === "language") {
        toggleLocale()
      }
    }


    function handleLogout() {
      sendLoginOut(userStore?.token).then(() => {
        userStore.logout()


        router.push("/login")
      }).catch(err => {
        console.log(err)
      })

    }


    function handleChangeLang() {
      toggleLocale()
    }


    return {
      route,
      menu,
      isMenuGroup,
      isActive,
      isGroupActive,
      isGroupExpanded,
      toggleGroup,
      userId: userStore.userId,
      userAvartar: userStore.avatar || 'https://devstorage.jeejio.com/temphenry/image/paihangbang.png',
      userName: userStore.name,
      userLoginUserName: userStore.loginUserName,
      localeName,
      handleUserCommand,
      handleLogout,
      handleChangeLang
    }
  }
})
