"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type L from "leaflet";
import ProductShell, { type ProductLanguage } from "@/components/ProductShell";
import { useAuth } from "@/components/AuthProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

type CategoryId = "all" | "landmark" | "study" | "culture" | "service" | "hidden" | "spirit" | "school" | "dining";
type ViewTab = "tasks" | "schools" | "map" | "profile";
type Lang = ProductLanguage; // "en" | "zh"

interface Task {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  postPrompt: string;
  postPromptEn: string;
  category: Exclude<CategoryId, "all">;
  cardBg: string;
  guideImg: string;
  locationHint: string;
  mapQuery: string;
  completed: boolean;
  checkinId: string | null;
  checkinPhotoUrl: string | null;
  checkinIsPublic: boolean;
}

interface Post {
  id: string;
  location_id: string;
  content: string;
  author_name: string;
  created_at: string;
}

// ─── UI Translations ──────────────────────────────────────────────────────────

const UI = {
  heroKicker:       { zh: "USC 校园探索任务卡 · Fight On",        en: "USC Campus Exploration · Fight On" },
  heroTagline:      { zh: "新生生存 Day 1 — 探索 · 发现 · 归属 · 成长", en: "Freshman Day 1 — Explore · Discover · Belong · Grow" },
  tabTasks:         { zh: "打卡任务",    en: "Check-In Tasks" },
  tabSchools:       { zh: "学院 & 食堂", en: "Schools & Dining" },
  tabMap:           { zh: "校园地图",    en: "Campus Map" },
  tabProfile:       { zh: "我的进度",    en: "My Progress" },
  catAll:           { zh: "全部",   en: "All" },
  catLandmark:      { zh: "地标",   en: "Landmark" },
  catStudy:         { zh: "图书馆", en: "Library" },
  catCulture:       { zh: "文化艺术", en: "Arts" },
  catService:       { zh: "生活服务", en: "Service" },
  catHidden:        { zh: "隐藏美学", en: "Hidden Gem" },
  catSpirit:        { zh: "体育荣耀", en: "Spirit" },
  catSchool:        { zh: "学院",  en: "School" },
  catDining:        { zh: "食堂",  en: "Dining" },
  taskCount:        { zh: (n: number, d: number) => `${n} 个任务 · ${d} 已完成`,  en: (n: number, d: number) => `${n} tasks · ${d} completed` },
  locationCount:    { zh: (n: number, d: number) => `${n} 个地点 · ${d} 已完成`, en: (n: number, d: number) => `${n} locations · ${d} completed` },
  completedOf:      { zh: (c: number, t: number) => `${c}/${t} 完成`,              en: (c: number, t: number) => `${c}/${t} Completed` },
  progressOf:       { zh: (c: number, t: number) => `${c}/${t}`,                  en: (c: number, t: number) => `${c}/${t}` },
  schoolsHeading:   { zh: "学院区 & 食堂",        en: "Schools & Dining" },
  schoolsSubtitle:  { zh: "探索各大学院的独特角落，发现USC的饮食宇宙", en: "Explore each school's unique corners and discover USC's dining universe" },
  mapHeading:       { zh: "USC 校园地图",         en: "USC Campus Map" },
  openMaps:         { zh: "在 Google 地图中打开",  en: "Open in Google Maps" },
  checkinDone:      { zh: "完成打卡",    en: "Checked In" },
  startTask:        { zh: "开始任务",    en: "Start Task" },
  collapse:         { zh: "收起",       en: "Collapse" },
  taskDone:         { zh: "任务完成 ✓",  en: "Completed ✓" },
  uploadHint:       { zh: "完成任务后，上传一张打卡照片即可完成",  en: "Upload a photo after completing this task" },
  uploadBtn:        { zh: "上传打卡照片", en: "Upload Check-in Photo" },
  uploading:        { zh: "上传中...",   en: "Uploading..." },
  uploadFail:       { zh: "上传失败",    en: "Upload failed" },
  postNickname:     { zh: "你的昵称（可选）", en: "Your nickname (optional)" },
  postPlaceholder:  { zh: "写点什么...",      en: "Write something..." },
  postSubmit:       { zh: "发布",   en: "Post" },
  postSubmitting:   { zh: "发送中...", en: "Posting..." },
  postLoading:      { zh: "加载中...",       en: "Loading..." },
  postEmpty:        { zh: "还没有人分享，来第一个！", en: "No posts yet — be the first!" },
  profileProgress:  { zh: "完成进度", en: "Progress" },
  profileCompleted: { zh: "已完成", en: "Completed" },
  profileRemaining: { zh: "未完成", en: "Remaining" },
  profileTotal:     { zh: "总地点", en: "Total" },
  profileChecked:   { zh: (c: number, t: number) => `${c} / ${t} 已完成`, en: (c: number, t: number) => `${c} / ${t} Locations Checked In` },
  allTasksHeading:  { zh: "全部任务进度", en: "All Tasks" },
  footerText:       { zh: "TROJAN QUEST · USC 校园探索任务卡 · FIGHT ON", en: "TROJAN QUEST · USC CAMPUS EXPLORATION · FIGHT ON" },
  progressLabel:    { zh: "进度", en: "Progress" },
  confirmDelete:    { zh: "确定要删除这个打卡吗？照片将无法恢复。", en: "Delete this check-in? The photo can't be recovered." },
} as const;

function u(key: keyof typeof UI, lang: Lang, ...args: number[]): string {
  const val = UI[key] as Record<Lang, string | ((...a: number[]) => string)>;
  const fn = val[lang];
  return typeof fn === "function" ? fn(...args) : fn;
}

// ─── Categories ───────────────────────────────────────────────────────────────

const TASK_CATEGORIES: { id: CategoryId; labelKey: keyof typeof UI; color: string }[] = [
  { id: "all",      labelKey: "catAll",      color: "var(--black)" },
  { id: "landmark", labelKey: "catLandmark", color: "#c0392b" },
  { id: "study",    labelKey: "catStudy",    color: "#2980b9" },
  { id: "culture",  labelKey: "catCulture",  color: "#8e44ad" },
  { id: "service",  labelKey: "catService",  color: "#27ae60" },
  { id: "hidden",   labelKey: "catHidden",   color: "#c7920f" },
  { id: "spirit",   labelKey: "catSpirit",   color: "#e74c3c" },
];

const SCHOOL_CATEGORIES: { id: CategoryId; labelKey: keyof typeof UI; color: string }[] = [
  { id: "all",    labelKey: "catAll",    color: "var(--black)" },
  { id: "school", labelKey: "catSchool", color: "#2c3e50" },
  { id: "dining", labelKey: "catDining", color: "#e67e22" },
];

// ─── Tasks ────────────────────────────────────────────────────────────────────

