// 导航配置：用于 Layout 生成菜单
// name 对应路由的 name 字段，用于高亮匹配
export default [
  // 公共可见
  { name: 'Home', title: '首页', path: '/', icon: 'Home', allowedRoles: ['*'] },

  { name: 'Login', title: '登录', path: '/login', icon: 'User', allowedRoles: ['*'] },

  { name: 'Profile', title: '个人资料', path: '/profile', icon: 'User', allowedRoles: ['*'] },
  // 仅管理员/内容编辑可见
  { name: 'Movies', title: '电影仓库', path: '/movies', icon: 'Film', allowedRoles: ['admin', 'editor'] }
]
