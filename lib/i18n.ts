export type Lang = "en" | "zh";

export const t = {
  nav: {
    about: { en: "About", zh: "关于我们" },
    events: { en: "Events", zh: "活动" },
    freshmanServices: { en: "新生服务", zh: "新生服务" },
    joinUs: { en: "Join Us", zh: "加入我们" },
  },
  hero: {
    subtitle: { en: "Bridging Internationals", zh: "连接国际学生" },
    desc: {
      en: "Meaningful exchange between international students and American communities through tech, career, and culture.",
      zh: "通过科技、职业和文化，促进留学生与美国社区之间有意义的交流。",
    },
    learnMore: { en: "Learn More", zh: "了解更多" },
  },
  mission: {
    heading: {
      en: "Where bridging global communities starts.",
      zh: "全球社区连接，从这里开始。",
    },
    desc: {
      en: "Our vision is to empower international voices at USC by fostering an inclusive environment that intersects technology, professional growth, and shared experiences. We are building the foundational network for global ambition.",
      zh: "我们的愿景是通过营造一个融合科技、职业成长和共同经历的包容环境，赋能USC的国际学生群体。我们正在为全球化的雄心壮志构建基础网络。",
    },
  },
  services: {
    heading: { en: "新生服务", zh: "新生服务" },
    subtitle: { en: "Freshman Services", zh: "新生专属服务" },
    available: { en: "5 services available", zh: "5 项服务" },
    builtBy: {
      en: "Built by BIA members for USC international students",
      zh: "由 BIA 成员为 USC 留学生打造",
    },
    open: { en: "Open", zh: "打开" },
    items: [
      {
        title: { en: "找室友", zh: "找室友" },
        sub: { en: "Roommate Match", zh: "室友匹配" },
        desc: {
          en: "Find your perfect roommate at USC with our compatibility-driven algorithm.",
          zh: "通过我们的匹配算法，找到最合适的USC室友。",
        },
      },
      {
        title: { en: "选课", zh: "选课" },
        sub: { en: "Course Planner", zh: "选课规划" },
        desc: {
          en: "Optimize your semester with peer reviews, alumni insights, and scheduling tools.",
          zh: "通过同学评价、校友分享和排课工具，优化你的学期安排。",
        },
      },
      {
        title: { en: "课评", zh: "课评" },
        sub: { en: "Course Reviews", zh: "课程评价" },
        desc: {
          en: "Read honest course reviews from fellow USC international students.",
          zh: "阅读来自USC留学生的真实课程评价。",
        },
      },
      {
        title: { en: "转租", zh: "转租" },
        sub: { en: "Sublet", zh: "转租房源" },
        desc: {
          en: "Safe, verified subleases strictly within our international student community.",
          zh: "安全、经过验证的转租房源，仅限留学生社区内部。",
        },
      },
      {
        title: { en: "新生群", zh: "新生群" },
        sub: { en: "Freshman Groups", zh: "新生微信群" },
        desc: {
          en: "Join class-year WeChat groups and connect before you arrive on campus.",
          zh: "加入年级微信群，在到校之前就开始社交。",
        },
      },
    ],
  },
  pillars: {
    heading: { en: "What We Do", zh: "我们做什么" },
    subtitle: { en: "Three Pillars", zh: "三大支柱" },
    items: [
      {
        title: { en: "Cultural Bridge-Building", zh: "文化桥梁" },
        titleZh: { en: "文化桥梁", zh: "Cultural Bridge-Building" },
      },
      {
        title: { en: "Technology & Innovation", zh: "科技创新" },
        titleZh: { en: "科技创新", zh: "Technology & Innovation" },
      },
      {
        title: { en: "Career Development", zh: "职业发展" },
        titleZh: { en: "职业发展", zh: "Career Development" },
      },
    ],
  },
  hackathon: {
    badge: { en: "Featured Event", zh: "精选活动" },
    title: { en: "BIA Hackathon: Build with Trae & Minimax", zh: "BIA 黑客松：与 Trae & Minimax 共建" },
    desc: {
      en: "500+ participants joined our flagship tech summit — building with cutting-edge AI tools, shipping real products, and pushing boundaries.",
      zh: "500+ 参与者加入了我们的旗舰科技峰会——使用前沿 AI 工具构建真实产品，突破边界。",
    },
    cta: { en: "Check It Out", zh: "了解详情" },
  },
  blog: {
    heading: { en: "Latest Dispatches", zh: "最新动态" },
    byline: { en: "By BIA Editorial Team", zh: "BIA 编辑部" },
    posts: [
      { en: "Inside the miHoYo Recruiting Session", zh: "走进米哈游校园招聘会" },
      { en: "Startup 101 with YC China Founders", zh: "YC 中国创始人的创业课" },
      { en: "Welcome, Class of 2030!", zh: "欢迎，2030 届新生！" },
    ],
  },
  cta: {
    heading: {
      en: "We're building community and opportunity for the next generation of global builders.",
      zh: "我们正在为下一代全球建设者构建社区与机遇。",
    },
    link: {
      en: "If that sounds interesting, come join us",
      zh: "如果你感兴趣，欢迎加入我们",
    },
  },
  footer: {
    home: { en: "Home", zh: "首页" },
    copyright: {
      en: "Bridging Internationals Association.",
      zh: "Bridging Internationals Association.",
    },
  },
} as const;