const INITIAL_TASKS: Task[] = [
  // ── Landmarks ─────────────────────────────────────────────────────────────
  {
    id: "t1",
    title: "找到 Tommy Trojan", titleEn: "Find Tommy Trojan",
    description: "USC的守护神，你的Trojan旅程从这里正式开始。找到他，拍下你们的第一张合照。",
    descriptionEn: "The guardian of USC — your Trojan journey officially starts here. Find him and take your very first photo together.",
    postPrompt: "在 Tommy Trojan 面前你许了什么愿望？", postPromptEn: "What did you wish for standing in front of Tommy Trojan?",
    category: "landmark", cardBg: "#fdf6e3",
    guideImg: "/trojan-quest/tommy-trojan-hd.png",
    locationHint: "Bovard Auditorium 前 · Trousdale Pkwy",
    mapQuery: "Tommy+Trojan+statue+USC+Los+Angeles+CA",
    completed: false, checkinId: null, checkinPhotoUrl: null, checkinIsPublic: true,
  },
  {
    id: "t2",
    title: "逛 USC Village", titleEn: "Explore USC Village",
    description: "USC最大的学生生活中心，红伞广场、餐厅、超市一应俱全。用$10吃一顿最满足的一餐。",
    descriptionEn: "USC's largest student hub — the iconic red umbrella plaza, restaurants, and a full grocery store. Eat a satisfying meal for under $10.",
    postPrompt: "Village 里你最推荐哪家？", postPromptEn: "Which spot at Village would you recommend most?",
    category: "landmark", cardBg: "#edfaf1",
    guideImg: "/trojan-quest/usc-village.png",
    locationHint: "Jefferson Blvd & Hoover St 交叉口",
    mapQuery: "USC+Village+3101+S+Hoover+St+Los+Angeles+CA",
    completed: false, checkinId: null, checkinPhotoUrl: null, checkinIsPublic: true,
  },
  // ── Libraries ──────────────────────────────────────────────────────────────
  {
    id: "t3",
    title: "征服 Leavey 图书馆", titleEn: "Conquer Leavey Library",
    description: "USC最现代的24小时图书馆。找到你专属的学习角落，感受USC学生的节奏。",
    descriptionEn: "USC's most modern 24/7 library. Find your perfect study spot and feel the rhythm of USC student life.",
    postPrompt: "Leavey 里你最喜欢哪个楼层或位置？", postPromptEn: "Which floor or spot in Leavey is your favorite?",
    category: "study", cardBg: "#eaf4fb",
    guideImg: "/trojan-quest/leavey.png",
    locationHint: "34th St 东侧 · McCarthy Quad 旁",
    mapQuery: "Leavey+Library+USC+University+of+Southern+California+Los+Angeles",
    completed: false, checkinId: null, checkinPhotoUrl: null, checkinIsPublic: true,
  },
  {
    id: "t4",
    title: "打卡 Doheny 图书馆", titleEn: "Check In at Doheny Library",
    description: "USC最古老最美的图书馆，哥特式大厅像电影场景。找到最震撼的角落，记录下来。",
    descriptionEn: "USC's oldest and most beautiful library — the Gothic hall looks straight out of a movie. Find the most stunning corner and capture it.",
    postPrompt: "Doheny 里你最喜欢哪个角落？", postPromptEn: "What's your favorite corner inside Doheny?",
    category: "study", cardBg: "#f5f0fb",
    guideImg: "/trojan-quest/doheny.png",
    locationHint: "Alumni Park 北侧 · Childs Way",
    mapQuery: "Doheny+Memorial+Library+USC+University+of+Southern+California+Los+Angeles",
    completed: false, checkinId: null, checkinPhotoUrl: null, checkinIsPublic: true,
  },
  // ── Culture / Hidden ───────────────────────────────────────────────────────
  {
    id: "t6",
    title: "发现 Fisher Museum", titleEn: "Discover Fisher Museum of Art",
    description: "LA最古老的大学艺术馆。进去找到最震撼你的一件作品，拍下来分享。",
    descriptionEn: "LA's oldest university art museum. Go inside, find the one piece that moves you most, and share it.",
    postPrompt: "Fisher Museum 里你最喜欢哪件展品？", postPromptEn: "Which artwork at Fisher Museum moved you the most?",
    category: "hidden", cardBg: "#fefce8",
    guideImg: "/trojan-quest/fisher-museum.png",
    locationHint: "Exposition Blvd 北侧",
    mapQuery: "Fisher+Museum+of+Art+USC+823+Exposition+Blvd+Los+Angeles+CA",
    completed: false, checkinId: null, checkinPhotoUrl: null, checkinIsPublic: true,
  },
  {
    id: "t8",
    title: "探索电影艺术学院", titleEn: "Explore School of Cinematic Arts",
    description: "乔治·卢卡斯出资建造的院子，Hollywood最近的梦工厂。找到Douglas Fairbanks雕像拍照。",
    descriptionEn: "Built with funding from George Lucas — Hollywood's closest dream factory. Find the Douglas Fairbanks statue and take a photo.",
    postPrompt: "电影学院的庭院给你什么感觉？", postPromptEn: "What feeling did the Cinematic Arts courtyard give you?",
    category: "culture", cardBg: "#e8f8f5",
    guideImg: "/trojan-quest/cinematic-arts.png",
    locationHint: "McClintock Ave & 34th St",
    mapQuery: "USC+School+of+Cinematic+Arts+900+W+34th+St+Los+Angeles+CA",
    completed: false, checkinId: null, checkinPhotoUrl: null, checkinIsPublic: true,
  },
  // ── Service ────────────────────────────────────────────────────────────────
  {
    id: "t5",
    title: "装备新生大礼包", titleEn: "Gear Up at USC Bookstore",
    description: "去USC Bookstore补充战备物资，买一件属于你的USC战袍，正式宣告Trojan身份。",
    descriptionEn: "Stock up at the USC Bookstore — grab a piece of USC gear and officially declare your Trojan identity.",
    postPrompt: "你在 Bookstore 买了什么？", postPromptEn: "What did you pick up at the Bookstore?",
    category: "service", cardBg: "#f3eefb",
    guideImg: "/trojan-quest/bookstore.png",
    locationHint: "Ronald Tutor Campus Center · 840 Childs Way",
    mapQuery: "USC+Bookstore+Ronald+Tutor+Campus+Center+840+Childs+Way+Los+Angeles+CA",
    completed: false, checkinId: null, checkinPhotoUrl: null, checkinIsPublic: true,
  },
  // ── Spirit ─────────────────────────────────────────────────────────────────
  {
    id: "t7",
    title: "朝圣 LA Memorial Coliseum", titleEn: "Pilgrimage to LA Memorial Coliseum",
    description: "奥运会两度主场，Trojan Spirit圣地。站在这里，感受百年历史的重量，许下你的Fight On誓言。",
    descriptionEn: "Two-time Olympic host and the sacred ground of Trojan Spirit. Stand here, feel the weight of a century of history, and make your Fight On vow.",
    postPrompt: "在 Coliseum 你有什么感受？", postPromptEn: "What did you feel standing at the Coliseum?",
    category: "spirit", cardBg: "#fef0ec",
    guideImg: "/trojan-quest/coliseum.png",
    locationHint: "Exposition Park · 3911 S Figueroa St",
    mapQuery: "Los+Angeles+Memorial+Coliseum+3911+S+Figueroa+St+Los+Angeles+CA",
    completed: false, checkinId: null, checkinPhotoUrl: null, checkinIsPublic: true,
  },
  // ── Schools ────────────────────────────────────────────────────────────────
  {
    id: "s1",
    title: "Marshall 商学院", titleEn: "Marshall School of Business",
    description: "Popovich Hall的哥特钟楼是校园地标。走进去感受未来商界精英们的气场，找到最有代表性的角落。",
    descriptionEn: "Popovich Hall's Gothic clock tower is a campus landmark. Walk in and feel the energy of future business leaders — find the most iconic corner.",
    postPrompt: "Marshall 有什么独特的地点或故事？", postPromptEn: "Any unique spots or stories at Marshall?",
    category: "school", cardBg: "#fdecea",
    guideImg: "/trojan-quest/marshall.png",
    locationHint: "Popovich Hall · 3670 Trousdale Pkwy",
    mapQuery: "USC+Marshall+School+of+Business+Popovich+Hall+3670+Trousdale+Pkwy+Los+Angeles+CA",
    completed: false, checkinId: null, checkinPhotoUrl: null, checkinIsPublic: true,
  },
  {
    id: "s2",
    title: "Viterbi 工程学院", titleEn: "Viterbi School of Engineering",
    description: "全美顶尖工科学院，Hughes Aircraft大楼。走进去感受工程师们每天在这里创造的世界。",
    descriptionEn: "One of America's top engineering schools. Walk into the Hughes Aircraft EEB and experience the world engineers build every day.",
    postPrompt: "Viterbi 有哪些酷炫的实验室或隐藏地点？", postPromptEn: "Any cool labs or hidden spots at Viterbi?",
    category: "school", cardBg: "#e8f4fd",
    guideImg: "/trojan-quest/viterbi.png",
    locationHint: "Hughes Aircraft EEB · 3740 McClintock Ave",
    mapQuery: "USC+Viterbi+School+of+Engineering+EEB+3740+McClintock+Ave+Los+Angeles+CA",
    completed: false, checkinId: null, checkinPhotoUrl: null, checkinIsPublic: true,
  },
  {
    id: "s3",
    title: "Annenberg 传播学院", titleEn: "Annenberg School for Communication",
    description: "Wallis Annenberg Hall，全美最漂亮的新闻传播学院之一。找到正门大拱，感受未来记者的气场。",
    descriptionEn: "Wallis Annenberg Hall — one of America's most beautiful journalism schools. Find the grand arch and feel the energy of future journalists.",
    postPrompt: "Annenberg 有什么独特的地点或秘密角落？", postPromptEn: "Any unique spots or secret corners at Annenberg?",
    category: "school", cardBg: "#f3e8fd",
    guideImg: "/trojan-quest/annenberg.png",
    locationHint: "Wallis Annenberg Hall · 3502 Watt Way",
    mapQuery: "USC+Annenberg+School+for+Communication+Wallis+Annenberg+Hall+3502+Watt+Way+Los+Angeles+CA",
    completed: false, checkinId: null, checkinPhotoUrl: null, checkinIsPublic: true,
  },
  {
    id: "s4",
    title: "Dornsife 文理学院", titleEn: "Dornsife College of Letters, Arts & Sciences",
    description: "USC最大的学院，涵盖所有文理学科。Mudd Hall是地标，找到里面最有特色的角落打卡。",
    descriptionEn: "USC's largest college, spanning all liberal arts and sciences. Mudd Hall is the landmark — find its most distinctive corner.",
    postPrompt: "Dornsife 有哪些你觉得有趣的地点？", postPromptEn: "Any interesting spots you found at Dornsife?",
    category: "school", cardBg: "#e8f5e9",
    guideImg: "/trojan-quest/dornsife.png",
    locationHint: "Mudd Hall · Bloom Walk",
    mapQuery: "Mudd+Hall+of+Philosophy+USC+Los+Angeles+CA",
    completed: false, checkinId: null, checkinPhotoUrl: null, checkinIsPublic: true,
  },
  {
    id: "s5",
    title: "Gould 法学院", titleEn: "Gould School of Law",
    description: "全美顶级法学院，Edward L. Barrett Jr. Hall。走进去感受未来律师们每天在这里辩论的气场。",
    descriptionEn: "One of America's top law schools. Walk into Edward L. Barrett Jr. Hall and feel the energy of future attorneys and judges.",
    postPrompt: "法学院有什么独特的地方值得探索？", postPromptEn: "What's worth exploring at Gould Law School?",
    category: "school", cardBg: "#fff8e1",
    guideImg: "/trojan-quest/gould.png",
    locationHint: "Edward L. Barrett Jr. Hall · Childs Way",
    mapQuery: "USC+Gould+School+of+Law+699+Exposition+Blvd+Los+Angeles+CA",
    completed: false, checkinId: null, checkinPhotoUrl: null, checkinIsPublic: true,
  },
  {
    id: "s6",
    title: "Price 公共政策学院", titleEn: "Price School of Public Policy",
    description: "全美顶尖城市规划与公共政策学院，Ralph and Goldy Lewis Hall。",
    descriptionEn: "One of America's top schools for urban planning and public policy — Ralph and Goldy Lewis Hall.",
    postPrompt: "Price School 有哪些你推荐探索的地方？", postPromptEn: "What would you recommend exploring at Price School?",
    category: "school", cardBg: "#fce4ec",
    guideImg: "/trojan-quest/price.png",
    locationHint: "Lewis Hall · Watt Way 南段",
    mapQuery: "USC+Price+School+of+Public+Policy+Lewis+Hall+Los+Angeles+CA",
    completed: false, checkinId: null, checkinPhotoUrl: null, checkinIsPublic: true,
  },
  {
    id: "s7",
    title: "Iovine and Young 学院", titleEn: "Jimmy Iovine and Andre Young Academy",
    description: "由音乐传奇Jimmy Iovine和Dr. Dre联合创办，融合艺术、设计、科技与商业。走进Iovine and Young Hall，感受创意与创业精神的碰撞。",
    descriptionEn: "Co-founded by music legend Jimmy Iovine and Dr. Dre — where art, design, technology, and business collide. Walk into Iovine and Young Hall and feel the entrepreneurial creative energy.",
    postPrompt: "Iovine and Young 学院给你什么感觉？", postPromptEn: "What vibe did you get from the Iovine and Young Academy?",
    category: "school", cardBg: "#f0f4ff",
    guideImg: "/trojan-quest/iya.png",
    locationHint: "Iovine and Young Hall · 749 W 34th St",
    mapQuery: "Iovine+and+Young+Hall+USC+749+W+34th+St+Los+Angeles+CA",
    completed: false, checkinId: null, checkinPhotoUrl: null, checkinIsPublic: true,
  },
  // ── Dining ─────────────────────────────────────────────────────────────────
  {
    id: "d1",
    title: "EVK 主食堂", titleEn: "EVK — Everybody's Kitchen",
    description: "USC最大的dining hall，全方位buffet式食堂。早中晚三餐，找到你最爱的一道菜。",
    descriptionEn: "USC's largest dining hall with a full buffet. Breakfast, lunch, and dinner — find your favorite dish and your must-avoid.",
    postPrompt: "今天 EVK 哪个菜最好吃？避雷区是什么？", postPromptEn: "What's the best dish at EVK today? Any ones to avoid?",
    category: "dining", cardBg: "#fff3e0",
    guideImg: "/trojan-quest/evk.png",
    locationHint: "Everybody's Kitchen · 635 McCarthy Way",
    mapQuery: "EVK+Everybodys+Kitchen+USC+635+McCarthy+Way+Los+Angeles+CA",
    completed: false, checkinId: null, checkinPhotoUrl: null, checkinIsPublic: true,
  },
  {
    id: "d2",
    title: "Parkside 餐厅", titleEn: "Parkside Restaurant",
    description: "USC Village里的学生餐厅，氛围更好，菜品更多样。Village dining的首选。",
    descriptionEn: "USC Village's student dining hall — better atmosphere and more variety. The top dining choice at Village.",
    postPrompt: "今天 Parkside 哪个菜最好吃？", postPromptEn: "What's the best dish at Parkside today?",
    category: "dining", cardBg: "#e8f5e9",
    guideImg: "/trojan-quest/pks.png",
    locationHint: "Parkside · 3771 McClintock Ave",
    mapQuery: "Parkside+Restaurant+USC+Village+3771+McClintock+Ave+Los+Angeles+CA",
    completed: false, checkinId: null, checkinPhotoUrl: null, checkinIsPublic: true,
  },
  {
    id: "d4",
    title: "Campus Center 快餐区", titleEn: "Tutor Campus Center Food Court",
    description: "Tutor Campus Center里有多个快餐档口，适合两节课间隙快速填肚子。",
    descriptionEn: "Multiple quick-service counters inside Tutor Campus Center — perfect for a fast bite between classes.",
    postPrompt: "Campus Center 今天哪家排队最少？哪家最好吃？", postPromptEn: "Which counter has the shortest line today? Which is best?",
    category: "dining", cardBg: "#fff8e1",
    guideImg: "/trojan-quest/tcc.png",
    locationHint: "Ronald Tutor Campus Center 1楼",
    mapQuery: "Ronald+Tutor+Campus+Center+USC+840+Childs+Way+Los+Angeles+CA",
    completed: false, checkinId: null, checkinPhotoUrl: null, checkinIsPublic: true,
  },
  {
    id: "d5",
    title: "VLG USC Village 食堂", titleEn: "VLG — USC Village Dining",
    description: "USC Village里的旗舰食堂，全新装修，菜品丰富。Village最热门的dining spot。",
    descriptionEn: "The flagship dining hall at USC Village — fully renovated with a wide variety of options. The most popular dining spot at Village.",
    postPrompt: "今天 VLG 哪个菜最值得推荐？", postPromptEn: "What's the top dish at VLG today?",
    category: "dining", cardBg: "#fff3e0",
    guideImg: "/trojan-quest/vlg.png",
    locationHint: "USC Village Dining · 3607 Trousdale Pkwy",
    mapQuery: "USC+Village+Dining+VLG+3607+Trousdale+Pkwy+Los+Angeles+CA",
    completed: false, checkinId: null, checkinPhotoUrl: null, checkinIsPublic: true,
  },
];

