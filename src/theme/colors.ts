// 分类图按蓝、青、紫、金、青绿、玫瑰、暖橙、灰蓝顺序取色。
const categoricalLight = ['#5588D3', '#299FB2', '#8A72CB', '#C99D45', '#4B9C82', '#C97092', '#D58B55', '#7D8FA8'];
const categoricalDark = ['#69B4FF', '#65CFDC', '#B5A0F4', '#E8C578', '#7AC6AC', '#EE9AB9', '#F0B17F', '#9CAEC9'];

export const colors = {
  // 主色调
  primary: {
    main: '#5588D3',      // 科技蓝 - 低饱和度
    light: '#6B9BE3',
    dark: '#3A6AA8',
    hover: '#E8F0FF',
  },
  // 辅助色
  secondary: {
    main: '#722ED1',      // 紫色
    light: '#9D4EDD',
    dark: '#531dAB',
  },
  // 语义色 - 低饱和度风格
  success: { light: '#43a047', dark: '#92CF92' },
  warning: { light: '#ff9800', dark: '#FFB74D' },
  error: {
    light: '#D95C5C',
    dark: '#D96C6C',
    hover: { light: '#FE8181', dark: '#B94F4F' },
  },
  info: { light: '#5588D3', dark: '#69B4FF' },

  // 背景色
  background: {
    default: '#F7F8FA',
    paper: '#FFFFFF',
    dark: '#080F1E',
    paperDark: '#111D30',
    elevatedDark: '#17263D',
    navigationDark: '#0C1627',
  },

  // 攻击类型颜色 - 鲜明的科技风格，用于饼图标签
  attack: {
    sqlInjection: { light: '#E53935', dark: '#FF6B6B' },     // 红色系 - SQL注入
    xss: { light: '#FB8C00', dark: '#FFB74D' },               // 橙色系 - XSS
    commandInjection: { light: '#8E24AA', dark: '#BA68C8' }, // 紫色系 - 命令注入
    pathTraversal: { light: '#FDD835', dark: '#FFE082' },    // 黄色系 - 路径遍历
    bruteForce: { light: '#43A047', dark: '#81C784' },        // 绿色系 - 暴力破解
    scanner: { light: '#1E88E5', dark: '#64B5F6' },           // 蓝色系 - 扫描器
    bot: { light: '#00ACC1', dark: '#4DD0E1' },               // 青色系 - 恶意Bot
    sensitiveData: { light: '#5E35B1', dark: '#9575CD' },     // 深紫 - 敏感数据
    csrf: { light: '#F4511E', dark: '#FF8A65' },              // 橙红 - CSRF
    ssrf: { light: '#3949AB', dark: '#7986CB' },               // 靛蓝 - SSRF
    xmlInjection: { light: '#D81B60', dark: '#F06292' },      // 粉红 - XML注入
    ldapInjection: { light: '#00897B', dark: '#4DB6AC' },     // 蓝绿 - LDAP注入
    nosqlInjection: { light: '#C0CA33', dark: '#DCE775' },   // 酸橙 - NoSQL注入
    unknown: { light: '#757575', dark: '#BDBDBD' },           // 灰色 - 未知
  },

  // 饼图专用攻击类型调色板 - 鲜明对比，便于标签识别
  attackPalette: [
    '#E53935', // 红色 - SQL注入
    '#FB8C00', // 橙色 - XSS
    '#8E24AA', // 紫色 - 命令注入
    '#FDD835', // 黄色 - 路径遍历
    '#43A047', // 绿色 - 暴力破解
    '#1E88E5', // 蓝色 - 扫描器
    '#00ACC1', // 青色 - 恶意Bot
    '#5E35B1', // 深紫 - 敏感数据
    '#F4511E', // 橙红 - CSRF
    '#3949AB', // 靛蓝 - SSRF
    '#D81B60', // 粉红 - XML注入
    '#00897B', // 蓝绿 - LDAP注入
    '#C0CA33', // 酸橙 - NoSQL注入
    '#757575', // 灰色 - 未知
  ],

  // 威胁等级颜色 - 低饱和度风格
  severity: {
    critical: { light: '#D95C5C', dark: '#FF8A8A' },
    high: { light: '#ff9800', dark: '#FFB74D' },
    medium: { light: '#FFB800', dark: '#FFD54F' },
    low: { light: '#43a047', dark: '#92CF92' },
    info: { light: '#165DFF', dark: '#69B4FF' },
  },

  // 节点类型颜色 - 低饱和度风格
  nodeType: {
    ingress: { light: '#165DFF', dark: '#69B4FF' },    // 蓝色 - 入口
    egress: { light: '#722ED1', dark: '#BA68C8' },     // 紫色 - 出口
    internal: { light: '#43a047', dark: '#92CF92' },  // 绿色 - 内部
    external: { light: '#86909C', dark: '#A6A6A6' },  // 灰色 - 外部
  },

  // 文本颜色
  text: {
    primary: '#1D2129',
    secondary: '#86909C',
    disabled: '#C4CDD6',
    primaryDark: '#E8EFFB',
    secondaryDark: '#9CAEC9',
  },

  // 边框颜色
  border: {
    light: '#E5E6EB',
    default: '#D9D9D9',
    dark: '#BFBFBF',
    darkMode: '#273A55',
  },

  // Chip/气泡背景色 - 暗黑模式适配
  chipBg: {
    success: { light: '#E8F5E9', dark: '#1B2B1B' },
    warning: { light: '#FFF3E0', dark: '#2B2D1B' },
    error: { light: '#FFEBEE', dark: '#2B1D1B' },
    info: { light: '#E3F2FD', dark: '#1B1B2B' },
    default: { light: '#F5F5F5', dark: '#17263D' },
  },

  // 统计卡片颜色
  statCard: {
    info: { bg: { light: '#e3f2fd', dark: '#1D3A5F' }, color: { light: '#1976d2', dark: '#69B4FF' } },
    success: { bg: { light: '#e8f5e9', dark: '#1B2D1B' }, color: { light: '#43a047', dark: '#92CF92' } },
    warning: { bg: { light: '#fff3e0', dark: '#3A2D1B' }, color: { light: '#ff9800', dark: '#FFB74D' } },
    error: { bg: { light: '#ffebee', dark: '#2B1D1B' }, color: { light: '#ef5350', dark: '#FF8A8A' } },
    disabled: { bg: { light: '#f1efef', dark: '#17263D' }, color: { light: '#717780', dark: '#9CAEC9' } },
  },

  // 图表颜色
  chart: {
    // 主线条/区域填充
    primary: {
      light: categoricalLight[0],
      dark: '#69B4FF',
      fill: { light: '#e3f2fd', dark: '#1D3A5F' },
    },
    // 阻止/错误
    blocked: {
      light: '#ef5350',
      dark: '#FF8A8A',
      fill: { light: '#ffebee', dark: '#3D2A2A' },
    },
    // 警告
    warning: {
      light: '#ff9800',
      dark: '#FFB74D',
      fill: { light: '#fff3e0', dark: '#3A2D1B' },
    },
    // 成功
    success: {
      light: '#43a047',
      dark: '#92CF92',
      fill: { light: '#e8f5e9', dark: '#1B2D1B' },
    },
    // 网格
    grid: {
      light: '#eee',
      dark: '#273A55',
    },
    // 文字
    text: {
      light: '#999',
      dark: '#9CAEC9',
    },
    // 参考线
    reference: {
      light: '#ffc107',
      dark: '#ffc107',
    },
  },

  // 图表调色板 - 用于饼图、柱状图等多色场景
  palette: {
    base: categoricalLight,
    soft: categoricalDark,
    browser: categoricalLight,
    os: categoricalLight,
    // HTTP 状态码分类
    status: {
      success: '#66bb6a',  // 2xx
      redirect: '#42a5f5', // 3xx
      clientError: '#ff9800', // 4xx
      serverError: '#ef5350', // 5xx
    },
  },

  // 浅色采用较鲜明的分类色，深色采用柔和灰调；两套环形图色板按用户要求对调。
  donut: {
    light: categoricalDark,
    dark: ['#668CAF', '#579FA8', '#977BB4', '#BD9B55', '#649C79', '#B6758D', '#BE8865', '#8B929A'],
    status: {
      success: { light: '#92CF92', dark: '#649C79' },
      redirect: { light: '#69B4FF', dark: '#668CAF' },
      clientError: { light: '#FFB74D', dark: '#BE8865' },
      serverError: { light: '#FF8A8A', dark: '#B46B77' },
    },
    attack: {
      sqlInjection: { light: '#FF6B6B', dark: '#B46B77' },
      xss: { light: '#FFB74D', dark: '#BF8B5A' },
      commandInjection: { light: '#BA68C8', dark: '#9575AE' },
      pathTraversal: { light: '#FFE082', dark: '#B4A15B' },
      bruteForce: { light: '#81C784', dark: '#65967A' },
      scanner: { light: '#64B5F6', dark: '#668CAF' },
      bot: { light: '#4DD0E1', dark: '#579FA8' },
      sensitiveData: { light: '#9575CD', dark: '#8171A4' },
      csrf: { light: '#FF8A65', dark: '#BA7D69' },
      ssrf: { light: '#7986CB', dark: '#6F86AD' },
      xmlInjection: { light: '#F06292', dark: '#AD749A' },
      ldapInjection: { light: '#4DB6AC', dark: '#5F9A8E' },
      nosqlInjection: { light: '#DCE775', dark: '#949C60' },
      unknown: { light: '#BDBDBD', dark: '#8B929A' },
    },
  },

  // 对话框颜色
  dialog: {
    edit: { bg: '#FF8D0015', color: '#FF8D00' },
    create: { bg: '#00B42A15', color: '#00B42A' },
  },

  // 匹配条件卡片背景
  conditionCard: {
    bg: { light: '#F7F8FA', dark: '#0C1627' },
    input: { light: '#FFFFFF', dark: '#111D30' },
  },

  // 对话框边框
  dialogBorder: {
    light: '#E5E6EB',
    dark: '#273A55',
  },
};
