-- ============================================
-- 更新菜单图标 SQL 脚本
-- 为所有菜单添加合适的 Material Design Icons
-- ============================================

-- 更新主菜单图标
UPDATE sys_menu SET icon = 'local-icon-menu-system' WHERE menu_id = 1 AND menu_name = '系统管理';
UPDATE sys_menu SET icon = 'mdi:monitor-dashboard' WHERE menu_id = 2 AND menu_name = '系统监控';
UPDATE sys_menu SET icon = 'local-icon-menu-tool' WHERE menu_id = 3 AND menu_name = '系统工具';
UPDATE sys_menu SET icon = 'mdi:file-document-outline' WHERE menu_id = 108 AND menu_name = '日志管理';

-- 更新系统管理子菜单图标
UPDATE sys_menu SET icon = 'mdi:account-group-outline' WHERE menu_id = 100 AND menu_name = '用户管理';
UPDATE sys_menu SET icon = 'mdi:shield-account-outline' WHERE menu_id = 101 AND menu_name = '角色管理';
UPDATE sys_menu SET icon = 'local-icon-menu-tree-table' WHERE menu_id = 102 AND menu_name = '菜单管理';
UPDATE sys_menu SET icon = 'mdi:office-building-outline' WHERE menu_id = 103 AND menu_name = '部门管理';
UPDATE sys_menu SET icon = 'mdi:briefcase-outline' WHERE menu_id = 104 AND menu_name = '岗位管理';
UPDATE sys_menu SET icon = 'mdi:book-open-outline' WHERE menu_id = 105 AND menu_name = '字典管理';
UPDATE sys_menu SET icon = 'mdi:cog-outline' WHERE menu_id = 106 AND menu_name = '参数设置';
UPDATE sys_menu SET icon = 'mdi:bell-outline' WHERE menu_id = 107 AND menu_name = '通知公告';
UPDATE sys_menu SET icon = 'mdi:domain' WHERE menu_id = 118 AND menu_name = '租户管理';
UPDATE sys_menu SET icon = 'mdi:package-variant' WHERE menu_id = 119 AND menu_name = '租户套餐管理';
UPDATE sys_menu SET icon = 'mdi:folder-multiple-outline' WHERE menu_id = 120 AND menu_name = '文件管理';

-- 更新系统监控子菜单图标
UPDATE sys_menu SET icon = 'mdi:account-group' WHERE menu_id = 109 AND menu_name = '在线用户';
UPDATE sys_menu SET icon = 'mdi:clock-time-eight-outline' WHERE menu_id = 110 AND menu_name = '定时任务';
UPDATE sys_menu SET icon = 'mdi:server' WHERE menu_id = 112 AND menu_name = '服务监控';
UPDATE sys_menu SET icon = 'mdi:database-cog-outline' WHERE menu_id = 113 AND menu_name = '缓存监控';
UPDATE sys_menu SET icon = 'mdi:format-list-bulleted' WHERE menu_id = 114 AND menu_name = '缓存列表';
UPDATE sys_menu SET icon = 'mdi:file-document-edit-outline' WHERE menu_id = 500 AND menu_name = '操作日志';
UPDATE sys_menu SET icon = 'mdi:login' WHERE menu_id = 501 AND menu_name = '登录日志';

-- 更新系统工具子菜单图标
UPDATE sys_menu SET icon = 'mdi:hammer-wrench' WHERE menu_id = 115 AND menu_name = '表单构建';
UPDATE sys_menu SET icon = 'local-icon-menu-code' WHERE menu_id = 116 AND menu_name = '代码生成';
UPDATE sys_menu SET icon = 'mdi:api' WHERE menu_id = 117 AND menu_name = '系统接口';

-- 查找并更新其他可能存在的菜单（通过路径匹配）
-- 客户端管理
UPDATE sys_menu SET icon = 'mdi:application-cog-outline' WHERE path = 'client' AND menu_type = 'C' AND icon = '' OR icon = '#';

-- 通知管理
UPDATE sys_menu SET icon = 'mdi:message-text-outline' WHERE path = 'notify' AND menu_type = 'M' AND (icon = '' OR icon = '#');
UPDATE sys_menu SET icon = 'mdi:email-outline' WHERE path LIKE '%notify/message%' AND menu_type = 'C';
UPDATE sys_menu SET icon = 'mdi:file-document-edit-outline' WHERE path LIKE '%notify/template%' AND menu_type = 'C';

-- OSS管理
UPDATE sys_menu SET icon = 'mdi:cloud-upload-outline' WHERE path = 'oss' AND menu_type = 'C' AND (icon = '' OR icon = '#');

-- 短信管理
UPDATE sys_menu SET icon = 'mdi:message-processing-outline' WHERE path = 'sms' AND menu_type = 'M' AND (icon = '' OR icon = '#');
UPDATE sys_menu SET icon = 'mdi:source-branch' WHERE path LIKE '%sms/channel%' AND menu_type = 'C';
UPDATE sys_menu SET icon = 'mdi:file-document-outline' WHERE path LIKE '%sms/log%' AND menu_type = 'C';
UPDATE sys_menu SET icon = 'mdi:file-document-edit-outline' WHERE path LIKE '%sms/template%' AND menu_type = 'C';

-- 租户相关
UPDATE sys_menu SET icon = 'mdi:file-check-outline' WHERE path LIKE '%tenant-audit%' AND menu_type = 'C';
UPDATE sys_menu SET icon = 'mdi:view-dashboard-outline' WHERE path LIKE '%tenant-dashboard%' AND menu_type = 'C';
UPDATE sys_menu SET icon = 'mdi:chart-box-outline' WHERE path LIKE '%tenant-quota%' AND menu_type = 'C';

-- 代码生成子菜单
UPDATE sys_menu SET icon = 'mdi:database-cog-outline' WHERE path LIKE '%gen/datasource%' AND menu_type = 'C';
UPDATE sys_menu SET icon = 'mdi:file-document-edit-outline' WHERE path LIKE '%gen/template%' AND menu_type = 'C';
UPDATE sys_menu SET icon = 'mdi:history' WHERE path LIKE '%gen/history%' AND menu_type = 'C';

-- 定时任务日志
UPDATE sys_menu SET icon = 'mdi:file-document-outline' WHERE path LIKE '%job-log%' AND menu_type = 'C';

-- 确保所有按钮类型（F）的菜单保持 '#' 图标（按钮不需要显示图标）
-- UPDATE sys_menu SET icon = '#' WHERE menu_type = 'F' AND icon != '#';

COMMIT;