const MAP_LOCATIONS = INITIAL_TASKS.map(t => ({ id: t.id, label: t.title, labelEn: t.titleEn, mapQuery: t.mapQuery }));

// ─── Map pin data ──────────────────────────────────────────────────────────────
// Coordinates are image pixels on usc-campus-map.png (3301 × 2550), top-left origin.
// Leaflet CRS.Simple uses [IMG_H - y, x] (y-flipped).
// null = off this campus map.
//
// To fine-tune: open the map, right-click the spot, note pixel coords, update here.

const IMG_W = 3301, IMG_H = 2550;

// Building illustrations shown as popup above pin when selected.
const MAP_BUILDING_IMGS: Partial<Record<string, string>> = {
  t1: "/trojan-quest/tommy-trojan-hd.png",   // Tommy Trojan statue
  t2: "/trojan-quest/village-hd.png",        // USC Village
  t3: "/trojan-quest/leavey-hd.png",         // Leavey Library
  t4: "/trojan-quest/doheny-hd.png",         // Doheny Library
  t5: "/trojan-quest/bookstore-hd.png",      // USC Bookstore
  t6: "/trojan-quest/fisher-museum.png",     // Fisher Museum of Art
  t7: "/trojan-quest/coliseum.png",          // LA Memorial Coliseum
  t8: "/trojan-quest/cinematic-arts-hd.png", // School of Cinematic Arts
  s1: "/trojan-quest/marshall-hd.png",       // Marshall School of Business
  s2: "/trojan-quest/vivian-hall.png",       // Viterbi — Vivian Hall
  s3: "/trojan-quest/annenberg-hd.png",      // Annenberg
  s4: "/trojan-quest/dornsife-hd.png",       // Dornsife College
  s5: "/trojan-quest/gould-hd.png",          // Gould School of Law
  s6: "/trojan-quest/price-hd.png",          // Price School of Public Policy
  s7: "/trojan-quest/iya-hd.png",            // Iovine and Young Academy
  d1: "/trojan-quest/evk.png",              // EVK — Everybody's Kitchen
  d2: "/trojan-quest/pks.png",              // Parkside Restaurant
  d4: "/trojan-quest/tcc.png",              // Tutor Campus Center Food Court
  d5: "/trojan-quest/vlg.png",              // VLG — USC Village Dining
};

