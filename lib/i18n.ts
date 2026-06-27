// Bilingual (en/zh) translation dictionary for the entire web app.
// Key-access pattern: t.nav.events[lang]. Single source of truth for user-facing strings.
// Add new UI copy here before adding it to components.
//
// Header last reviewed: 2026-04-16

export type Lang = "en" | "zh";

export const t = {
  comingSoon: {
    kicker: { en: "Coming soon", zh: "敬请期待" },
    body: {
      en: "We'd rather ship this right than ship it broken. It's being polished — we'll open it soon.",
      zh: "与其上线半成品，不如把它做对。正在打磨中，很快开放。",
    },
    back: { en: "Back to home", zh: "返回首页" },
    badge: { en: "Soon", zh: "敬请期待" },
    waitlist: { en: "Join the waitlist", zh: "加入候补名单" },
  },
  nav: {
    about: { en: "About", zh: "关于我们" },
    events: { en: "Events", zh: "活动" },
    freshmanServices: { en: "新生服务", zh: "新生服务" },
    blog: { en: "Blog", zh: "博客" },
    george: { en: "George", zh: "George" },
    joinUs: { en: "Join Us", zh: "加入我们" },
  },
  hero: {
    subtitle: { en: "Bridging Internationals", zh: "连接国际学生" },
    desc: {
      en: "Roommates, courses, sublets, and community — everything you need to start at USC.",
      zh: "室友、选课、转租、社群——你在USC起步需要的一切。",
    },
    learnMore: { en: "Learn More", zh: "了解更多" },
    cta: { en: "Try Starter", zh: "试试新生通" },
    ctaSub: {
      en: "5 free tools for incoming Trojans",
      zh: "5款免费工具，为新Trojan打造",
    },
  },
  mission: {
    heading: {
      en: "Reshaping how young people connect, experience, and belong.",
      zh: "重塑年轻人连接、体验与归属的方式。",
    },
    desc: {
      en: "BIA is a student-led community that began at USC, working at the intersection of humanity, technology, and art. We don't just gather people — we design the conditions for meaningful encounters, turning a place that feels unfamiliar into a life that feels like your own.",
      zh: "BIA 是一个起源于 USC 的学生社区，扎根于人文、科技与艺术的交汇点。我们不只是把人聚在一起，更为有意义的相遇创造条件——把一个起初陌生的地方，变成真正属于你的生活。",
    },
  },
  services: {
    heading: { en: "Starter · 新生通", zh: "新生通 · Starter" },
    subtitle: {
      en: "Everything you need to start at USC",
      zh: "你在USC起步需要的一切",
    },
    available: { en: "5 free tools", zh: "5 款免费工具" },
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
    title: {
      en: "BIA Hackathon: Build with Trae & Minimax",
      zh: "BIA 黑客松：与 Trae & Minimax 共建",
    },
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
      {
        en: "Inside the miHoYo Recruiting Session",
        zh: "走进米哈游校园招聘会",
      },
      { en: "Startup 101 with YC China Founders", zh: "YC 中国创始人的创业课" },
      { en: "Welcome, Class of 2030!", zh: "欢迎，2030 届新生！" },
    ],
    // Blog index page chrome (components/BlogIndex.tsx).
    kicker: { en: "BIA Editorial", zh: "BIA 编辑部" },
    subtitle: {
      en: "Stories, notes, and updates from the BIA community.",
      zh: "来自 BIA 社区的故事、笔记与近况。",
    },
    empty: { en: "No posts yet.", zh: "还没有文章。" },
    langEn: { en: "English", zh: "英文" },
    langZh: { en: "中文", zh: "中文" },
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
  about: {
    hero: {
      kicker: {
        en: "Student-led · From USC · Est. 2024",
        zh: "学生主导 · 始于 USC · 创立于 2024",
      },
      title: {
        en: "Humanity, technology & art — reshaping how young people connect, experience, and belong.",
        zh: "人文、科技与艺术——重塑年轻人连接、体验与归属的方式。",
      },
      desc: {
        en: "BIA is a student-led community starting from USC, exploring how humanity, technology, and art can reshape the way young people connect, experience, and belong.",
        zh: "BIA 是一个起源于 USC 的学生社区，探索人文、科技与艺术如何重塑年轻人连接、体验与归属的方式。",
      },
    },
    entry: {
      kicker: { en: "The entry point", zh: "那个入口" },
      p1: {
        en: "We began with a simple observation: when someone enters a new school, a new city, or a new culture, what they lack is often not information, but a trusted way to make sense of it. There are endless posts, group chats, platforms, and recommendations — yet the harder questions remain.",
        zh: "我们从一个简单的观察开始：当一个人进入一所新学校、一座新城市、一种新文化，他们缺的往往不是信息，而是一种可信赖的、把这一切理顺的方式。帖子、群聊、平台、推荐无穷无尽——但更难的问题依然悬而未决。",
      },
      quote: {
        en: "What is worth going to? Who should I meet? Where do I start? How do I turn a place that feels unfamiliar into a life that feels like my own?",
        zh: "什么值得去？该认识谁？从哪里开始？怎样把一个陌生的地方，变成真正属于自己的生活？",
      },
      statement: {
        en: "BIA exists to become that entry point.",
        zh: "BIA 的存在，就是为了成为那个入口。",
      },
      p2: {
        en: "Rooted in the lived experience of international and Chinese-background students at USC, BIA is not just a social club, a tech club, or a traditional student organization. We are an experience-driven community that brings together lifestyle, creativity, technology, career exploration, and human connection.",
        zh: "扎根于 USC 国际与华人背景学生的真实经历，BIA 不只是社交社团、科技社团或传统学生组织。我们是一个以体验驱动的社区，融合生活方式、创造力、科技、职业探索与人与人的连接。",
      },
      p3: {
        en: "We care about the moments that make a new environment feel real: the first event where you meet people you actually want to see again, the conversation that changes how you think about your future, the city experience that makes LA feel less distant, the creative project that turns an idea into something visible. Community is not just about gathering people — it is about designing the conditions for meaningful encounters to happen.",
        zh: "我们在意那些让陌生环境变得真实的瞬间：第一次遇到你真心想再见的人的活动、一次改变你对未来想象的对话、一次让 LA 不再遥远的城市体验、一个把想法变成可见之物的创作。社区不只是把人聚在一起——而是为有意义的相遇创造条件。",
      },
    },
    lenses: {
      kicker: { en: "People · Technology · Art", zh: "人 · 科技 · 艺术" },
      intro: {
        en: "Our work sits at the intersection of people, technology, and art.",
        zh: "我们的工作，落在人、科技与艺术的交汇处。",
      },
      items: [
        {
          n: { en: "Humanity", zh: "人文" },
          role: { en: "why we exist", zh: "我们为何存在" },
          body: {
            en: "We care about belonging, identity, friendship, ambition, and the emotional experience of entering a new environment.",
            zh: "我们在意归属、身份、友谊、野心，以及进入一个新环境时的情感体验。",
          },
        },
        {
          n: { en: "Technology", zh: "科技" },
          role: { en: "how we imagine connection", zh: "我们如何想象连接" },
          body: {
            en: "Not a cold tool, but a way to make discovery, recommendation, and community more personal, intuitive, and alive.",
            zh: "不是冰冷的工具，而是让发现、推荐与社区更个人、更直觉、更有生命力的一种方式。",
          },
        },
        {
          n: { en: "Art", zh: "艺术" },
          role: { en: "how we shape experience", zh: "我们如何塑造体验" },
          body: {
            en: "From visual identity to event atmosphere, from storytelling to spatial design — the way something feels is part of what makes it matter.",
            zh: "从视觉识别到活动氛围，从叙事到空间设计——一件事给人的感受，本身就是它意义的一部分。",
          },
        },
      ],
    },
    questions: {
      kicker: { en: "Larger than one campus", zh: "不止于一所校园" },
      intro: {
        en: "BIA starts at USC, but the questions we care about are bigger.",
        zh: "BIA 始于 USC，但我们在意的问题，远比这更大。",
      },
      items: [
        {
          en: "How do young people find their place in a new environment?",
          zh: "年轻人如何在陌生环境中找到自己的位置？",
        },
        {
          en: "How do communities form in an age of fragmented attention?",
          zh: "在注意力被碎片化的时代，社区如何形成？",
        },
        {
          en: "How can technology make human connection warmer rather than colder?",
          zh: "科技如何让人与人的连接更温暖，而非更冰冷？",
        },
        {
          en: "How can art turn ordinary gatherings into experiences people remember?",
          zh: "艺术如何把平常的聚会，变成人们会记住的体验？",
        },
      ],
    },
    numbers: {
      kicker: { en: "By the numbers", zh: "用数字说话" },
      items: [
        {
          value: "1,500+",
          label: {
            en: "Community members across 4 class-year groups",
            zh: "横跨 4 个年级群的社区成员",
          },
        },
        {
          value: "3,500+",
          label: {
            en: "Followers across WeChat, Xiaohongshu & Instagram",
            zh: "微信、小红书与 Instagram 的关注者",
          },
        },
        {
          value: "80+",
          label: {
            en: "Cohort fellows, selected through 4 interview rounds",
            zh: "经 4 轮面试选出的 cohort 成员",
          },
        },
        {
          value: "15+",
          label: {
            en: "Events each year, flagships drawing 300–500+",
            zh: "每年活动，旗舰场吸引 300–500+ 人",
          },
        },
      ],
    },
    closing: {
      statement: {
        en: "From USC to LA, from campus life to city culture, from one gathering to a longer sense of belonging — BIA is here to explore what the next generation of community can become.",
        zh: "从 USC 到 LA，从校园生活到城市文化，从一次聚会到更长久的归属——BIA 在这里，探索下一代社区可以成为什么。",
      },
      cta: { en: "Join BIA →", zh: "加入 BIA →" },
    },
  },
  events: {
    hero: {
      kicker: {
        en: "USC & across China · Since 2024",
        zh: "USC 与中国各地 · 始于 2024",
      },
      title: {
        en: "Events That Turn Community Into Real Life",
        zh: "活动，让社区成为真实的生活",
      },
      desc1: {
        en: "At BIA, events are not just dates on a calendar. They are designed moments where people meet, express themselves, explore the city, and discover new ways to belong.",
        zh: "在 BIA，活动不只是日历上的日期。它们是精心设计的瞬间——人们在这里相遇、表达自己、探索城市，并发现新的归属方式。",
      },
      desc2: {
        en: "From social experiences and city nights to creative workshops, career conversations, builder gatherings, and future-focused salons, our events bring together lifestyle, technology, art, and opportunity in ways that feel alive.",
        zh: "从社交体验、城市之夜，到创意工作坊、职业对话、创造者聚会与面向未来的沙龙——我们的活动把生活方式、科技、艺术与机会，以一种鲜活的方式聚到一起。",
      },
      desc3: {
        en: "We create spaces where students can show who they are, find people with similar energy, and turn a new environment into something personal.",
        zh: "我们创造这样的空间：让学生展现真实的自己，遇见同频的人，并把一个陌生的环境，变成真正属于自己的东西。",
      },
    },
    upcoming: {
      label: { en: "Upcoming", zh: "即将开始" },
      title: { en: "New Student Mixer · 新生见面会", zh: "新生见面会 · New Student Mixer" },
      blurb: {
        en: "Welcome, Trojans — meet your incoming class before you arrive on campus.",
        zh: "欢迎，Trojans——在抵达校园之前，先认识你的同届新生。",
      },
      perks: [
        { en: "Practical welcome pack", zh: "实用新生大礼包" },
        { en: "Icebreakers & finding your people", zh: "破冰互动 · 找到你的同伴" },
        { en: "Q&A with USC upperclassmen", zh: "USC 学长学姐 Q&A" },
        { en: "Live DJI Pocket 4 raffle", zh: "现场抽奖 DJI Pocket 4" },
      ],
      sessions: [
        {
          city: "Beijing · 北京",
          when: { en: "Jun 27 · 3:00 PM", zh: "6月27日 · 下午3:00" },
          venue: { en: "Grand Millennium Hotel, Chaoyang", zh: "北京朝阳千禧大酒店" },
        },
        {
          city: "Shenzhen · 深圳",
          when: { en: "Jul 5 · 3:00 PM", zh: "7月5日 · 下午3:00" },
          venue: { en: "", zh: "" },
        },
        {
          city: "Shanghai · 上海",
          when: { en: "Jul 11 · 12:00 PM", zh: "7月11日 · 中午12:00" },
          venue: { en: "InterContinental Jing'an", zh: "静安洲际酒店" },
        },
      ],
      venueTBA: { en: "Venue TBA", zh: "场地待定" },
      alsoLabel: { en: "Also coming up", zh: "同样即将开始" },
      hush: {
        title: "HUSH @ INS Park",
        venue: { en: "INS Park, Shanghai", zh: "上海 INS 新乐园" },
        date: { en: "Aug 3", zh: "8月3日" },
      },
    },
    featuredLabel: { en: "Featured", zh: "精选活动" },
    featured: [
      {
        title: { en: "BIA Hackathon: Build with Trae × Minimax", zh: "BIA 黑客松：用 Trae × Minimax 开发" },
        when: { en: "Spring 2026", zh: "2026 春" },
        body: {
          en: "Our flagship build at USC — $1,500 in prizes and a ByteDance internship track, powered by Trae and Minimax.",
          zh: "我们在 USC 的旗舰开发活动——$1,500 奖金与字节跳动实习直通通道，由 Trae 与 Minimax 提供支持。",
        },
        image: "/hackathon/group-photo.jpg",
      },
      {
        title: { en: "Founders vs Investors: Roderick Dong", zh: "创始人 vs 投资人：Roderick Dong" },
        when: { en: "Fall 2025", zh: "2025 秋" },
        body: {
          en: "A live founders-vs-investors talk with Roderick Dong — former YC China founding team, backer of five $1B+ unicorns, Forbes 30 Under 30.",
          zh: "与 Roderick Dong 的创始人对话投资人现场分享——YC 中国创始团队成员、5 家十亿美元独角兽背后的投资人、福布斯 30 Under 30。",
        },
        image: "/blog-yc-china.jpg",
      },
      {
        title: { en: "miHoYo 2026 Campus Recruiting", zh: "miHoYo 2026 校园招聘" },
        when: { en: "Fall 2025", zh: "2025 秋" },
        body: {
          en: "An exclusive miHoYo recruiting and info session for USC students — online and in person at the Interactive Media Building.",
          zh: "面向 USC 学生的 miHoYo 专属招聘与宣讲会——线上及 Interactive Media Building 线下同步进行。",
        },
        image: "/blog-mihoyo.jpg",
      },
    ],
    archiveLabel: { en: "Every event · Summer 2024 → today", zh: "全部活动 · 2024 夏 → 至今" },
    terms: [
      {
        term: { en: "Spring 2026", zh: "2026 春" },
        events: [
          { date: { en: "Mar 28", zh: "3月28日" }, title: { en: "BIA Hackathon · Build with Trae × Minimax", zh: "BIA 黑客松 · 用 Trae × Minimax 开发" }, detail: { en: "USC · $1,500 prizes + ByteDance internship", zh: "USC · $1,500 奖金 + 字节跳动实习" } },
          { date: { en: "Feb 20", zh: "2月20日" }, title: { en: "Chinese New Year Rave Night", zh: "新春电音之夜" }, detail: { en: "Year of the Horse party", zh: "马年派对" } },
        ],
      },
      {
        term: { en: "Fall 2025", zh: "2025 秋" },
        events: [
          { date: { en: "Nov 18", zh: "11月18日" }, title: { en: "Founders vs Investors: Roderick Dong", zh: "创始人 vs 投资人：Roderick Dong" }, detail: { en: "ex-YC China · Forbes 30 Under 30", zh: "前 YC 中国 · 福布斯 30 Under 30" } },
          { date: { en: "Nov", zh: "11月" }, title: { en: "UCB × USC Esports Showdown", zh: "UCB × USC 电竞对决" }, detail: { en: "vs UC Berkeley · livestreamed", zh: "对阵 UC Berkeley · 全程直播" } },
          { date: { en: "Nov 1", zh: "11月1日" }, title: { en: "BIA Halloween Party", zh: "BIA 万圣节派对" }, detail: { en: "Downtown LA", zh: "洛杉矶市中心" } },
          { date: { en: "Sep 18", zh: "9月18日" }, title: { en: "miHoYo 2026 Campus Recruiting", zh: "miHoYo 2026 校园招聘" }, detail: { en: "USC-exclusive session · IMB", zh: "USC 专场 · IMB" } },
          { date: { en: "Aug 29", zh: "8月29日" }, title: { en: "Sunset Party @ Hope DTLA", zh: "日落派对 @ Hope DTLA" }, detail: { en: "free welcome dinner for new students", zh: "新生免费迎新晚餐" } },
        ],
      },
      {
        term: { en: "Summer 2025", zh: "2025 夏" },
        events: [
          { date: { en: "Aug 4", zh: "8月4日" }, title: { en: "Summer Enterprise Tour · Meituan", zh: "暑期企业参访 · 美团" }, detail: { en: "Beijing HQ office tour", zh: "北京总部参访" } },
          { date: { en: "Jul 28", zh: "7月28日" }, title: { en: "Summer Enterprise Tour · Midea", zh: "暑期企业参访 · 美的" }, detail: { en: "Shunde office tour", zh: "顺德总部参访" } },
          { date: { en: "Jul 21", zh: "7月21日" }, title: { en: "Summer Enterprise Tour · Alibaba Taotian", zh: "暑期企业参访 · 阿里巴巴淘天" }, detail: { en: "with UC Berkeley & MIT", zh: "联合 UC Berkeley 与 MIT" } },
          { date: { en: "Jul 18", zh: "7月18日" }, title: { en: "Summer Enterprise Tour · miHoYo", zh: "暑期企业参访 · miHoYo" }, detail: { en: "Shanghai office tour", zh: "上海总部参访" } },
          { date: { en: "Jul 6", zh: "7月6日" }, title: { en: "New Student Meetup · Beijing", zh: "新生见面会 · 北京" }, detail: { en: "Kempinski Hotel", zh: "凯宾斯基酒店" } },
          { date: { en: "Jun 29", zh: "6月29日" }, title: { en: "New Student Meetup · Shanghai", zh: "新生见面会 · 上海" }, detail: { en: "InterContinental Jing'an", zh: "静安洲际酒店" } },
        ],
      },
      {
        term: { en: "Spring 2025", zh: "2025 春" },
        events: [
          { date: { en: "Apr 4", zh: "4月4日" }, title: { en: "April Fools' Party", zh: "愚人节派对" }, detail: { en: "BIA 1st anniversary", zh: "BIA 一周年" } },
        ],
      },
      {
        term: { en: "Fall 2024", zh: "2024 秋" },
        events: [
          { date: { en: "Nov 23", zh: "11月23日" }, title: { en: "USC vs. UCLA Tailgate", zh: "USC vs. UCLA Tailgate" }, detail: { en: "Roadside Tacos", zh: "Roadside Tacos" } },
          { date: { en: "Nov 17", zh: "11月17日" }, title: { en: "BIA Pool Championship", zh: "BIA 桌球锦标赛" }, detail: { en: "Koreatown", zh: "韩国城" } },
          { date: { en: "Nov 8", zh: "11月8日" }, title: { en: "KPOP Random Dance", zh: "KPOP 随机舞蹈" }, detail: { en: "USC Village", zh: "USC Village" } },
          { date: { en: "Nov 2", zh: "11月2日" }, title: { en: "The Duke's Macabre Banquet", zh: "公爵的暗夜宴会" }, detail: { en: "Halloween party", zh: "万圣节派对" } },
          { date: { en: "Oct 25", zh: "10月25日" }, title: { en: "USC vs. Rutgers Tailgate", zh: "USC vs. Rutgers Tailgate" }, detail: { en: "BIA's first tailgate", zh: "BIA 首场 tailgate" } },
          { date: { en: "Oct 9", zh: "10月9日" }, title: { en: "BIA Movie Night", zh: "BIA 电影之夜" }, detail: { en: "Now You See Me 2 · THH 301", zh: "惊天魔盗团2 · THH 301" } },
          { date: { en: "Sep 25", zh: "9月25日" }, title: { en: "Mid-Autumn Night Market", zh: "中秋夜市" }, detail: { en: "Soho Warehouse, DTLA", zh: "Soho Warehouse, DTLA" } },
        ],
      },
      {
        term: { en: "Summer 2024", zh: "2024 夏" },
        events: [
          { date: { en: "Aug 30", zh: "8月30日" }, title: { en: "Midsummer Madness", zh: "仲夏狂欢" }, detail: { en: "summer sunset party", zh: "夏日日落派对" } },
          { date: { en: "Jul 4–5", zh: "7月4–5日" }, title: { en: "New Student Meetups · China", zh: "新生见面会 · 中国" }, detail: { en: "Shenzhen & Shanghai", zh: "深圳与上海" } },
        ],
      },
    ],
    categoriesLabel: { en: "Three kinds of moments", zh: "三种瞬间" },
    categories: [
      {
        title: { en: "Experience", zh: "体验" },
        tagline: {
          en: "For the nights that make a new city feel like yours.",
          zh: "那些让一座新城市变得属于你的夜晚。",
        },
        body: {
          en: "Social gatherings, mixers, city experiences, cultural moments, and lifestyle-driven events that help people meet, express themselves, and build real memories.",
          zh: "社交聚会、破冰之夜、城市体验、文化时刻，以及由生活方式驱动的活动——帮助人们相遇、表达自己、留下真实的记忆。",
        },
      },
      {
        title: { en: "Create", zh: "创造" },
        tagline: {
          en: "For the people who want to make things, not just attend them.",
          zh: "为那些想动手创造、而不只是到场的人。",
        },
        body: {
          en: "Workshops, creative labs, build nights, design sessions, and experimental projects at the intersection of technology, art, and community.",
          zh: "工作坊、创意实验室、build night、设计夜与实验性项目——在科技、艺术与社区的交汇处。",
        },
      },
      {
        title: { en: "Future", zh: "未来" },
        tagline: {
          en: "For the conversations that open new paths.",
          zh: "那些为你打开新路径的对话。",
        },
        body: {
          en: "Career talks, founder dinners, AI and tech salons, networking events, and industry conversations that help students explore where they want to go next.",
          zh: "职业分享、创始人晚宴、AI 与科技沙龙、networking 与行业对话——帮助学生探索下一步想去的方向。",
        },
      },
    ],
    more: {
      statement: {
        en: "Every event is a doorway into the community. Some begin with a conversation, some with a project, some with a night out — but all of them are designed to help people find better connections, better experiences, and a stronger sense of direction.",
        zh: "每一场活动，都是通向社区的一扇门。有的始于一次对话，有的始于一个项目，有的始于一个夜晚——但它们都被设计来，帮助人们找到更好的连接、更好的体验，以及更清晰的方向。",
      },
      pre: { en: "Follow ", zh: "关注 " },
      post: { en: " so you don't miss the next one.", zh: "，不错过下一场。" },
    },
  },
  join: {
    hero: {
      badge: { en: "Fall 2026 Cohort", zh: "2026秋季招新" },
      title: { en: "Membership", zh: "成员体系" },
      desc: {
        en: "A selective community of people who are unreasonably good at something — and a little restless to build what's next.",
        zh: "USC 精选的社区——汇聚在某件事上格外出色、又有点不安于现状、想做出下一个东西的人。",
      },
      cta: { en: "Apply Now", zh: "立即申请" },
    },
    stats: [
      { value: "3,500+", label: { en: "Community reach", zh: "社区覆盖" } },
      {
        value: "80+",
        label: { en: "Members across 4 cohorts", zh: "4期成员" },
      },
      { value: "15+", label: { en: "Events per year", zh: "每年活动" } },
      {
        value: "4",
        label: { en: "Cohorts since founding", zh: "创立以来的期数" },
      },
    ],
    structure: {
      heading: { en: "How you grow here", zh: "你在这里如何成长" },
      subtitle: {
        en: "Everyone ships from day one. You grow by owning more, not waiting longer.",
        zh: "从第一天起，人人都在交付。你靠承担更多而成长，而不是论资排辈。",
      },
    },
    tiers: [
      {
        name: { en: "Intern", zh: "实习成员" },
        tag: { en: "First semester", zh: "第一学期" },
        desc: {
          en: "Where everyone starts. Jump into real projects, try every side of BIA, and find the work and the people that click.",
          zh: "每个人的起点。投入真实项目，尝试 BIA 的每一面，找到让你心动的工作和伙伴。",
        },
        perks: [
          { en: "Hands on real projects from week one", zh: "第一周就上手真实项目" },
          { en: "Try it all — design, build, events, partnerships", zh: "全都试试——设计、开发、活动、合作" },
          { en: "A Fellow in your corner", zh: "有一位 Fellow 罩着你" },
          { en: "All-access to every BIA event", zh: "畅通参加所有 BIA 活动" },
        ],
        promotion: {
          en: "Become a Fellow after your first semester.",
          zh: "第一学期后成为 Fellow。",
        },
      },
      {
        name: { en: "Fellow", zh: "正式成员" },
        tag: { en: "Owns the work", zh: "掌舵项目" },
        desc: {
          en: "The heart of BIA. You own what you make — projects, events, and where we go next.",
          zh: "BIA 的核心。你拥有自己做的一切——项目、活动，以及我们下一步走向哪里。",
        },
        perks: [
          { en: "Own a project end to end", zh: "从头到尾拥有一个项目" },
          { en: "Pitch new ideas and make them real", zh: "提出新点子并把它变成现实" },
          { en: "Run events 300–500 people show up to", zh: "操办 300–500 人到场的活动" },
          { en: "Bring up the next class of members", zh: "带出下一届成员" },
        ],
        promotion: {
          en: "Fellows can be elected onto the E-Board.",
          zh: "Fellow 可被选入执行委员会。",
        },
      },
      {
        name: { en: "E-Board", zh: "执行委员会" },
        tag: { en: "Steers the ship", zh: "掌舵全局" },
        desc: {
          en: "Four people holding the vision — where the big calls on strategy, flagships, and what we become get made.",
          zh: "四个人守着愿景——战略、旗舰活动、我们将成为什么，重大决定都在这里诞生。",
        },
        perks: [
          { en: "Set where BIA goes next", zh: "决定 BIA 的下一步" },
          { en: "Greenlight the boldest ideas", zh: "为最大胆的想法开绿灯" },
          { en: "Lead the flagship moments of the year", zh: "主导一年中的旗舰时刻" },
          { en: "Sit across from sponsors and partners", zh: "与赞助商和合作伙伴面对面" },
        ],
        promotion: {
          en: "",
          zh: "",
        },
      },
    ],
    process: {
      heading: { en: "The Process", zh: "申请流程" },
      steps: [
        {
          title: { en: "Apply", zh: "提交申请" },
          desc: {
            en: "Tell us who you are and what you want to build.",
            zh: "告诉我们你是谁，你想做什么。",
          },
        },
        {
          title: { en: "Coffee Chat", zh: "咖啡聊天" },
          desc: {
            en: "Casual conversation with current members.",
            zh: "与现任成员的轻松对话。",
          },
        },
        {
          title: { en: "Interview", zh: "面试" },
          desc: {
            en: "Show us your drive and how you think.",
            zh: "展示你的动力和思维方式。",
          },
        },
        {
          title: { en: "Decision", zh: "录取通知" },
          desc: {
            en: "Selected candidates join as Interns.",
            zh: "入选者以 Intern 身份加入。",
          },
        },
      ],
      note: {
        en: "We recruit at the start of each semester. Limited spots per cohort.",
        zh: "每学期初招新。每期名额有限。",
      },
    },
    faq: {
      heading: { en: "FAQ", zh: "常见问题" },
      items: [
        {
          q: { en: "What is BIA?", zh: "什么是 BIA？" },
          a: {
            en: "A student-led community at USC building experiences, products, and a place to belong — part studio, part crew, part launchpad. We turn strangers into friends and ideas into things you can touch.",
            zh: "一个起源于 USC 的学生社区，打造体验、产品和归属感——一半是工作室，一半是死党，一半是起飞的跑道。我们让陌生人变成朋友，让想法变成看得见摸得着的东西。",
          },
        },
        {
          q: { en: "Do I need experience?", zh: "我需要有经验吗？" },
          a: {
            en: "No résumé filter. We care that you're genuinely great at something — design, building, storytelling, gathering people — and hungry to make things that matter. Every major welcome.",
            zh: "不看简历门槛。我们在意的是你在某件事上真的出色——设计、创造、讲故事、把人聚到一起——并且渴望做出有意义的东西。欢迎所有专业。",
          },
        },
        {
          q: { en: "What's the time commitment?", zh: "时间投入是多少？" },
          a: {
            en: "A few hours a week, flexing with what you take on. Academics come first, always.",
            zh: "每周几个小时，随你承担的事情而变。学业永远第一。",
          },
        },
        {
          q: { en: "Can freshmen apply?", zh: "新生可以申请吗？" },
          a: {
            en: "Absolutely. Some of our best joined as freshmen. We care about drive, not class year.",
            zh: "当然。我们最优秀的一些成员就是大一加入的。我们看重驱动力，而不是年级。",
          },
        },
        {
          q: { en: "How selective is it?", zh: "竞争激烈吗？" },
          a: {
            en: "We keep each class small so it stays real. Far more applications than spots — but if you're a fit, we'll feel it. So will you.",
            zh: "我们保持每届规模小，才够真实。申请远多于名额——但如果你合适，我们会感觉到，你也会。",
          },
        },
        {
          q: { en: "What happens after I'm accepted?", zh: "被录取后会怎样？" },
          a: {
            en: "You start as an Intern: dive into real projects, find your lane and your people, and grow into a Fellow with full ownership after your first semester.",
            zh: "你以实习成员身份加入：投入真实项目，找到自己的方向和伙伴，第一学期后成长为拥有完整所有权的 Fellow。",
          },
        },
      ],
    },
    apply: {
      heading: {
        en: "Ready to build something that matters?",
        zh: "准备好创造有意义的东西了吗？",
      },
      subtitle: {
        en: "Fall 2026 applications are open. Limited spots.",
        zh: "2026 秋季申请已开放。名额有限。",
      },
      cta: { en: "Apply Now", zh: "立即申请" },
      contact: {
        en: "Questions? Reach out at bia@usc.edu",
        zh: "有问题？请联系 bia@usc.edu",
      },
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