// [x, y] in image pixels — scaled from verified grid positions on the 3301×2550 map.
const MAP_PINS_PX: Record<string, [number, number] | null> = {
  t1: [1364, 1797],  // Tommy Trojan
  t2: [1170,  678],  // USC Village
  t3: [1876, 1525],  // Leavey Library
  t4: [1686, 1896],  // Doheny Library
  t6: [ 988, 2256],  // Fisher Museum of Art
  t8: [ 937, 1038],  // School of Cinematic Arts
  t5: [1115, 1775],  // USC Bookstore (TCC)
  t7: [1061, 2358],  // LA Memorial Coliseum
  s1: [1959, 2233],  // Marshall — Popovich Hall
  s2: [ 812, 1873],  // Viterbi — Vivian Hall
  s3: [1037, 1695],  // Annenberg — Wallis Annenberg Hall
  s4: [ 553, 1503],  // Dornsife — Mudd Hall
  s5: [1532, 2220],  // Gould School of Law
  s6: [1736, 2068],  // Price — Lewis Hall
  s7: [ 780, 2246],  // Iovine and Young Academy
  d1: [2048, 1620],  // EVK — Everybody's Kitchen
  d2: [ 257, 2208],  // Parkside Dining Hall
  d4: [1186, 1843],  // Tutor Campus Center Food Court
  d5: [1232,  536],  // VLG — USC Village Dining
};

// ─── Photo Upload ─────────────────────────────────────────────────────────────

function PhotoUpload({
  taskId, lang, isPublic,
  onUploaded,
}: {
  taskId: string;
  lang: Lang;
  isPublic: boolean;
  onUploaded: (checkinId: string, url: string, isPublic: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pub, setPub] = useState(isPublic);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(null);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      fd.append("taskId", taskId);
      fd.append("isPublic", String(pub));
      const res = await fetch("/api/trojan-quest/checkin", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? UI.uploadFail[lang]);
      onUploaded(json.id, json.photo_url, json.is_public);
    } catch (err) {
      setError(err instanceof Error ? err.message : UI.uploadFail[lang]);
    } finally { setUploading(false); }
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* Public/private toggle */}
      <button
        onClick={() => setPub(p => !p)}
        className="text-[11px] px-3 py-1.5 self-start transition-all duration-200"
        style={{
          borderRadius: 20,
          background: pub ? "#FFCC00" : "rgba(0,0,0,0.06)",
          color: pub ? "#2b2b2b" : "#888",
          border: "none",
          fontWeight: 500,
        }}
      >
        {pub
          ? (lang === "en" ? "🌐 Public" : "🌐 公开")
          : (lang === "en" ? "🔒 Private" : "🔒 不公开")}
      </button>
      <div className="flex items-center gap-3">
        <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-sm font-medium px-5 py-2.5 transition-all duration-200 disabled:opacity-60"
          style={{
            borderRadius: 10,
            background: uploading ? "#c0392b" : "#990000",
            color: "white",
            border: "none",
          }}
        >
          {uploading ? UI.uploading[lang] : UI.uploadBtn[lang]}
        </button>
      </div>
      {error && <p className="text-xs" style={{ color: "#990000" }}>{error}</p>}
    </div>
  );
}

// ─── Post Section ─────────────────────────────────────────────────────────────

function PostSection({ locationId, prompt, lang }: { locationId: string; prompt: string; lang: Lang }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trojan-quest/posts?location_id=${locationId}`);
      if (res.ok) setPosts(await res.json());
    } finally { setLoading(false); }
  }, [locationId]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/trojan-quest/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location_id: locationId, content, author_name: name || "Trojan Explorer" }),
      });
      if (res.ok) {
        const newPost = await res.json();
        setPosts(prev => [newPost, ...prev]);
        setContent(""); setName("");
      }
    } finally { setSubmitting(false); }
  }

  return (
    <div className="pt-4 mt-4" style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}>
      <p className="text-[11px] font-medium uppercase tracking-widest mb-3" style={{ color: "#aaa" }}>
        {prompt}
      </p>
      <form onSubmit={handleSubmit} className="mb-4">
        <input
          value={name} onChange={e => setName(e.target.value)}
          placeholder={UI.postNickname[lang]}
          className="w-full mb-2 px-3 py-2 text-sm outline-none transition-all duration-200"
          style={{
            borderRadius: 8,
            border: "1px solid rgba(0,0,0,0.1)",
            background: "rgba(255,255,255,0.8)",
            fontFamily: "var(--font-body)",
            color: "#2b2b2b",
          }}
          onFocus={e => { e.target.style.borderColor = "#990000"; e.target.style.boxShadow = "0 0 0 3px rgba(153,0,0,0.08)"; }}
          onBlur={e => { e.target.style.borderColor = "rgba(0,0,0,0.1)"; e.target.style.boxShadow = "none"; }}
        />
        <textarea
          value={content} onChange={e => setContent(e.target.value)}
          placeholder={UI.postPlaceholder[lang]}
          rows={2}
          className="w-full mb-2.5 px-3 py-2 text-sm outline-none resize-none transition-all duration-200"
          style={{
            borderRadius: 8,
            border: "1px solid rgba(0,0,0,0.1)",
            background: "rgba(255,255,255,0.8)",
            fontFamily: "var(--font-body)",
            color: "#2b2b2b",
          }}
          onFocus={e => { e.target.style.borderColor = "#990000"; e.target.style.boxShadow = "0 0 0 3px rgba(153,0,0,0.08)"; }}
          onBlur={e => { e.target.style.borderColor = "rgba(0,0,0,0.1)"; e.target.style.boxShadow = "none"; }}
        />
        <button
          type="submit" disabled={submitting || !content.trim()}
          className="text-sm font-medium px-4 py-2 transition-all duration-200 disabled:opacity-40"
          style={{
            borderRadius: 10,
            background: "#FFCC00",
            color: "#2b2b2b",
            border: "none",
          }}
        >
          {submitting ? UI.postSubmitting[lang] : UI.postSubmit[lang]}
        </button>
      </form>
      {loading ? (
        <p className="text-xs" style={{ color: "#aaa" }}>{UI.postLoading[lang]}</p>
      ) : posts.length === 0 ? (
        <p className="text-xs" style={{ color: "#aaa" }}>{UI.postEmpty[lang]}</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
          {posts.map(post => (
            <div key={post.id} className="px-3 py-2.5" style={{ borderRadius: 10, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(0,0,0,0.06)" }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-semibold" style={{ color: "#990000" }}>{post.author_name}</span>
                <span className="text-[10px]" style={{ color: "#bbb" }}>
                  {new Date(post.created_at).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#444" }}>{post.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
  task, lang,
  onComplete, onDelete, onTogglePublic,
}: {
  task: Task;
  lang: Lang;
  onComplete: (id: string, checkinId: string, url: string, isPublic: boolean) => void;
  onDelete: (taskId: string, checkinId: string) => void;
  onTogglePublic: (taskId: string, checkinId: string, isPublic: boolean) => void;
}) {
  const { user, promptSignIn } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function handleDelete() {
    if (!task.checkinId) return;
    if (!window.confirm(UI.confirmDelete[lang])) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/trojan-quest/checkin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkinId: task.checkinId }),
      });
      if (res.ok) onDelete(task.id, task.checkinId);
    } finally { setDeleting(false); }
  }

  async function handleTogglePublic() {
    if (!task.checkinId) return;
    setToggling(true);
    const next = !task.checkinIsPublic;
    try {
      const res = await fetch("/api/trojan-quest/checkin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkinId: task.checkinId, isPublic: next }),
      });
      if (res.ok) onTogglePublic(task.id, task.checkinId, next);
    } finally { setToggling(false); }
  }

  function handleStart() {
    if (!user) {
      promptSignIn({
        title: lang === "en" ? "Sign in to check in" : "登录后打卡",
        subtitle: lang === "en" ? "Save your check-in photo to your account." : "登录后可保存打卡照片。",
        onSuccess: () => setExpanded(true),
      });
      return;
    }
    setExpanded(e => !e);
  }

  const allCats = [...TASK_CATEGORIES, ...SCHOOL_CATEGORIES];
  const catMeta = allCats.find(c => c.id === task.category);
  const catLabel = catMeta ? (UI[catMeta.labelKey] as Record<Lang, string>)[lang] : task.category;
  const catBg    = catMeta?.color ?? "#999";

  const mapsUrl  = `https://maps.google.com/?q=${task.mapQuery}`;

  const title = lang === "en" ? task.titleEn : task.title;
  const desc  = lang === "en" ? task.descriptionEn : task.description;
  const prompt = lang === "en" ? task.postPromptEn : task.postPrompt;

  return (
    <div
      id={`task-${task.id}`}
      className="overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        borderRadius: 16,
        background: task.completed ? "#faf8f5" : task.cardBg,
        boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
        border: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      {/* Guide image */}
      {task.guideImg && (
        <div className="relative w-full overflow-hidden" style={{ height: 220, borderRadius: "16px 16px 0 0" }}>
          <div
            className="absolute"
            style={{ inset: "-8%", backgroundImage: `url(${task.guideImg})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(22px)" }}
          />
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.08)" }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={task.guideImg} alt={title} className="relative w-full h-full block" style={{ objectFit: "contain", zIndex: 1 }} />
          {task.completed && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.38)", borderRadius: "16px 16px 0 0" }}>
              <span className="text-white text-lg font-semibold px-4 py-1.5" style={{ borderRadius: 24, background: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)", border: "1.5px solid rgba(255,255,255,0.5)" }}>{UI.checkinDone[lang]}</span>
            </div>
          )}
          <span
            className="absolute top-3 left-3 text-[11px] font-semibold px-2.5 py-1"
            style={{ borderRadius: 20, background: catBg, color: "white", backdropFilter: "blur(4px)" }}
          >
            {catLabel}
          </span>
        </div>
      )}

      {/* No-image header */}
      {!task.guideImg && (
        <div className="px-5 py-3 flex items-center" style={{ borderRadius: "16px 16px 0 0", background: catBg }}>
          <span className="text-sm font-semibold text-white">{catLabel}</span>
        </div>
      )}

      <div className="px-5 py-5">
        <h3
          className="font-display text-xl leading-snug mb-2"
          style={{ color: task.completed ? "#888" : "#2b2b2b", textDecoration: task.completed ? "line-through" : "none" }}
        >
          {title}
        </h3>
        <p className="text-sm leading-relaxed mb-4" style={{ color: "#666", lineHeight: 1.6 }}>{desc}</p>

        <div className="flex items-center gap-2.5 mb-4 flex-wrap">
          <span className="text-xs" style={{ color: "#999" }}>📍 {task.locationHint}</span>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium px-2.5 py-1 transition-all duration-200 hover:opacity-80"
            style={{ borderRadius: 8, background: "rgba(26,115,232,0.08)", color: "#1a73e8", border: "none" }}
          >
            {UI.openMaps[lang]}
          </a>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex-1 h-1.5 overflow-hidden" style={{ borderRadius: 4, background: "rgba(0,0,0,0.07)" }}>
            <div className="h-full transition-all duration-500" style={{ width: task.completed ? "100%" : "0%", borderRadius: 4, background: "#990000" }} />
          </div>
          <span className="text-[11px] shrink-0 font-medium" style={{ color: task.completed ? "#990000" : "#bbb" }}>
            {task.completed ? "1" : "0"}/1
          </span>
        </div>

        {/* Completed photo */}
        {task.completed && task.checkinPhotoUrl && (
          <div className="mb-4">
            <div className="relative overflow-hidden" style={{ height: 180, borderRadius: 12 }}>
              <div className="absolute" style={{ inset: "-8%", backgroundImage: `url(${task.checkinPhotoUrl})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(20px)" }} />
              <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.08)" }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={task.checkinPhotoUrl} alt={lang === "en" ? "Check-in photo" : "打卡照片"} className="relative w-full h-full block" style={{ objectFit: "contain", zIndex: 1 }} />
            </div>
          </div>
        )}

        {/* Community photo preview for unauthenticated users */}
        {!task.completed && task.checkinPhotoUrl && (
          <div className="mb-4">
            <p className="text-[11px] font-medium mb-1.5" style={{ color: "#aaa" }}>
              {lang === "en" ? "Community check-in" : "他人的打卡"}
            </p>
            <div className="relative overflow-hidden" style={{ height: 140, borderRadius: 10 }}>
              <div className="absolute" style={{ inset: "-8%", backgroundImage: `url(${task.checkinPhotoUrl})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(20px)" }} />
              <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.08)" }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={task.checkinPhotoUrl} alt="" className="relative w-full h-full block" style={{ objectFit: "contain", zIndex: 1 }} />
            </div>
          </div>
        )}

        {/* Action */}
        {task.completed ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold px-3 py-1.5" style={{ borderRadius: 20, background: "rgba(153,0,0,0.08)", color: "#990000" }}>
              {UI.taskDone[lang]}
            </span>
            {/* Public/private toggle — only for own checkins */}
            {task.checkinId && (
              <button
                onClick={handleTogglePublic}
                disabled={toggling}
                className="text-xs font-medium px-3 py-1.5 transition-all duration-200 disabled:opacity-50"
                style={{
                  borderRadius: 20,
                  background: task.checkinIsPublic ? "#FFCC00" : "rgba(0,0,0,0.06)",
                  color: "#2b2b2b",
                  border: "none",
                }}
              >
                {task.checkinIsPublic
                  ? (lang === "en" ? "🌐 Public" : "🌐 已公开")
                  : (lang === "en" ? "🔒 Private" : "🔒 不公开")}
              </button>
            )}
            {/* Delete — only for own checkins */}
            {task.checkinId && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs font-medium px-3 py-1.5 transition-all duration-200 disabled:opacity-50 hover:opacity-80"
                style={{
                  borderRadius: 20,
                  background: "rgba(192,57,43,0.08)",
                  color: "#c0392b",
                  border: "none",
                }}
              >
                {deleting
                  ? (lang === "en" ? "Removing..." : "删除中...")
                  : (lang === "en" ? "Remove" : "删除打卡")}
              </button>
            )}
          </div>
        ) : (
          <>
            <button
              onClick={handleStart}
              className="text-sm font-medium px-5 py-2.5 mb-3 transition-all duration-200 hover:opacity-90"
              style={{
                borderRadius: 10,
                background: expanded ? "#2b2b2b" : "#990000",
                color: "white",
                border: "none",
              }}
            >
              {expanded ? UI.collapse[lang] : UI.startTask[lang]}
            </button>
            {expanded && (
              <div className="pt-4 mb-3" style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}>
                <p className="text-xs mb-3" style={{ color: "#999" }}>{UI.uploadHint[lang]}</p>
                <PhotoUpload
                  taskId={task.id}
                  lang={lang}
                  isPublic={true}
                  onUploaded={(checkinId, url, pub) => onComplete(task.id, checkinId, url, pub)}
                />
              </div>
            )}
          </>
        )}

        <PostSection locationId={task.id} prompt={prompt} lang={lang} />
      </div>
    </div>
  );
}

// ─── Campus Map Tab (Leaflet) ─────────────────────────────────────────────────

function CampusMapTab({ tasks, lang }: { tasks: Task[]; lang: Lang }) {
  const [selected, setSelected] = useState<(typeof MAP_LOCATIONS)[0] | null>(null);
  const mapDivRef  = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<{ map: L.Map; markers: Record<string, L.Marker> } | null>(null);

  // Inject Leaflet CSS once
  useEffect(() => {
    if (document.getElementById("leaflet-css")) return;
    const link = document.createElement("link");
    link.id   = "leaflet-css";
    link.rel  = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }, []);

  // Init / destroy Leaflet map
  useEffect(() => {
    if (!mapDivRef.current || leafletRef.current) return;

    import("leaflet").then(({ default: L }) => {
      if (!mapDivRef.current || leafletRef.current) return;

      const bounds: L.LatLngBoundsExpression = [[0, 0], [IMG_H, IMG_W]];
      const toLL = (x: number, y: number): L.LatLngExpression => [IMG_H - y, x];

      const map = L.map(mapDivRef.current!, {
        crs: L.CRS.Simple,
        zoomSnap: 0,
        zoomDelta: 0.35,
        wheelPxPerZoomLevel: 70,
        scrollWheelZoom: true,
        zoomAnimation: true,
        fadeAnimation: true,
        doubleClickZoom: true,
        touchZoom: true,
        inertia: true,
        inertiaDeceleration: 3000,
        inertiaMaxSpeed: 1500,
        attributionControl: false,
        zoomControl: false,
      });

      L.imageOverlay("/trojan-quest/usc-campus-map.png", bounds).addTo(map);

      // fitBounds after paint so Leaflet reads the real container size
      requestAnimationFrame(() => {
        map.invalidateSize();
        map.fitBounds(bounds, { padding: [4, 4] });
        map.setMinZoom(map.getZoom() - 0.5);
        map.setMaxZoom(map.getZoom() + 6);
        // Constrain panning so the image always covers the viewport (no gray borders)
        map.setMaxBounds(bounds);
        map.options.maxBoundsViscosity = 1.0;
      });

      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Custom circular icon
      const makeIcon = (active: boolean, done: boolean) => L.divIcon({
        className: "",
        html: `<div style="
          width:${active ? 16 : 10}px;height:${active ? 16 : 10}px;
          background:${active ? "#FFD700" : done ? "#27ae60" : "#990000"};
          border:2.5px solid white;border-radius:50%;
          box-shadow:0 2px 8px rgba(0,0,0,.5);
          transition:all .2s;
        "></div>`,
        iconSize:    [active ? 16 : 10, active ? 16 : 10],
        iconAnchor:  [active ? 8  : 5,  active ? 8  : 5 ],
        popupAnchor: [0, active ? -12 : -8],
      });

      const markers: Record<string, L.Marker> = {};
      let activeId: string | null = null;

      MAP_LOCATIONS.forEach(loc => {
        const px = MAP_PINS_PX[loc.id];
        if (!px) return;
        const t = tasks.find(x => x.id === loc.id);
        const done = t?.completed ?? false;
        const buildingImg = MAP_BUILDING_IMGS[loc.id] ?? null;
        const hint = t?.locationHint ?? "";

        const m = L.marker(toLL(px[0], px[1]), { icon: makeIcon(false, done) }).addTo(map);

        const popupHtml = buildingImg
          ? `<div style="width:220px;font-family:-apple-system,sans-serif;overflow:hidden">
               <img src="${buildingImg}" style="width:100%;display:block;background:#f5f0e8" />
               <div style="padding:10px 12px">
                 <div style="font-size:13px;font-weight:700;color:#1a1410;margin-bottom:3px">${lang === "en" ? loc.labelEn : loc.label}</div>
                 <div style="font-size:11px;color:#777">${hint}</div>
               </div>
             </div>`
          : `<div style="padding:10px 12px;font-family:-apple-system,sans-serif;min-width:150px">
               <div style="font-size:14px;font-weight:700;color:#1a1410">${lang === "en" ? loc.labelEn : loc.label}</div>
               ${hint ? `<div style="font-size:11px;color:#777;margin-top:4px">${hint}</div>` : ""}
             </div>`;

        m.bindPopup(popupHtml, { closeButton: true, maxWidth: 240, offset: [0, -4] });

        m.on("click", () => {
          // Reset previous active
          if (activeId && markers[activeId]) {
            const prev = tasks.find(x => x.id === activeId);
            markers[activeId].setIcon(makeIcon(false, prev?.completed ?? false));
          }
          activeId = loc.id;
          m.setIcon(makeIcon(true, done));
          setSelected(loc);
          // Sync sidebar
          document.querySelectorAll<HTMLElement>("[data-loc-id]").forEach(el => el.classList.remove("loc-active"));
          document.querySelector<HTMLElement>(`[data-loc-id="${loc.id}"]`)?.classList.add("loc-active");
        });

        markers[loc.id] = m;
      });

      leafletRef.current = { map, markers };
    });

    return () => {
      leafletRef.current?.map.remove();
      leafletRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flyToLoc(loc: (typeof MAP_LOCATIONS)[0]) {
    const px = MAP_PINS_PX[loc.id];
    if (!px || !leafletRef.current) return;
    const { map, markers } = leafletRef.current;
    const ll: [number, number] = [IMG_H - px[1], px[0]];
    map.flyTo(ll, map.getZoom(), { duration: 0.6, easeLinearity: 0.35 });
    setTimeout(() => markers[loc.id]?.openPopup(), 720);
  }

  function handleSidebarClick(loc: (typeof MAP_LOCATIONS)[0]) {
    setSelected(s => {
      if (s?.id === loc.id) return null;
      flyToLoc(loc);
      return loc;
    });
  }

  return (
    <div>
      <h2 className="font-display text-[30px] leading-none mb-4" style={{ color: "var(--black)" }}>
        {UI.mapHeading[lang]}
      </h2>

      {/* Leaflet map container */}
      <div
        ref={mapDivRef}
        className="border-[3px] border-[var(--black)] mb-4"
        style={{ height: 480, boxShadow: "6px 6px 0 rgba(26,20,16,0.18)" }}
      />

      {/* Location grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {MAP_LOCATIONS.map(loc => {
          const t = tasks.find(x => x.id === loc.id);
          const done = t?.completed ?? false;
          const active = selected?.id === loc.id;
          return (
            <button
              key={loc.id}
              data-loc-id={loc.id}
              onClick={() => handleSidebarClick(loc)}
              className="flex items-center gap-2 border-[2px] border-[var(--black)] px-3 py-2 text-left transition-colors"
              style={{ background: active ? "var(--cardinal)" : done ? "rgba(39,174,96,0.1)" : "var(--cream)", color: active ? "white" : "var(--black)" }}
            >
              <span className="text-xs leading-tight font-display tracking-wide truncate">
                {lang === "en" ? loc.labelEn : loc.label}
                {done && !active && <span className="ml-1" style={{ color: "#27ae60" }}>✓</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page Content ─────────────────────────────────────────────────────────────

function TrojanQuestContent({ language }: { language: Lang }) {
  const { user } = useAuth();
  // Remount on auth change so task state fully resets on sign-in/out.
  return <TrojanQuestInner key={user?.id ?? "anon"} language={language} />;
}

function TrojanQuestInner({ language }: { language: Lang }) {
  const lang = language;
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [activeView, setActiveView] = useState<ViewTab>("tasks");
  const [activeCat, setActiveCat] = useState<CategoryId>("all");
  const [activeSchoolCat, setActiveSchoolCat] = useState<CategoryId>("all");

  // Load user's existing checkins when logged in.
  // State is reset on sign-in/out via the remount key on TrojanQuestContent,
  // so this effect only fetches — it never sets state synchronously.
  // The AbortController cancels an in-flight load if the effect re-runs,
  // so a slow response can't repopulate stale (e.g. signed-out) state.
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/trojan-quest/checkin", { signal: controller.signal })
      .then(r => r.ok ? r.json() : [])
      .then((checkins: { id?: string; task_id: string; photo_url: string; is_public?: boolean }[]) => {
        setTasks(prev => prev.map(t => {
          const c = checkins.find(c => c.task_id === t.id);
          if (!c) return t;
          if (c.id) {
            // Own checkin (authenticated)
            return { ...t, completed: true, checkinId: c.id, checkinPhotoUrl: c.photo_url, checkinIsPublic: c.is_public ?? true };
          }
          // Public preview (unauthenticated) — show photo but don't mark as completed
          return { ...t, checkinPhotoUrl: c.photo_url };
        }));
      })
      .catch(() => { /* ignore aborts and transient fetch errors */ });
    return () => controller.abort();
  }, [user]);

  const mainTasks = tasks.filter(t => !["school","dining"].includes(t.category));
  const schoolTasks = tasks.filter(t => ["school","dining"].includes(t.category));
  const filteredMain = activeCat === "all" ? mainTasks : mainTasks.filter(t => t.category === activeCat);
  const filteredSchool = activeSchoolCat === "all" ? schoolTasks : schoolTasks.filter(t => t.category === activeSchoolCat);

  const completedCount = tasks.filter(t => t.completed).length;

  function handleComplete(taskId: string, checkinId: string, url: string, isPublic: boolean) {
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, completed: true, checkinId, checkinPhotoUrl: url, checkinIsPublic: isPublic }
        : t
    ));
  }

  function handleDelete(taskId: string) {
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, completed: false, checkinId: null, checkinPhotoUrl: null, checkinIsPublic: true }
        : t
    ));
  }

  function handleTogglePublic(taskId: string, _checkinId: string, isPublic: boolean) {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, checkinIsPublic: isPublic } : t
    ));
  }

  const VIEWS: { key: ViewTab; labelKey: keyof typeof UI }[] = [
    { key: "tasks",   labelKey: "tabTasks" },
    { key: "schools", labelKey: "tabSchools" },
    { key: "map",     labelKey: "tabMap" },
    { key: "profile", labelKey: "tabProfile" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--beige)" }}>

      {/* Hero */}
      <section style={{ background: "var(--cream)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div className="max-w-3xl mx-auto px-5 py-7">
          <p className="text-[11px] font-medium tracking-widest uppercase mb-2" style={{ color: "#bbb" }}>
            {UI.heroKicker[lang]}
          </p>
          <h1 className="font-display text-[38px] sm:text-[50px] leading-[0.92] mb-2" style={{ color: "#2b2b2b" }}>
            TROJAN
            <br /><span style={{ color: "#990000" }}>QUEST</span>
          </h1>
          <p className="text-sm mb-5" style={{ color: "#888", lineHeight: 1.5 }}>{UI.heroTagline[lang]}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="px-3.5 py-1.5" style={{ borderRadius: 20, background: "rgba(153,0,0,0.07)" }}>
              <span className="text-xs font-semibold" style={{ color: "#990000" }}>
                {u("completedOf", lang, completedCount, tasks.length)}
              </span>
            </div>
            <div className="flex-1 min-w-[120px]">
              <div className="flex justify-between mb-1">
                <span className="text-[10px]" style={{ color: "#bbb" }}>{UI.progressLabel[lang]}</span>
                <span className="text-[10px] font-medium" style={{ color: "#999" }}>{u("progressOf", lang, completedCount, tasks.length)}</span>
              </div>
              <div className="h-2 overflow-hidden" style={{ borderRadius: 4, background: "rgba(0,0,0,0.07)" }}>
                <div className="h-full transition-all duration-500" style={{ width: `${(completedCount / tasks.length) * 100}%`, borderRadius: 4, background: "#990000" }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* View tabs */}
      <div className="max-w-3xl mx-auto px-5 pt-5 flex gap-2 overflow-x-auto pb-1">
        {VIEWS.map(v => (
          <button
            key={v.key}
            onClick={() => setActiveView(v.key)}
            className="text-sm font-medium px-4 py-2 shrink-0 transition-all duration-200"
            style={{
              borderRadius: 10,
              background: activeView === v.key ? "#990000" : "rgba(0,0,0,0.05)",
              color: activeView === v.key ? "white" : "#666",
              border: "none",
            }}
          >
            {(UI[v.labelKey] as Record<Lang, string>)[lang]}
          </button>
        ))}
      </div>

      {/* 打卡任务 */}
      {activeView === "tasks" && (
        <section className="max-w-3xl mx-auto px-5 py-6">
          <div className="flex gap-2 overflow-x-auto mb-6 pb-1">
            {TASK_CATEGORIES.map(cat => {
              const label = (UI[cat.labelKey] as Record<Lang, string>)[lang];
              const active = activeCat === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(cat.id)}
                  className="text-xs font-medium px-3.5 py-1.5 shrink-0 whitespace-nowrap transition-all duration-200"
                  style={{
                    borderRadius: 20,
                    background: active ? cat.color : "rgba(0,0,0,0.05)",
                    color: active ? "white" : "#666",
                    border: "none",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="text-xs mb-4 font-display tracking-wider" style={{ color: "var(--mid)" }}>
            {u("taskCount", lang, filteredMain.length, filteredMain.filter(t => t.completed).length)}
          </p>
          <div className="flex flex-col gap-5">
            {filteredMain.map(task => (
              <TaskCard key={task.id} task={task} lang={lang} onComplete={handleComplete} onDelete={handleDelete} onTogglePublic={handleTogglePublic} />
            ))}
          </div>
        </section>
      )}

      {/* 学院 & 食堂 */}
      {activeView === "schools" && (
        <section className="max-w-3xl mx-auto px-5 py-6">
          <div className="mb-5">
            <h2 className="font-display text-[28px] leading-none mb-1" style={{ color: "var(--black)" }}>{UI.schoolsHeading[lang]}</h2>
            <p className="text-sm" style={{ color: "var(--mid)" }}>{UI.schoolsSubtitle[lang]}</p>
          </div>
          <div className="flex gap-2 mb-6">
            {SCHOOL_CATEGORIES.map(cat => {
              const label = (UI[cat.labelKey] as Record<Lang, string>)[lang];
              const active = activeSchoolCat === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveSchoolCat(cat.id)}
                  className="text-xs font-medium px-3.5 py-1.5 shrink-0 whitespace-nowrap transition-all duration-200"
                  style={{
                    borderRadius: 20,
                    background: active ? cat.color : "rgba(0,0,0,0.05)",
                    color: active ? "white" : "#666",
                    border: "none",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="text-xs mb-4 font-display tracking-wider" style={{ color: "var(--mid)" }}>
            {u("locationCount", lang, filteredSchool.length, filteredSchool.filter(t => t.completed).length)}
          </p>
          <div className="flex flex-col gap-5">
            {filteredSchool.map(task => (
              <TaskCard key={task.id} task={task} lang={lang} onComplete={handleComplete} onDelete={handleDelete} onTogglePublic={handleTogglePublic} />
            ))}
          </div>
        </section>
      )}

      {/* 校园地图 */}
      {activeView === "map" && (
        <section className="max-w-3xl mx-auto px-5 py-6">
          <CampusMapTab tasks={tasks} lang={lang} />
        </section>
      )}

      {/* 我的进度 */}
      {activeView === "profile" && (
        <section className="max-w-3xl mx-auto px-5 py-6">
          <div className="p-5 mb-6" style={{ borderRadius: 16, background: "var(--cream)", boxShadow: "0 2px 16px rgba(0,0,0,0.07)", border: "1px solid rgba(0,0,0,0.06)" }}>
            <p className="font-display text-2xl mb-4" style={{ color: "#2b2b2b" }}>
              {u("profileChecked", lang, completedCount, tasks.length)}
            </p>
            <div className="mb-5">
              <div className="flex justify-between mb-1.5">
                <span className="text-xs font-medium" style={{ color: "#aaa" }}>{UI.profileProgress[lang]}</span>
                <span className="text-xs font-medium" style={{ color: "#888" }}>{u("progressOf", lang, completedCount, tasks.length)}</span>
              </div>
              <div className="h-2.5 overflow-hidden" style={{ borderRadius: 6, background: "rgba(0,0,0,0.07)" }}>
                <div className="h-full transition-all duration-700" style={{ width: `${(completedCount / tasks.length) * 100}%`, borderRadius: 6, background: "#990000" }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { labelKey: "profileCompleted" as keyof typeof UI, value: completedCount,              bg: "#990000",  text: "white" },
                { labelKey: "profileRemaining" as keyof typeof UI, value: tasks.length - completedCount, bg: "#FFCC00", text: "#2b2b2b" },
                { labelKey: "profileTotal"     as keyof typeof UI, value: tasks.length,               bg: "rgba(0,0,0,0.04)", text: "#2b2b2b" },
              ].map(s => (
                <div key={s.labelKey} className="p-3 text-center" style={{ borderRadius: 12, background: s.bg }}>
                  <p className="font-display text-2xl leading-none mb-1" style={{ color: s.text }}>{s.value}</p>
                  <p className="text-[10px] font-medium" style={{ color: s.text === "white" ? "rgba(255,255,255,0.75)" : "#888" }}>
                    {(UI[s.labelKey] as Record<Lang, string>)[lang]}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <h3 className="font-display text-xl mb-4" style={{ color: "#2b2b2b" }}>{UI.allTasksHeading[lang]}</h3>
          <div className="overflow-hidden" style={{ borderRadius: 14, background: "var(--cream)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)" }}>
            {tasks.map((task, i) => (
              <div key={task.id} className="flex items-center gap-3 px-4 py-3" style={{ background: task.completed ? "rgba(153,0,0,0.03)" : "transparent", borderBottom: i < tasks.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                <div className="w-5 h-5 flex items-center justify-center shrink-0 transition-all duration-200" style={{ borderRadius: 6, background: task.completed ? "#990000" : "rgba(0,0,0,0.06)" }}>
                  {task.completed && <span className="text-white text-[10px] font-bold">✓</span>}
                </div>
                <span className="text-sm flex-1" style={{ color: task.completed ? "#aaa" : "#2b2b2b", textDecoration: task.completed ? "line-through" : "none" }}>
                  {lang === "en" ? task.titleEn : task.title}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="py-6 text-center mt-4" style={{ borderTop: "1px solid rgba(0,0,0,0.06)", background: "var(--cream)" }}>
        <p className="text-[11px] font-medium tracking-widest" style={{ color: "#ccc" }}>
          {UI.footerText[lang]}
        </p>
      </footer>
    </div>
  );
}

export default function TrojanQuestPage() {
  return (
    <ProductShell group="community" page="trojan-quest">
      {(ctx) => <TrojanQuestContent language={ctx.language} />}
    </ProductShell>
  );
}
