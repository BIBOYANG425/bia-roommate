"use client";

import {
  useState,
  useMemo,
  Suspense,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import ProductShell, { type ProductLanguage } from "@/components/ProductShell";

// ─── Types ────────────────────────────────────────────────────────────────────

type Neighborhood = "South Park" | "DTLA" | "Koreatown";

interface RoomType {
  name: string;
  nameZh: string;
  priceFrom: number;
  priceTo: number | null;
  sqft: number | null;
}

interface RedditSeed {
  username: string;
  score: number;
  subreddit: string;
  body: string;
}

interface ApartmentComment {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
}

interface Apartment {
  id: string;
  name: string;
  address: string;
  neighborhood: Neighborhood;
  distanceFromUSC: number;
  priceFrom: number;
  priceTo: number;
  parkingNote: string | null;
  utilityNote: string | null;
  notes: string[];
  amenities: string[];
  roomTypes: RoomType[];
  photoUrl: string | null;
  gradient: string;
  accentColor: string;
  bookingUrl: string;
  descriptionZh: string;
  tags: string[];
  taglineZh: string;
  redditSeeds: RedditSeed[];
  buildYear: number | null;
  shuttleMinutes: number | null;  // walking minutes to nearest USC shuttle stop
}

// ─── Apartment Data (25 verified properties) ─────────────────────────────────

const APARTMENTS: Apartment[] = [
  // ══ South Park ══════════════════════════════════════════════════════════════
  {
    id: "circa-la",
    name: "Circa",
    address: "1200 S Figueroa St, Los Angeles, CA 90015",
    neighborhood: "South Park",
    distanceFromUSC: 0.5,
    priceFrom: 4282,
    priceTo: 6000,
    parkingNote: null,
    utilityNote: null,
    notes: ["对面LA Live", "屋顶2英亩公园", "DTLA最大泳池之一"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "阳台", "洗衣机", "烘干机"],
    roomTypes: [
      { name: "2 Bed / 2 Bath", nameZh: "两室两卫", priceFrom: 4282, priceTo: 6000, sqft: 1100 },
    ],
    photoUrl: "/apartments/circa.png",
    gradient: "linear-gradient(150deg, #0d0906 0%, #2a1c08 40%, #503510 65%, #8c5a18 100%)",
    accentColor: "#c8922a",
    bookingUrl: "https://circala.com",
    descriptionZh: "South Park区域核心地标，35层豪华高层，正对LA Live，距Crypto.com Arena仅咫尺之遥。两英亩屋顶公园和DTLA最大泳池之一，落地玻璃窗9\'6\"层高，Bosch/Miele高端电器，Nest智能温控，私人阳台。由Greystar管理，维护响应快。",
    tags: ["对面LA Live", "屋顶大公园", "高端精装", "Greystar"],
    taglineZh: "South Park地标，对面LA Live",
    redditSeeds: [
      { username: "dtla_luxury_renter", score: 1243, subreddit: "LosAngeles", body: "Circa is genuinely one of the nicest buildings in DTLA. The 2-acre rooftop is insane — pool, cabanas, fire pits. If you split a 2BR with a roommate it becomes more reasonable (~$2k each). Greystar is a solid management company, maintenance gets handled fast." },
      { username: "usc_grad_25", score: 567, subreddit: "USC", body: "Great building but parking is pricey (extra) and elevators get slow during peak hours. The views from floors 20+ are unbeatable. One thing I love: the rooftop is actually not overcrowded since it's huge." },
      { username: "southpark_life", score: 389, subreddit: "LosAngeles", body: "Lived here 18 months. Pros: amenities maintained well, 24/7 concierge is actually helpful, massive package room. Cons: street noise on lower floors from Figueroa. Overall 9/10 for the price bracket." },
    ],
    buildYear: 2018,
    shuttleMinutes: 6,
  },
  {
    id: "onyx-dtla",
    name: "Onyx",
    address: "424 W Pico Blvd, Los Angeles, CA 90015",
    neighborhood: "South Park",
    distanceFromUSC: 0.5,
    priceFrom: 2650,
    priceTo: 3200,
    parkingNote: null,
    utilityNote: null,
    notes: ["6分钟步行至Crypto.com Arena", "盐水泳池", "2018年建"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "洗衣机", "烘干机"],
    roomTypes: [
      { name: "2 Bed / 2 Bath", nameZh: "两室两卫", priceFrom: 2650, priceTo: 3200, sqft: 950 },
    ],
    photoUrl: "/apartments/onyx.png",
    gradient: "linear-gradient(150deg, #060810 0%, #101828 40%, #1a2a40 65%, #990000 100%)",
    accentColor: "#990000",
    bookingUrl: "https://www.onyxdtla.com",
    descriptionZh: "South Park区域性价比出色，7层精品公寓，2018年建。盐水泳池+屋顶天台，全屋硬木地板，定制瓷砖背景墙，室内洗烘。距USC步行约12分钟，距Crypto.com Arena6分钟步行。",
    tags: ["性价比高", "近球场", "盐水泳池", "2018年建"],
    taglineZh: "South Park性价比精选",
    redditSeeds: [
      { username: "usc_ms_cs_24", score: 892, subreddit: "USC", body: "Onyx is one of the best value apartments in South Park. The saltwater pool is a huge plus — doesn't irritate your eyes. Management is responsive. The building is only 7 floors so it has a more boutique feel, no crazy elevator waits." },
      { username: "pico_blvd_renter", score: 445, subreddit: "LosAngeles", body: "Been here since 2023. The rooftop sky deck has an amazing DTLA view for sunsets. In-unit W/D is standard which is great. One note: street parking on Pico can be a pain for guests but the building garage is fine." },
      { username: "dtla_value_hunter", score: 278, subreddit: "LosAngeles", body: "For $2,650-3,200 for a 2BR in South Park this is genuinely hard to beat. The finishes are modern, gym is well-equipped. Not as flashy as Circa but much better price. 10 min walk to USC shuttle." },
    ],
    buildYear: 2018,
    shuttleMinutes: 10,
  },
  {
    id: "apex-holland",
    name: "Apex",
    address: "900 S Figueroa St, Los Angeles, CA 90015",
    neighborhood: "South Park",
    distanceFromUSC: 0.6,
    priceFrom: 3300,
    priceTo: 3800,
    parkingNote: null,
    utilityNote: null,
    notes: ["超过15年老楼但视野开阔", "同面积价格比周边便宜", "与Alina共用停车"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "阳台"],
    roomTypes: [
      { name: "2 Bed / 2 Bath", nameZh: "两室两卫", priceFrom: 3300, priceTo: 3800, sqft: 1166 },
      { name: "Penthouse 2BR", nameZh: "顶层豪华", priceFrom: 4600, priceTo: 5400, sqft: 1400 },
    ],
    photoUrl: "/apartments/apex.png",
    gradient: "linear-gradient(150deg, #0a0606 0%, #200a0a 40%, #3d1010 65%, #700000 100%)",
    accentColor: "#880000",
    bookingUrl: "https://www.hollandresidential.com/ca/los-angeles/apex-the-one",
    descriptionZh: "Holland Residential旗下South Park老牌地标，步行6分钟至USC校车站。楼龄超15年，设施地毯略旧，但绝大多数户型视野开阔采光好，同等面积和景观的价格比周边新楼便宜不少。与Alina姊妹楼共享停车场。",
    tags: ["老牌地标", "视野开阔", "性价比", "Holland管理"],
    taglineZh: "老牌地标，视野开阔价格优",
    redditSeeds: [
      { username: "south_park_vet", score: 734, subreddit: "USC", body: "Apex is 15+ years old so don't expect brand new finishes. BUT the views are legitimately amazing and the price per sqft is way better than newer buildings nearby. Management (Holland Residential) is professional and fixes things quickly." },
      { username: "usc_mba_renter", score: 521, subreddit: "USC", body: "Lived here 2 years. The carpet in common areas is old but units themselves are fine. High-floor units face east = beautiful sunrise and no direct afternoon sun heat. The shared parking with Alina is fine, never had issues finding a spot." },
      { username: "figueroa_dtla", score: 312, subreddit: "LosAngeles", body: "Apex has one of the best locations — literally steps from Staples/Crypto. For USC students the shuttle stop is like 6 min walk down Figueroa. The building community has a lot of grad students which makes it quieter/more chill than purely undergrad buildings." },
    ],
    buildYear: 2008,
    shuttleMinutes: 6,
  },
  {
    id: "eden-dtla",
    name: "The Eden",
    address: "1340 S Hill St, Los Angeles, CA 90015",
    neighborhood: "South Park",
    distanceFromUSC: 0.6,
    priceFrom: 3200,
    priceTo: 4105,
    parkingNote: null,
    utilityNote: null,
    notes: ["2025年新建", "双层健身中心", "宠物友好"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "洗衣机", "烘干机", "允许宠物"],
    roomTypes: [
      { name: "Studio", nameZh: "开放式", priceFrom: 1910, priceTo: 2400, sqft: 490 },
      { name: "2 Bed / 2 Bath", nameZh: "两室两卫", priceFrom: 3200, priceTo: 4105, sqft: 1000 },
    ],
    photoUrl: "/apartments/eden.png",
    gradient: "linear-gradient(150deg, #060e08 0%, #0e2014 40%, #183428 65%, #1a5c36 100%)",
    accentColor: "#1a7a46",
    bookingUrl: "https://edendtla.com",
    descriptionZh: "2025年全新建成，South Park区域最新精品公寓之一，Greystar管理。双层健身设施（室内+室外+瑜伽工作室），双泳池园林度假露台，天台火坑休息区，宠物公园和宠物水疗，步行6分钟至USC校区。",
    tags: ["2025新建", "双泳池", "宠物友好", "Greystar"],
    taglineZh: "2025全新落成，South Park精品",
    redditSeeds: [
      { username: "new_builds_dtla", score: 623, subreddit: "LosAngeles", body: "The Eden just opened in 2025 and everything is BRAND NEW. The two-story fitness center is genuinely impressive — indoor cardio, outdoor workout deck, yoga studio. Greystar manages it so you know what to expect: professional but by-the-book." },
      { username: "usc_phd_renter", score: 441, subreddit: "USC", body: "Got a studio here for my first year. Super clean, modern finishes throughout. The dual pool setup is great — one is more lap pool, one is more lounge pool. My only gripe: it being so new means some amenities were still being finished when I moved in." },
      { username: "south_park_dog_owner", score: 287, subreddit: "LosAngeles", body: "Eden is one of the few buildings here that actually takes pet-friendly seriously. The Bark Park is real — fenced, turf, toys. Pet spa too. Max 2 pets, $50/month pet rent which is reasonable for DTLA. Walk to USC takes about 12-13 minutes." },
    ],
    buildYear: 2025,
    shuttleMinutes: 8,
  },
  {
    id: "wren-dtla",
    name: "Wren",
    address: "1230 S Olive St, Los Angeles, CA 90015",
    neighborhood: "South Park",
    distanceFromUSC: 0.6,
    priceFrom: 2800,
    priceTo: 3800,
    parkingNote: null,
    utilityNote: null,
    notes: ["楼内有精酿酒吧First Draft", "19个EV充电站", "2017年建"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "洗衣机", "烘干机"],
    roomTypes: [
      { name: "2 Bed / 2 Bath", nameZh: "两室两卫", priceFrom: 2800, priceTo: 3800, sqft: 1050 },
    ],
    photoUrl: "https://livewren.com/assets/images/cache/WREN-LA-C-Kevin-C-Korcyk-10-b5c711e585dd981a1e3eff2196ec8307-7272d70969d2cee2160587e0962eefe2.jpg",
    gradient: "linear-gradient(150deg, #06080e 0%, #0e1426 40%, #161e38 65%, #1e2e60 100%)",
    accentColor: "#2a4a9c",
    bookingUrl: "https://livewren.com",
    descriptionZh: "South Park精品公寓，楼内入驻First Draft精酿啤酒馆，是居民独特福利。2,700 sqft超大健身中心，屋顶泳池和露台，19个EV充电站，双狗跑区，6个共享办公空间。石英石台面，燃气灶，叠式洗烘。2017年建。",
    tags: ["楼内精酿酒吧", "超大健身房", "EV充电", "2017年建"],
    taglineZh: "楼内精酿酒吧，South Park精品",
    redditSeeds: [
      { username: "craft_beer_usc", score: 892, subreddit: "USC", body: "Wren has an on-site craft beer taproom (First Draft) which sounds gimmicky but is actually a great social spot. The gym at 2,700 sqft is one of the biggest in any residential building I've seen. 6 co-working spaces too — clutch for WFH days." },
      { username: "olive_st_renter", score: 567, subreddit: "LosAngeles", body: "Been at Wren 2 years. Quality of life is really high here. Gas stoves (rare in newer DTLA buildings), quartz counters, in-unit W/D. Two dog runs with wash stations. The 19 EV chargers are first-come-first-served but I've always found one." },
      { username: "usc_law_2025", score: 334, subreddit: "USC", body: "For law students needing to work from home a lot: 6 co-working spaces in the building are always available. Library-quiet during weekdays. Building is well-managed, maybe a 10-15 min walk to USC depending where your classes are." },
    ],
    buildYear: 2017,
    shuttleMinutes: 10,
  },
  {
    id: "olive-dtla",
    name: "Olive DTLA",
    address: "1243 S Olive St, Los Angeles, CA 90015",
    neighborhood: "South Park",
    distanceFromUSC: 0.6,
    priceFrom: 2964,
    priceTo: 3739,
    parkingNote: null,
    utilityNote: null,
    notes: ["USC通勤专页", "2016年建", "屋顶泳池+狗狗公园"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "洗衣机", "烘干机", "允许宠物"],
    roomTypes: [
      { name: "2 Bed / 2 Bath", nameZh: "两室两卫", priceFrom: 2964, priceTo: 3739, sqft: 952 },
    ],
    photoUrl: "/apartments/olive.png",
    gradient: "linear-gradient(150deg, #060a06 0%, #101808 40%, #1e2c10 65%, #3a5018 100%)",
    accentColor: "#567a24",
    bookingUrl: "https://www.olivedtla.com",
    descriptionZh: "South Park区域USC留学生聚集地，官网专设USC通勤页面。2016年建，7层293套，不锈钢电器+石英石台面，室内洗烘，屋顶泳池+水疗+狗狗公园，现代健身中心和商务中心。",
    tags: ["USC留学生多", "屋顶狗公园", "商务中心", "2016年建"],
    taglineZh: "USC留学生聚集地，屋顶狗公园",
    redditSeeds: [
      { username: "usc_intl_student", score: 1102, subreddit: "USC", body: "Olive DTLA literally has a USC commuter page on their website which tells you everything. A LOT of USC international students live here so it's easy to find Chinese roommates through WeChat groups. Management is okay, average response time about 2 days." },
      { username: "south_park_2024", score: 645, subreddit: "LosAngeles", body: "The rooftop dog park is actually really nice — artificial turf, good fencing. Pool deck is well-maintained. Building is 7 floors so it's cozy. Units on higher floors facing south get great natural light. Worth every penny for the location." },
      { username: "dtla_budget_shopper", score: 398, subreddit: "LosAngeles", body: "For 2BR in South Park at sub-$3800, Olive DTLA is a strong contender. The finishes are decent (quartz, SS appliances). In-unit washer/dryer which is non-negotiable for me. Parking available but extra — budget accordingly." },
    ],
    buildYear: 2016,
    shuttleMinutes: 8,
  },
  {
    id: "1133-hope",
    name: "1133 Hope",
    address: "1133 S Hope St, Los Angeles, CA 90015",
    neighborhood: "South Park",
    distanceFromUSC: 0.7,
    priceFrom: 3400,
    priceTo: 4200,
    parkingNote: "停车另计 约 $200+/月",
    utilityNote: null,
    notes: ["无SSN可交两个月押金代替", "有中文物业", "4b4b约$7700/月", "离校车站4分钟"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "阳台", "洗衣机", "烘干机", "允许宠物"],
    roomTypes: [
      { name: "2 Bed / 2 Bath", nameZh: "两室两卫", priceFrom: 3400, priceTo: 4200, sqft: 900 },
      { name: "4 Bed / 4 Bath", nameZh: "四室四卫", priceFrom: 7700, priceTo: 7700, sqft: 1800 },
    ],
    photoUrl: "https://1133hopedtla.com/wp-content/uploads/2019/12/GS_1133_Hope_Ph_II_Two_Bed_Kitchen_I.jpg",
    gradient: "linear-gradient(150deg, #0d0806 0%, #2a0f0f 40%, #590000 70%, #990000 100%)",
    accentColor: "#990000",
    bookingUrl: "https://1133hopedtla.com",
    descriptionZh: "留学生口碑极佳，有中文物业，无SSN可交两个月押金代替，大大降低入住门槛。离USC校车站步行仅4分钟，高层阳光充足，整体评价好。4b4b户型约$7700，分摊后约$1925/人，超高性价比。Tripalink管理。",
    tags: ["无需SSN", "中文物业", "近校车站", "Tripalink"],
    taglineZh: "无需SSN，中文物业，留学生首选",
    redditSeeds: [
      { username: "throwaway_la_apt", score: 847, subreddit: "USC", body: "Lived here for my first year. Tripalink management is pretty responsive and has Chinese-speaking staff which is huge for international students. The no-SSN policy (2 months deposit instead) is a lifesaver when you first arrive." },
      { username: "1133hope_resident", score: 534, subreddit: "USC", body: "The 4BR split is the best deal in DTLA — comes out to ~$1,900/person which is insane for South Park. Building is high quality, amenities always clean. Parking is $200+/month extra though so factor that in." },
      { username: "usc_shuttle_user", score: 312, subreddit: "USC", body: "4 min walk to the USC shuttle stop is the #1 selling point for me. High floors have great views and good natural light. Area around the building can feel sketchy after 10pm but building security is solid." },
    ],
    buildYear: 2019,
    shuttleMinutes: 4,
  },
  {
    id: "south-park-windsor",
    name: "South Park by Windsor",
    address: "939 S Hill St, Los Angeles, CA 90015",
    neighborhood: "South Park",
    distanceFromUSC: 0.7,
    priceFrom: 2900,
    priceTo: 3300,
    parkingNote: null,
    utilityNote: null,
    notes: ["无需SSN", "官网可视频看房", "低楼层", "离校车站8分钟"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "阳台", "洗衣机", "烘干机"],
    roomTypes: [
      { name: "2 Bed / 2 Bath", nameZh: "两室两卫", priceFrom: 2900, priceTo: 3300, sqft: 900 },
    ],
    photoUrl: "https://d1uty3jitgnf7i.cloudfront.net/wp-content/uploads/2022/01/1OurCommunity_P1_SouthPark.jpg",
    gradient: "linear-gradient(150deg, #060a08 0%, #0e1c12 40%, #183020 65%, #225028 100%)",
    accentColor: "#287840",
    bookingUrl: "https://www.southparkbywindsor.com",
    descriptionZh: "Windsor Communities旗下，South Park区域热门选择。无需SSN，官网直接视频看房，入住门槛低。花岗岩台面+不锈钢电器，步入式衣橱，度假式泳池+电影放映室+屋顶露台，EV充电站。离校车站步行8分钟，低楼层采光一般但价格实惠。连续5年Grace Hill管理奖第一名。",
    tags: ["无需SSN", "视频看房", "EV充电", "Windsor管理"],
    taglineZh: "无需SSN，视频看房，轻松入住",
    redditSeeds: [
      { username: "windsor_dtla_fan", score: 789, subreddit: "USC", body: "South Park by Windsor is great for international students — no SSN required and you can do a video tour before you even arrive in LA. Windsor management is consistently rated one of the best, super responsive and professional." },
      { username: "usc_fall_2024", score: 467, subreddit: "USC", body: "The movie screening room is actually a great amenity that doesn't get mentioned enough — me and my roommates use it for movie nights. Rooftop terrace city view is gorgeous at night. Lower floors don't get as much sun FYI." },
      { username: "hill_st_renter", score: 298, subreddit: "LosAngeles", body: "For $2,900-3,300 for a 2BR this is solid value in South Park. 8 min walk to USC shuttle. The EV charging stations are free for residents which is increasingly rare. Only downside: it's not a high-rise so views are limited." },
    ],
    buildYear: 2015,
    shuttleMinutes: 8,
  },
  {
    id: "the-met",
    name: "The Met",
    address: "950 S Flower St, Los Angeles, CA 90015",
    neighborhood: "South Park",
    distanceFromUSC: 0.8,
    priceFrom: 3107,
    priceTo: 4500,
    parkingNote: null,
    utilityNote: null,
    notes: ["一街之隔LA Live", "设计+缝纫工作室", "Brookfield管理"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "阳台", "洗衣机", "烘干机"],
    roomTypes: [
      { name: "2 Bed / 2 Bath", nameZh: "两室两卫", priceFrom: 3107, priceTo: 4500, sqft: 1000 },
    ],
    photoUrl: "https://rent.brookfieldproperties.com/wp-content/uploads/2024/05/shoootin-photo-6_Web.jpg",
    gradient: "linear-gradient(150deg, #080810 0%, #141424 40%, #20203c 65%, #2a2a5a 100%)",
    accentColor: "#3a3aaa",
    bookingUrl: "https://rent.brookfieldproperties.com/property/the-met/",
    descriptionZh: "Brookfield Properties旗下，一街之隔LA Live和Staples中心。双热水浴缸泳池区，居民休息室+共享办公区，设计与缝纫工作室（少见），围栏狗跑区，硬木风格地板+私人阳台。",
    tags: ["Brookfield管理", "近LA Live", "设计工作室", "双热水浴缸"],
    taglineZh: "一街之隔LA Live，Brookfield精品",
    redditSeeds: [
      { username: "brookfield_renter", score: 623, subreddit: "LosAngeles", body: "The Met is a solid Brookfield property — management is professional and predictable. The double hot tub pool area is a great feature. I use the co-working space daily since WFH. The design studio is quirky but some residents actually love it for creative projects." },
      { username: "la_live_neighbor", score: 445, subreddit: "LosAngeles", body: "Location is unbeatable for concert/event goers — LA Live is literally one block. On event nights parking in the area is chaos but building garage is fine. The hardwood floors and private balconies make units feel genuinely upscale." },
      { username: "usc_events_fan", score: 267, subreddit: "USC", body: "Great choice if you go to USC games at the Coliseum — easy Lyft/walk from here. Building community skews working professionals, which is nice for a quieter environment compared to more student-heavy buildings." },
    ],
    buildYear: 2016,
    shuttleMinutes: 10,
  },
  {
    id: "aven-dtla",
    name: "Aven",
    address: "1120 S Grand Ave, Los Angeles, CA 90015",
    neighborhood: "South Park",
    distanceFromUSC: 0.8,
    priceFrom: 3900,
    priceTo: 4200,
    parkingNote: "停车 $150/月",
    utilityNote: "水电约 $200/月",
    notes: ["需要SSN", "审核周期较长", "价格浮动大", "公共设施很好"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "阳台", "洗衣机", "烘干机", "允许宠物"],
    roomTypes: [
      { name: "2 Bed / 2 Bath", nameZh: "两室两卫", priceFrom: 3900, priceTo: 4200, sqft: 1000 },
    ],
    photoUrl: "/apartments/aven.png",
    gradient: "linear-gradient(150deg, #060810 0%, #0e1428 40%, #142040 65%, #1a3060 100%)",
    accentColor: "#1a5aaa",
    bookingUrl: "https://avendtla.com",
    descriptionZh: "South Park高品质公寓，9'4\"挑高，落地窗，工程木地板，Whirlpool燃气灶+Bosch洗碗机，盐水泳池，宠物屋顶公园，24/7前台礼宾，沙滩排球场。停车$150/月，水电约$200/月额外。需要SSN，审核周期较慢，价格随市场波动大，手速要快。",
    tags: ["需要SSN", "盐水泳池", "24/7礼宾", "沙滩排球"],
    taglineZh: "高天花板落地窗，South Park精品",
    redditSeeds: [
      { username: "aven_resident_2024", score: 934, subreddit: "USC", body: "Aven is beautiful but be warned: you need SSN and their approval process is SLOW (took me 3 weeks). The saltwater pool is amazing, beach volleyball is legit fun. Utilities run about $200/month extra, parking is $150/month on top of rent." },
      { username: "grand_ave_life", score: 612, subreddit: "LosAngeles", body: "The 9'4\" ceilings and floor-to-ceiling windows make even smaller units feel spacious. Gas stoves (not electric) are a big deal for anyone who actually cooks. The wooftop pet park is genuinely impressive. Management is professional but strict." },
      { username: "dtla_price_watcher", score: 389, subreddit: "LosAngeles", body: "Heads up — Aven prices fluctuate a LOT. I've seen the same 2BR listed from $3,700 to $4,500 at different times. If you see a good price, jump on it fast. No concessions usually. The 24/7 concierge really does feel like a hotel which is either great or unnecessary depending on your vibe." },
    ],
    buildYear: 2020,
    shuttleMinutes: 10,
  },
  {
    id: "alina-holland",
    name: "Alina",
    address: "700 W 9th St, Los Angeles, CA 90015",
    neighborhood: "South Park",
    distanceFromUSC: 0.9,
    priceFrom: 3600,
    priceTo: 3800,
    parkingNote: "与Apex共用停车场",
    utilityNote: null,
    notes: ["车库和Apex公用", "维修响应很快", "步行评分99分", "公共设施不错"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "阳台", "洗衣机", "烘干机"],
    roomTypes: [
      { name: "2 Bed / 2 Bath", nameZh: "两室两卫", priceFrom: 3600, priceTo: 3800, sqft: 1100 },
    ],
    photoUrl: "/apartments/alina.png",
    gradient: "linear-gradient(150deg, #0e0608 0%, #240c12 40%, #420c18 65%, #6e1020 100%)",
    accentColor: "#9a1428",
    bookingUrl: "https://www.hollandresidential.com/ca/los-angeles/alina",
    descriptionZh: "Holland Residential旗下，与Apex为姊妹楼共用停车场。步行评分99分，极佳可步行性。维修响应速度快是最大亮点。屋顶泳池+休息室，室内洗烘，部分户型阳台。3D Matterport虚拟看房可提前预览。",
    tags: ["维修响应快", "步行99分", "Holland管理", "虚拟看房"],
    taglineZh: "维修超快，步行评分99，Holland精品",
    redditSeeds: [
      { username: "alina_happy_resident", score: 756, subreddit: "LosAngeles", body: "The fastest maintenance response I've ever experienced — submitted a request at 9pm for a leaky faucet, fixed by 11am next morning. Holland Residential really has their act together. Walk score 99 means you can genuinely live without a car here." },
      { username: "apex_alina_neighbor", score: 489, subreddit: "LosAngeles", body: "Shared parking with Apex sounds bad but in practice it's fine, always spots available. The rooftop lounge/pool is nice. Units are well-designed with good natural light. Price is fair for Holland quality. My one complaint: management office can be slow to answer calls." },
      { username: "9th_st_usc", score: 301, subreddit: "USC", body: "About 0.9 miles to USC main entrance, 12-15 min walk. The 3D Matterport virtual tours on their website are actually really accurate — what you see is what you get. Great choice for students who want walkable neighborhood with coffee shops and restaurants nearby." },
    ],
    buildYear: 2010,
    shuttleMinutes: 12,
  },

  // ══ DTLA ════════════════════════════════════════════════════════════════════
  {
    id: "888-grand-hope",
    name: "888 Grand Hope Park",
    address: "888 S Hope St, Los Angeles, CA 90017",
    neighborhood: "DTLA",
    distanceFromUSC: 1.0,
    priceFrom: 3900,
    priceTo: 4000,
    parkingNote: null,
    utilityNote: null,
    notes: ["2个月免租", "离校车站有点远", "34层豪华高层"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "阳台", "洗衣机", "烘干机", "允许宠物"],
    roomTypes: [
      { name: "2 Bed / 2 Bath", nameZh: "两室两卫", priceFrom: 3900, priceTo: 4000, sqft: 1050 },
      { name: "Penthouse 2BR", nameZh: "顶层豪华", priceFrom: 6619, priceTo: null, sqft: 1400 },
    ],
    photoUrl: "/apartments/888-grand-hope.png",
    gradient: "linear-gradient(150deg, #080606 0%, #1a1008 40%, #302010 65%, #4a3218 100%)",
    accentColor: "#b87c24",
    bookingUrl: "https://www.888hope.com",
    descriptionZh: "Arrive Luxury Communities旗下，34层525套豪华高层，落地窗城市景观，2个月免租优惠。步行至USC约20分钟，离校车站稍远是主要不便之处。顶层公寓选项，高端内饰，健身中心，泳池，宠物友好。",
    tags: ["2个月免租", "Arrive豪华品牌", "34层高楼", "宠物友好"],
    taglineZh: "34层豪华高楼，2个月免租",
    redditSeeds: [
      { username: "arrive_luxury_fan", score: 567, subreddit: "LosAngeles", body: "888 Grand Hope is legitimately luxurious — the building quality is top-tier. Current 2-months-free concession makes it much more affordable than it looks on paper. Arrive brand buildings tend to have very attentive management." },
      { username: "usc_distance_checker", score: 389, subreddit: "USC", body: "The main downside for USC students: it's about 1 mile from campus and the shuttle stop isn't super convenient from here. Factor in ~20 min walk or a bike. If you have a car or don't mind the commute, the building itself is excellent." },
      { username: "hope_st_high_rise", score: 234, subreddit: "LosAngeles", body: "Floor-to-ceiling windows at floor 25+ are absolutely stunning at night. The penthouse units are wild but obviously pricey. Standard 2BR with the 2-month concession is actually competitive vs nearby buildings. Pet-friendly which is a plus." },
    ],
    buildYear: 2022,
    shuttleMinutes: 18,
  },
  {
    id: "beaudry-dtla",
    name: "Beaudry",
    address: "960 W 7th St, Los Angeles, CA 90017",
    neighborhood: "DTLA",
    distanceFromUSC: 1.1,
    priceFrom: 3107,
    priceTo: 6128,
    parkingNote: null,
    utilityNote: null,
    notes: ["DTLA最高住宅楼600+英尺", "3个月免租", "高尔夫模拟器", "芭蕾舞练习室"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "阳台", "洗衣机", "烘干机"],
    roomTypes: [
      { name: "2 Bed / 2 Bath", nameZh: "两室两卫", priceFrom: 3107, priceTo: 6128, sqft: 1100 },
    ],
    photoUrl: "https://rent.brookfieldproperties.com/wp-content/uploads/2024/05/14_BEAUDRY_Web.jpg",
    gradient: "linear-gradient(150deg, #060808 0%, #0e1414 40%, #182028 65%, #243040 100%)",
    accentColor: "#3a6080",
    bookingUrl: "https://rent.brookfieldproperties.com/property/beaudry/",
    descriptionZh: "DTLA最高住宅楼（600+英尺），Brookfield管理。第3层室外泳池+多层设施甲板，屋顶BBQ，高尔夫模拟器，芭蕾舞练习室，游戏室，宠物水疗。当前部分户型享3个月免租优惠。",
    tags: ["DTLA最高楼", "3个月免租", "高尔夫模拟", "Brookfield"],
    taglineZh: "DTLA制高点，600英尺无遮挡全景",
    redditSeeds: [
      { username: "tallest_building_fan", score: 823, subreddit: "LosAngeles", body: "Living in DTLA's tallest residential tower is a genuine vibe. Views from floor 40+ are unreal — you can see the ocean on clear days. Brookfield management is excellent. The golf simulator gets surprisingly heavy use by residents." },
      { username: "beaudry_2024", score: 534, subreddit: "LosAngeles", body: "The 3-month free rent special makes this way more accessible than the headline rent suggests. Ballet studio is an unusual amenity that actually gets used by a small but dedicated group. Pool deck on level 3 is massive and well-maintained." },
      { username: "dtla_high_rise_life", score: 367, subreddit: "LosAngeles", body: "The pet spa at Beaudry is the best I've seen in DTLA. 785 units means it's a big building so amenities are well-distributed. Commute to USC is ~15-20 min by Lyft or you can bike down Figueroa." },
    ],
    buildYear: 2020,
    shuttleMinutes: 15,
  },
  {
    id: "axis-dtla",
    name: "Axis",
    address: "630 W 6th St, Los Angeles, CA 90017",
    neighborhood: "DTLA",
    distanceFromUSC: 1.2,
    priceFrom: 3300,
    priceTo: 3900,
    parkingNote: "停车 $125/月（DTLA中较便宜）",
    utilityNote: "水电约 $50/月，WiFi需自行开通 $50/月",
    notes: ["South Park区域比较安全", "11楼有泳池健身房", "12楼city view户型", "性价比 户型方正"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "洗衣机", "烘干机", "允许宠物"],
    roomTypes: [
      { name: "2 Bed / 2 Bath", nameZh: "两室两卫", priceFrom: 3300, priceTo: 3900, sqft: 1000 },
    ],
    photoUrl: "https://www.liveataxis.com/images/new-gallery/01-apart-v1.webp",
    gradient: "linear-gradient(150deg, #080808 0%, #141414 40%, #222222 65%, #333333 100%)",
    accentColor: "#666666",
    bookingUrl: "https://www.liveataxis.com",
    descriptionZh: "South Park区域性价比代表，停车费在DTLA中属于便宜的（$125/月）。11楼设泳池和健身房，12楼city view户型多，户型方正实用。水电约$50/月，WiFi需自行开通约$50/月。步行至USC校车站约15分钟。",
    tags: ["停车$125低价", "city view户型", "性价比", "户型方正"],
    taglineZh: "South Park性价比，停车$125业内最低",
    redditSeeds: [
      { username: "axis_value_renter", score: 756, subreddit: "USC", body: "Axis has the cheapest parking in South Park DTLA at $125/month. That alone saves you $50-100/month vs neighboring buildings. Utilities are separate (~$50 water/electric + $50 internet) but still reasonable. The 11th floor pool/gym is clean and not overcrowded." },
      { username: "6th_st_resident", score: 523, subreddit: "LosAngeles", body: "12th floor units with city views are the sweet spot here — not the very top floors (pricier) but still great views. Units are well-proportioned, none of that weird narrow layout you see in some DTLA buildings. 15 min walk to USC shuttle area." },
      { username: "dtla_budget_king", score: 341, subreddit: "USC", body: "For USC students watching their budget: Axis $3300-3900/2BR + $125 parking + $100 utilities = still more affordable than flashier neighbors. The building is safe, in South Park which is the better part of DTLA. Management could be more responsive but nothing terrible." },
    ],
    buildYear: 2014,
    shuttleMinutes: 15,
  },
  {
    id: "thea-dtla",
    name: "Thea",
    address: "1000 W 8th St, Los Angeles, CA 90017",
    neighborhood: "DTLA",
    distanceFromUSC: 1.2,
    priceFrom: 3500,
    priceTo: 5000,
    parkingNote: null,
    utilityNote: null,
    notes: ["56层DTLA最高楼之一", "最多12周免租", "DTLA最大泳池", "1.5英亩室外空间"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "阳台", "洗衣机", "烘干机", "允许宠物"],
    roomTypes: [
      { name: "2 Bed / 2 Bath", nameZh: "两室两卫", priceFrom: 3500, priceTo: 5000, sqft: 1100 },
      { name: "4 Bed Penthouse", nameZh: "顶层四卧", priceFrom: 10000, priceTo: null, sqft: 2000 },
    ],
    photoUrl: "https://theadtla.com/wp-content/uploads/2020/04/Thea-at-Metropolis-2-Bedroom-2512-Living-Night-View-1024x683.jpg",
    gradient: "linear-gradient(150deg, #080614 0%, #141028 40%, #201840 65%, #2c2060 100%)",
    accentColor: "#5a3ab0",
    bookingUrl: "https://theadtla.com",
    descriptionZh: "Thea at Metropolis，56层DTLA最高住宅楼之一，Greystar管理。1.5英亩室外空间，Downtown最大泳池，私人天空休息室，当前最多12周免租+$1000 Look & Lease奖金，超值。工作室至四卧室及顶层公寓均可选。",
    tags: ["56层高楼", "12周免租", "DTLA最大泳池", "Greystar"],
    taglineZh: "56层DTLA制高点，最多12周免租",
    redditSeeds: [
      { username: "thea_metropolis_fan", score: 892, subreddit: "LosAngeles", body: "Thea's pool is genuinely the biggest I've seen at any residential building in DTLA. 56 floors means amazing views from anything above floor 30. The 12 weeks free concession currently running makes it one of the best value luxury options in DTLA right now." },
      { username: "usc_luxury_student", score: 623, subreddit: "USC", body: "The sky lounge is a private amenity that feels like a hotel rooftop bar but exclusively for residents. Great for hosting friends. ~15 min Lyft to USC or 20 min by bike along Figueroa. Worth the slightly longer commute for the building quality." },
      { username: "metropolis_resident", score: 445, subreddit: "LosAngeles", body: "Part of the Metropolis development so the whole complex feels like a planned community. Greystar is reliable — maintenance gets done within 24-48 hours. The private sky lounge requires reservation but is always available. 4BR penthouse is obscenely nice." },
    ],
    buildYear: 2019,
    shuttleMinutes: 15,
  },
  {
    id: "sentral-dtla",
    name: "Sentral DTLA",
    address: "755 S Spring St, Los Angeles, CA 90014",
    neighborhood: "DTLA",
    distanceFromUSC: 1.3,
    priceFrom: 2976,
    priceTo: 5000,
    parkingNote: null,
    utilityNote: null,
    notes: ["灵活租期（31天起）", "可短期入住", "全配家具可选", "共享办公"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "洗衣机", "烘干机", "WiFi", "家具齐全"],
    roomTypes: [
      { name: "2 Bed / 2 Bath Flex", nameZh: "灵活两室", priceFrom: 2976, priceTo: 5000, sqft: 1000 },
    ],
    photoUrl: "/apartments/sentral.png",
    gradient: "linear-gradient(150deg, #060c0a 0%, #0e1c16 40%, #162e24 65%, #1e4032 100%)",
    accentColor: "#1e7054",
    bookingUrl: "https://sentral.com/los-angeles/dtla",
    descriptionZh: "Sentral专为灵活生活方式设计，31天起灵活租期，全配家具选项，共享办公空间，游戏室，EV充电站，度假式泳池。适合短期实习或需要灵活入住时间的学生，也可长租。Spring Arts区历史感街区。",
    tags: ["31天起灵活租", "全配家具", "共享办公", "短期可入住"],
    taglineZh: "灵活租期31天起，全配家具拎包入住",
    redditSeeds: [
      { username: "flexible_renter_la", score: 678, subreddit: "LosAngeles", body: "Sentral is perfect if you need flexibility — I did a 3-month furnished stay during an internship. Move-in/out is super easy, everything is already there. The co-working space is well-equipped. Price is higher than standard apartments but includes furniture/WiFi." },
      { username: "usc_summer_intern", score: 489, subreddit: "USC", body: "Did USC summer internship and couldn't find regular 2-month leases anywhere. Sentral's 31-day minimum was a lifesaver. Pool is resort quality, gym is modern. Spring Street area has good coffee shops nearby." },
      { username: "spring_arts_life", score: 312, subreddit: "LosAngeles", body: "Spring Street has a cool artistic vibe with galleries and restaurants nearby. Sentral fits the neighborhood aesthetic. Not the closest to USC (1.3 miles) but the flexibility is unmatched. EV chargers are a nice touch." },
    ],
    buildYear: 2019,
    shuttleMinutes: 20,
  },
  {
    id: "trademark-dtla",
    name: "Trademark",
    address: "437 S Hill St, Los Angeles, CA 90013",
    neighborhood: "DTLA",
    distanceFromUSC: 1.3,
    priceFrom: 3000,
    priceTo: 4224,
    parkingNote: null,
    utilityNote: null,
    notes: ["Hill Street精品地标", "无边际泳池", "近Little Tokyo"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "洗衣机", "烘干机"],
    roomTypes: [
      { name: "2 Bed / 2 Bath", nameZh: "两室两卫", priceFrom: 3000, priceTo: 4224, sqft: 1000 },
    ],
    photoUrl: "/apartments/trademark.png",
    gradient: "linear-gradient(150deg, #08060e 0%, #140c20 40%, #201434 65%, #2c1a48 100%)",
    accentColor: "#7a3ab0",
    bookingUrl: "https://www.trademarkdtla.com",
    descriptionZh: "Hill Street精品地标，无边际泳池，屋顶露台，步行可达Little Tokyo、Arts District和Civic Center。工作室至三居室，时尚高设计感内饰，距USC约1.3英里，Metro DTLA区位优越。",
    tags: ["无边际泳池", "近Little Tokyo", "高设计感", "多户型选择"],
    taglineZh: "Hill Street精品，无边际泳池",
    redditSeeds: [
      { username: "trademark_aesthetics", score: 534, subreddit: "LosAngeles", body: "Trademark has the best interior design aesthetic of any building in this price range in DTLA. The infinity pool on the roof is genuinely beautiful — not just a rectangle of water. Walking to Little Tokyo for ramen takes 5 minutes which is amazing." },
      { username: "hill_st_resident", score: 378, subreddit: "LosAngeles", body: "Living here for 2 years. The rooftop deck sunset views are stunning. Building is well-maintained. Little Tokyo, the Arts District, and Civic Center are all walkable which keeps your social life interesting. 1.3 miles to USC is manageable with a bike." },
      { username: "dtla_design_lover", score: 245, subreddit: "LosAngeles", body: "The design sensibility here is consistently elevated — lobby, hallways, amenity spaces all look great. Management is average but not terrible. At $3k-4.2k for a 2BR you're paying a design premium, but for some people that matters a lot." },
    ],
    buildYear: 2018,
    shuttleMinutes: 20,
  },
  {
    id: "metro-417",
    name: "Metro 417",
    address: "417 S Hill St, Los Angeles, CA 90013",
    neighborhood: "DTLA",
    distanceFromUSC: 1.4,
    priceFrom: 2655,
    priceTo: 3578,
    parkingNote: null,
    utilityNote: null,
    notes: ["1925年历史建筑改建", "意大利大理石大堂", "Brookfield管理"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "洗衣机", "烘干机", "允许宠物"],
    roomTypes: [
      { name: "2 Bed / 2 Bath", nameZh: "两室两卫", priceFrom: 2655, priceTo: 3578, sqft: 950 },
    ],
    photoUrl: "https://rent.brookfieldproperties.com/wp-content/uploads/2024/05/metro417_amenities_hallway.jpg",
    gradient: "linear-gradient(150deg, #0a0808 0%, #1e1410 40%, #3a2818 65%, #5a4020 100%)",
    accentColor: "#8a6030",
    bookingUrl: "https://rent.brookfieldproperties.com/property/metro-417/",
    descriptionZh: "1925年历史建筑地铁终点站改建，意大利大理石地板、格子天花板、马赛克瓷砖大堂，保留历史风貌。花岗岩+不锈钢+硬木地板，BBQ露台、商务休息室、健身中心、泳池。Brookfield管理。DTLA最独特住宅之一。",
    tags: ["1925历史建筑", "意大利大理石", "Brookfield", "最独特设计"],
    taglineZh: "1925年地铁站改建，独一无二历史建筑",
    redditSeeds: [
      { username: "history_buff_renter", score: 923, subreddit: "LosAngeles", body: "Metro 417 is the most unique building I've ever lived in. Italian marble floors, coffered ceilings, mosaic tile lobby — this was an actual 1925 subway terminal. Brookfield did a remarkable restoration. You feel like you're living in a piece of LA history." },
      { username: "brooklyn_transplant_la", score: 634, subreddit: "LosAngeles", body: "Coming from NYC I needed a building with character. Metro 417 delivers. The pre-war architectural details are incredible. Modern amenities (gym, pool, BBQ) coexist with 100-year-old design elements. Price is also one of the more reasonable for the quality." },
      { username: "dtla_architecture_nerd", score: 445, subreddit: "LosAngeles", body: "The high ceilings (original from the 1925 construction) make every unit feel palatial. It's ~1.4 miles to USC which is a 25-min walk or quick Lyft. Hill Street location means you're near lots of restaurants and the Historic Core's nightlife." },
    ],
    buildYear: 1925,
    shuttleMinutes: 25,
  },
  {
    id: "emerson-dtla",
    name: "The Emerson",
    address: "225 S Grand Ave, Los Angeles, CA 90012",
    neighborhood: "DTLA",
    distanceFromUSC: 1.5,
    priceFrom: 3500,
    priceTo: 3600,
    parkingNote: null,
    utilityNote: null,
    notes: ["2个月免租", "LEED金级认证", "毗邻The Broad、迪士尼音乐厅"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "阳台", "洗衣机", "烘干机", "允许宠物"],
    roomTypes: [
      { name: "2 Bed / 2 Bath", nameZh: "两室两卫", priceFrom: 3500, priceTo: 3600, sqft: 1000 },
    ],
    photoUrl: "/apartments/emerson.png",
    gradient: "linear-gradient(150deg, #060a08 0%, #0e1c12 40%, #183220 65%, #244830 100%)",
    accentColor: "#2a6840",
    bookingUrl: "https://www.relatedrentals.com/apartment-rentals/los-angeles/downtown/the-emerson",
    descriptionZh: "LEED金级环保认证，Arquitectonica设计+Marmol Radziner内饰，Caesarstone台面+胡桃木橱柜+大理石浴室。24小时礼宾大堂，屋顶娱乐区和BBQ，瑜伽工作室，宠物水疗。毗邻The Broad博物馆和迪士尼音乐厅。2个月免租。",
    tags: ["LEED金级", "2个月免租", "近迪士尼音乐厅", "大理石浴室"],
    taglineZh: "LEED金级精装，毗邻文化地标",
    redditSeeds: [
      { username: "arts_district_usc", score: 712, subreddit: "USC", body: "The Emerson's interior design quality is elite — Caesarstone counters, walnut cabinets, marble baths. LEED gold certification means really good air quality and lower utility bills. 2 months free concession makes the headline rent very palatable." },
      { username: "bunker_hill_life", score: 498, subreddit: "LosAngeles", body: "Location by The Broad and Disney Concert Hall is incredible for culture lovers — free museum nights, world-class music. The 24-hour concierge actually knows residents by name. It's 1.5 miles to USC but the Bunker Hill area is a nicer neighborhood." },
      { username: "related_rentals_fan", score: 334, subreddit: "LosAngeles", body: "Related Rentals is one of the better property management companies in DTLA. Maintenance is professional and prompt. The yoga studio gets busy but that means it's actually used. Pet spa is well-equipped. Only downside: 1.5 miles from USC is on the far end." },
    ],
    buildYear: 2013,
    shuttleMinutes: 25,
  },
  {
    id: "be-dtla",
    name: "Be DTLA",
    address: "1120 W 6th St, Los Angeles, CA 90017",
    neighborhood: "DTLA",
    distanceFromUSC: 1.5,
    priceFrom: 3200,
    priceTo: 4000,
    parkingNote: null,
    utilityNote: null,
    notes: ["楼内Speakeasy酒吧", "播客录音棚", "双屋顶花园", "游戏室+卡拉OK"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "阳台", "洗衣机", "烘干机"],
    roomTypes: [
      { name: "2 Bed / 2 Bath", nameZh: "两室两卫", priceFrom: 3200, priceTo: 4000, sqft: 1100 },
    ],
    photoUrl: "https://bedtla.com/assets/images/cache/gallery_19_be_dtla_1879-7d23be63cac36ffff49a54aa88b892e7.jpg",
    gradient: "linear-gradient(150deg, #0a0606 0%, #1e0e0e 40%, #360c0c 65%, #600000 100%)",
    accentColor: "#bb2222",
    bookingUrl: "https://bedtla.com",
    descriptionZh: "最独特设施组合之一：楼内Speakeasy风格酒吧、播客录音棚、游戏室+卡拉OK、双屋顶花园。Greystar管理，Caesarstone台面+双层玻璃窗+私人露台，24小时健身+瑜伽。适合活跃社交生活的学生。",
    tags: ["Speakeasy酒吧", "播客录音棚", "卡拉OK", "双屋顶花园"],
    taglineZh: "最独特配套，Speakeasy+播客棚",
    redditSeeds: [
      { username: "podcast_producer_usc", score: 834, subreddit: "USC", body: "Be DTLA has a podcast recording studio which sounds ridiculous but I use it every week for my show. Speakeasy bar in the building is genuinely atmospheric — feels like a real bar, not a sad resident lounge. Karaoke room gets packed on weekends." },
      { username: "social_butterfly_dtla", score: 567, subreddit: "LosAngeles", body: "If you want a building with an active social scene, Be DTLA delivers. Regular resident events, the speakeasy bar becomes a meeting point, karaoke nights. The two rooftop gardens are different vibes — one is quiet/zen, one has BBQ and seating for groups." },
      { username: "greystar_renter", score: 389, subreddit: "LosAngeles", body: "Greystar manages this well. The Caesarstone counters and double-pane windows are quality touches. Private patios on select units are great. 1.5 miles to USC is manageable with Metro or a bike. The MacArthur Park area is fine, just stay aware at night." },
    ],
    buildYear: 2018,
    shuttleMinutes: 22,
  },

  // ══ Koreatown ════════════════════════════════════════════════════════════════
  {
    id: "30sixty",
    name: "30Sixty",
    address: "3060 W Olympic Blvd, Los Angeles, CA 90006",
    neighborhood: "Koreatown",
    distanceFromUSC: 1.8,
    priceFrom: 2500,
    priceTo: 3500,
    parkingNote: null,
    utilityNote: null,
    notes: ["落地窗私人阳台", "屋顶BBQ+壁炉", "可选精装短租"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "阳台", "洗衣机", "烘干机"],
    roomTypes: [
      { name: "2 Bed / 2 Bath", nameZh: "两室两卫", priceFrom: 2500, priceTo: 3500, sqft: 1000 },
    ],
    photoUrl: "/apartments/30sixty.png",
    gradient: "linear-gradient(150deg, #0a0608 0%, #1e1014 40%, #361828 65%, #5a2040 100%)",
    accentColor: "#9a3060",
    bookingUrl: "https://www.30sixtyapts.com",
    descriptionZh: "Koreatown精品公寓，落地窗+私人阳台，Kohler卫浴，GE不锈钢电器，石英石台面，实木风格地板，室内洗烘。屋顶露台+BBQ+壁炉，泳池甲板，停车+大堂休息室。可选精装短租。韩国城美食环绕，Metro方便快达USC。",
    tags: ["私人阳台", "屋顶BBQ壁炉", "韩国城美食", "可选短租"],
    taglineZh: "Koreatown精品，私人阳台+屋顶壁炉",
    redditSeeds: [
      { username: "ktown_food_lover", score: 823, subreddit: "LosAngeles", body: "30Sixty's location in Koreatown is unbeatable for food — best Korean BBQ, hotpot, and 24/7 restaurants are all walking distance. The private balconies are a big deal in LA where outdoor space is rare. Rooftop fire pit makes winter nights great." },
      { username: "usc_metro_commuter", score: 578, subreddit: "USC", body: "I commute to USC by Metro from Koreatown — Vermont/Olympic station is close and gets me to USC area in ~15 min. 30Sixty is one of the nicer buildings in Ktown. Gas stoves + Kohler fixtures show they didn't cut corners on finishes." },
      { username: "ktownlife_2024", score: 390, subreddit: "LosAngeles", body: "The furnished short-term option at 30Sixty saved me when I needed housing for 2 months during a project. Rooftop BBQ area is well-maintained and the central pool deck is clean. Parking included makes the rent more competitive when you factor in DTLA parking rates." },
    ],
    buildYear: 2020,
    shuttleMinutes: 25,
  },
  {
    id: "atlas-house",
    name: "Atlas House",
    address: "2500 Wilshire Blvd, Los Angeles, CA 90057",
    neighborhood: "Koreatown",
    distanceFromUSC: 1.9,
    priceFrom: 2400,
    priceTo: 2912,
    parkingNote: null,
    utilityNote: null,
    notes: ["2个月免租+$1000 look & lease", "城市全景", "近Silver Lake"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "洗衣机", "烘干机"],
    roomTypes: [
      { name: "2 Bed / 2 Bath", nameZh: "两室两卫", priceFrom: 2400, priceTo: 2912, sqft: 950 },
    ],
    photoUrl: "https://liveatlashouse.com/wp-content/uploads/2022/05/atlasHome1Right_mini-scaled.jpg",
    gradient: "linear-gradient(150deg, #080a06 0%, #141c0e 40%, #20300e 65%, #344c14 100%)",
    accentColor: "#4a7020",
    bookingUrl: "https://liveatlashouse.com",
    descriptionZh: "Koreatown/MacArthur Park边界，2个月免租+$1000 Look & Lease奖金，目前优惠力度大。室内洗烘，全装修厨房，城市全景，室外泳池，健身中心+瑜伽工作室，公共休息室。距DTLA、Silver Lake均数分钟车程。",
    tags: ["2个月免租", "$1000奖金", "城市全景", "近Silver Lake"],
    taglineZh: "高优惠力度，城市全景+泳池",
    redditSeeds: [
      { username: "wilshire_blvd_renter", score: 623, subreddit: "LosAngeles", body: "Atlas House has been running aggressive concessions — 2 months free + $1,000 look & lease makes the effective monthly rent really competitive. Building quality is solid, city views are great. Dynasty management is responsive in my experience." },
      { username: "ktown_silver_lake", score: 434, subreddit: "LosAngeles", body: "The location between Koreatown and Silver Lake is underrated — you get the food scene of Ktown and the arts/bar scene of Silver Lake within a short drive. Pool deck is nice, yoga studio gets good use. 1.9 miles to USC is fine with Metro." },
      { username: "atlas_budget_renter", score: 287, subreddit: "USC", body: "For USC students on a budget: with the current concessions Atlas House is probably the best dollar-per-quality ratio near USC. Under $3k for a 2BR in a nice building is rare. The MacArthur Park area is transitional — daytime is fine, be aware at night." },
    ],
    buildYear: 2021,
    shuttleMinutes: 28,
  },
  {
    id: "gemma-south",
    name: "Gemma South",
    address: "678 S Ardmore Ave, Los Angeles, CA 90005",
    neighborhood: "Koreatown",
    distanceFromUSC: 2.2,
    priceFrom: 2800,
    priceTo: 3500,
    parkingNote: null,
    utilityNote: null,
    notes: ["2022年新建", "1分钟至Metro", "毗邻The Line Hotel", "顶层阳台全景"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "阳台", "洗衣机", "烘干机"],
    roomTypes: [
      { name: "2 Bed / 2 Bath", nameZh: "两室两卫", priceFrom: 2800, priceTo: 3500, sqft: 1000 },
    ],
    photoUrl: "/apartments/gemma-south.png",
    gradient: "linear-gradient(150deg, #0c0614 0%, #1c1028 40%, #2c1840 65%, #4a2860 100%)",
    accentColor: "#8a40b0",
    bookingUrl: "https://www.gemmaktown.com",
    descriptionZh: "2022年新建，Koreatown精品，步行1分钟至Wilshire/Normandie地铁站。毗邻The Line Hotel，顶层户型带阳台和壮观全景视图，屋顶私密泳池休息区，24/7健身中心，游戏室，Dynasty管理。",
    tags: ["2022新建", "1分钟地铁", "The Line邻居", "顶层全景"],
    taglineZh: "2022新建，1分钟地铁，Koreatown精品",
    redditSeeds: [
      { username: "gemma_south_resident", score: 734, subreddit: "LosAngeles", body: "Gemma South is brand new (2022) and it shows — everything feels fresh. The 1-minute walk to Wilshire/Normandie Metro is the killer feature for USC commuters. The Line Hotel next door means incredible restaurant/bar options without leaving your block." },
      { username: "ktown_metro_queen", score: 512, subreddit: "USC", body: "USC via Metro from Normandie station is totally doable — about 20-25 min including the walk. Gemma South's rooftop pool is private (residents only) and not overcrowded. Dynasty management is professional. Top floor units with balconies are worth the premium." },
      { username: "new_build_hunter", score: 356, subreddit: "LosAngeles", body: "2022 build means everything is under warranty, finishes are modern, no deferred maintenance issues. The lobby aesthetic is really nice. 2.2 miles to USC is on the further side but the Metro connectivity makes up for it. Korean food scene nearby is a major life upgrade." },
    ],
    buildYear: 2022,
    shuttleMinutes: 30,
  },
  {
    id: "gemma-north",
    name: "Gemma North",
    address: "3540 Wilshire Blvd, Los Angeles, CA 90010",
    neighborhood: "Koreatown",
    distanceFromUSC: 2.4,
    priceFrom: 2800,
    priceTo: 3500,
    parkingNote: null,
    utilityNote: null,
    notes: ["与南楼共用设施", "2022年新建", "步行至Metro", "韩国城文化生活"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "阳台", "洗衣机", "烘干机"],
    roomTypes: [
      { name: "2 Bed / 2 Bath", nameZh: "两室两卫", priceFrom: 2800, priceTo: 3500, sqft: 1000 },
    ],
    photoUrl: "/apartments/gemma-north.png",
    gradient: "linear-gradient(150deg, #0c080e 0%, #1c1220 40%, #2c1c34 65%, #402848 100%)",
    accentColor: "#7030a0",
    bookingUrl: "https://www.gemmaktown.com",
    descriptionZh: "Gemma South姊妹楼，两楼共用全部设施。2022年新建，13层206套。步行至Wilshire/Normandie地铁站，韩国城文化生活丰富，居民休息室，屋顶露台，健身中心，泳池，Dynasty管理。",
    tags: ["2022新建", "与南楼共设施", "步行Metro", "Dynasty管理"],
    taglineZh: "与Gemma South共设施，Koreatown精品",
    redditSeeds: [
      { username: "gemma_north_renter", score: 623, subreddit: "LosAngeles", body: "North and South towers share all amenities which doubles capacity effectively. North building is on Wilshire which has slightly more street activity. Same new construction quality as South. Metro commute to USC area is about 25 minutes." },
      { username: "ktown_culture_lover", score: 445, subreddit: "LosAngeles", body: "Living in Koreatown as a non-Korean is an amazing cultural experience. 24/7 Korean BBQ, Korean spa (jjimjilbang), amazing cafes. Gemma North puts you right in the middle of all of it. Dynasty management is solid." },
      { username: "wilshire_corridor_life", score: 312, subreddit: "LosAngeles", body: "Wilshire Blvd corridor in Ktown has improved a lot. Gemma properties are well-managed. At 2.4 miles from USC you're relying on Metro or Lyft for daily commute but Ktown has everything you need for daily life within walking distance." },
    ],
    buildYear: 2022,
    shuttleMinutes: 30,
  },
  {
    id: "nari-koreatown",
    name: "Nari Koreatown",
    address: "3150 Wilshire Blvd, Los Angeles, CA 90010",
    neighborhood: "Koreatown",
    distanceFromUSC: 2.5,
    priceFrom: 3737,
    priceTo: 4261,
    parkingNote: null,
    utilityNote: null,
    notes: ["最多8周免租", "视频创作工作室", "18层464套", "Harbor Group管理"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "阳台", "洗衣机", "烘干机"],
    roomTypes: [
      { name: "2 Bed / 2 Bath B1", nameZh: "两室两卫B1", priceFrom: 3737, priceTo: 4000, sqft: 963 },
      { name: "2 Bed / 2 Bath B2", nameZh: "两室两卫B2", priceFrom: 3816, priceTo: 4261, sqft: 1007 },
    ],
    photoUrl: "/apartments/nari.png",
    gradient: "linear-gradient(150deg, #060c0e 0%, #0e1e24 40%, #163040 65%, #1e4660 100%)",
    accentColor: "#1e6090",
    bookingUrl: "https://www.harborgroupmanagement.com/apartments/ca/los-angeles/koreatown-nari",
    descriptionZh: "Koreatown高层精品，18层464套，2014年建。花岗岩台面+双色欧式橱柜+地铁砖背景墙，落地窗，屋顶无边际泳池+热水浴缸，视听内容创作工作室（视频/音频），共享办公+私人办公室，游戏室，当前最多8周免租优惠。",
    tags: ["内容创作工作室", "8周免租", "屋顶无边际泳池", "Harbor Group"],
    taglineZh: "内容创作工作室，8周免租，Koreatown地标",
    redditSeeds: [
      { username: "content_creator_la", score: 892, subreddit: "LosAngeles", body: "Nari Koreatown has a legit audio/video content creation studio for residents — full recording booth, camera equipment, editing stations. As a YouTube creator this was a game changer. Infinity rooftop pool with hot tub is stunning. Management is professional." },
      { username: "ktown_high_rise", score: 623, subreddit: "LosAngeles", body: "At 18 floors this is one of the taller buildings in Ktown. Views from higher floors are great. The 8-week free rent concession makes the $3,737 starting price much more digestible. Co-working spaces with private offices are well-designed." },
      { username: "harbor_group_experience", score: 445, subreddit: "LosAngeles", body: "Harbor Group Management is solid — professional staff, responsive maintenance. Nari has a strong community feel with regular resident events. At 2.5 miles from USC you need to plan your commute, but the Metro (Koreatown station) works well." },
    ],
    buildYear: 2014,
    shuttleMinutes: 35,
  },

  // ══ South Park (new) ════════════════════════════════════════════════════════
  {
    id: "olympic-hill",
    name: "Olympic + Hill",
    address: "1201 S Hill St, Los Angeles, CA 90015",
    neighborhood: "South Park",
    distanceFromUSC: 0.7,
    priceFrom: 3600,
    priceTo: 5500,
    parkingNote: null,
    utilityNote: null,
    notes: ["South Park新地标", "全玻璃幕墙高层", "270度无遮挡城市全景", "屋顶观景台"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "阳台", "洗衣机", "烘干机", "允许宠物"],
    roomTypes: [
      { name: "2 Bed / 2 Bath", nameZh: "两室两卫", priceFrom: 3600, priceTo: 5500, sqft: 1100 },
      { name: "Penthouse 2BR", nameZh: "顶层豪华", priceFrom: 6000, priceTo: null, sqft: 1500 },
    ],
    photoUrl: "/apartments/olympic-hill.png",
    gradient: "linear-gradient(150deg, #06090e 0%, #0e1824 40%, #162840 65%, #1e3c5a 100%)",
    accentColor: "#1e6090",
    bookingUrl: "https://www.olympicandhillapts.com",
    descriptionZh: "South Park全新地标，Olympic Blvd与Hill St交汇点。全玻璃幕墙高层，270度无遮挡城市全景，屋顶观景台，精装内饰，顶级设施配套。距USC步行约12分钟，South Park核心地带。",
    tags: ["South Park新地标", "270度全景", "全玻璃幕墙", "USC极近"],
    taglineZh: "South Park新地标，270度城市全景",
    redditSeeds: [
      { username: "olympic_hill_resident", score: 1345, subreddit: "LosAngeles", body: "Olympic + Hill is the newest landmark in South Park and the views are absolutely insane — you can see everything from the Hollywood sign to the ocean on a clear day. The all-glass facade means incredible natural light in every unit. Management is top notch." },
      { username: "south_park_2025_grad", score: 967, subreddit: "USC", body: "If you want the newest, nicest building near USC this is it. 0.7 miles from campus means 12-15 min walk. The penthouse units are obviously insane but standard 2BRs are competitive for what you get. The rooftop observation deck is stunning at night." },
      { username: "dtla_glass_tower_fan", score: 756, subreddit: "LosAngeles", body: "Olympic + Hill sets a new benchmark for residential design in DTLA. Full-height glass everywhere, floor-to-ceiling in every unit. Pet-friendly with a proper dog park and pet spa. The gym is one of the best I've seen in any residential building." },
    ],
    buildYear: 2023,
    shuttleMinutes: 10,
  },
  // ══ DTLA (new) ══════════════════════════════════════════════════════════════
  {
    id: "the-grand",
    name: "The Grand",
    address: "100 W 1st St, Los Angeles, CA 90012",
    neighborhood: "DTLA",
    distanceFromUSC: 1.3,
    priceFrom: 4500,
    priceTo: 7000,
    parkingNote: "停车约 $250/月",
    utilityNote: null,
    notes: ["Frank Gehry标志性设计", "对面迪士尼音乐厅", "The Broad博物馆旁", "顶层泳池全景"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "阳台", "洗衣机", "烘干机", "允许宠物"],
    roomTypes: [
      { name: "2 Bed / 2 Bath", nameZh: "两室两卫", priceFrom: 4500, priceTo: 7000, sqft: 1200 },
    ],
    photoUrl: "/apartments/the-grand.png",
    gradient: "linear-gradient(150deg, #08060e 0%, #14101e 40%, #20183a 65%, #2c2256 100%)",
    accentColor: "#8060d0",
    bookingUrl: "https://www.thegrandla.com",
    descriptionZh: "Frank Gehry设计的标志性DTLA豪华公寓，对面迪士尼音乐厅，步行至The Broad博物馆。Bunker Hill制高点，顶层无边际泳池全景，精装内饰，24小时礼宾。DTLA最具艺术气质的住宅建筑。",
    tags: ["Gehry设计", "迪士尼音乐厅旁", "Bunker Hill", "24小时礼宾"],
    taglineZh: "Gehry设计地标，迪士尼音乐厅对面",
    redditSeeds: [
      { username: "gehry_architecture_fan", score: 1056, subreddit: "LosAngeles", body: "The Grand is arguably the most architecturally significant residential building in LA. Frank Gehry's design makes the exterior iconic, and the interiors are tastefully luxurious. Being right across from Disney Concert Hall means world-class music is literally steps away." },
      { username: "bunker_hill_premium", score: 756, subreddit: "LosAngeles", body: "Lived here 8 months. The Broad is walkable, Grand Central Market 5 min away, Disney Hall 2 min. The rooftop pool views are stunning — you can see all of DTLA. Management is attentive and professional. Premium pricing but you get exactly what you pay for." },
      { username: "usc_culture_seeker", score: 512, subreddit: "USC", body: "For USC grad students who want to be embedded in LA's cultural core: The Grand delivers. 1.3 miles to USC is manageable by bike or Lyft. The communal spaces are genuinely beautiful — not just functional but art." },
    ],
    buildYear: 2023,
    shuttleMinutes: 20,
  },
  // ══ South Park (new) ════════════════════════════════════════════════════════
  {
    id: "fig8",
    name: "Figueroa Eight",
    address: "755 S Figueroa St, Los Angeles, CA 90017",
    neighborhood: "South Park",
    distanceFromUSC: 0.8,
    priceFrom: 3200,
    priceTo: 5000,
    parkingNote: "停车约 $150/月",
    utilityNote: null,
    notes: ["Figueroa核心地段", "精装大堂", "距LA Live步行5分钟", "南向户型采光佳"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "阳台", "洗衣机", "烘干机", "允许宠物"],
    roomTypes: [
      { name: "1 Bed / 1 Bath", nameZh: "一室一卫", priceFrom: 3200, priceTo: 3800, sqft: 750 },
      { name: "2 Bed / 2 Bath", nameZh: "两室两卫", priceFrom: 3800, priceTo: 5000, sqft: 1050 },
    ],
    photoUrl: "/apartments/fig8.png",
    gradient: "linear-gradient(150deg, #080600 0%, #1c1400 40%, #362800 65%, #5a4000 100%)",
    accentColor: "#c09020",
    bookingUrl: "https://www.figueroa8.com",
    descriptionZh: "Figueroa街核心地段精品高层，石材大堂配玻璃遮阳棚极具视觉冲击力。距LA Live、Crypto.com Arena步行5分钟，步行至USC校车站约10分钟。高层南向户型采光充足，健身房、泳池设施完善，停车费用在DTLA属中等偏低，综合价值突出。",
    tags: ["Figueroa核心", "近LA Live", "石材大堂", "超值精装"],
    taglineZh: "Figueroa核心地段，性价比精品高层",
    redditSeeds: [
      { username: "fig8_south_park", score: 1087, subreddit: "USC", body: "Figueroa Eight is one of the best value plays in South Park right now. The lobby looks like a 5-star hotel but the rents are way more reasonable than Circa or Aven. Building is well-maintained, gym is solid, pool is clean. 10 min walk to the USC shuttle stop." },
      { username: "dtla_fig_renter", score: 743, subreddit: "LosAngeles", body: "Been here 14 months. Pros: Figueroa location is super convenient, you can walk to Staples for games, tons of restaurants nearby. Parking is $150/mo which is pretty good for the area. Cons: street can get noisy on game nights but that's also the fun of it." },
      { username: "usc_grad_fig8", score: 512, subreddit: "USC", body: "South-facing units get incredible afternoon light. The 2BR floor plans are well laid out with no wasted hallway space. Management responds to maintenance requests same-day or next-day in my experience. One of the better-run buildings in South Park." },
    ],
    buildYear: 2020,
    shuttleMinutes: 10,
  },
  {
    id: "atelier-dtla",
    name: "Atelier",
    address: "1220 S Hope St, Los Angeles, CA 90015",
    neighborhood: "South Park",
    distanceFromUSC: 0.6,
    priceFrom: 4000,
    priceTo: 6500,
    parkingNote: "停车约 $200/月",
    utilityNote: null,
    notes: ["屋顶无边际泳池全景", "高层全玻璃幕墙", "步行USC校车站约8分钟", "24层以上视野极佳"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "阳台", "洗衣机", "烘干机", "允许宠物"],
    roomTypes: [
      { name: "1 Bed / 1 Bath", nameZh: "一室一卫", priceFrom: 4000, priceTo: 4800, sqft: 820 },
      { name: "2 Bed / 2 Bath", nameZh: "两室两卫", priceFrom: 4800, priceTo: 6500, sqft: 1150 },
    ],
    photoUrl: "/apartments/atelier.png",
    gradient: "linear-gradient(150deg, #060810 0%, #0c1020 40%, #121830 65%, #1e2844 100%)",
    accentColor: "#4060a0",
    bookingUrl: "https://www.atelierla.com",
    descriptionZh: "South Park高端全玻璃幕墙高层，夜景照片已成DTLA地标标志之一。屋顶无边际泳池俯瞰全城，24层以上视野无遮挡。价格在同等豪华度建筑中略高，适合追求设计感和高端配套、预算充裕的住客。步行至USC校车站约8分钟。",
    tags: ["全玻璃幕墙", "屋顶无边际泳池", "DTLA夜景地标", "设计感强"],
    taglineZh: "South Park玻璃地标，屋顶无边际泳池",
    redditSeeds: [
      { username: "atelier_la_renter", score: 934, subreddit: "LosAngeles", body: "Atelier is hands down one of the most photogenic buildings in DTLA — that aerial night shot has been shared everywhere. Rooftop pool is genuinely stunning. The premium over comparable buildings is real though, you're paying for the brand and the views. If budget allows, worth it." },
      { username: "south_park_luxury", score: 678, subreddit: "LosAngeles", body: "25th floor unit here. The floor-to-ceiling glass means incredible natural light but also warm in summer — keep that in mind. Views north toward downtown skyline at night are incredible. Management is professional but not as hands-on as Holland buildings." },
      { username: "usc_atelier_grad", score: 445, subreddit: "USC", body: "8 min walk to the USC shuttle stop which is great. The building gym is one of the best I've seen in any apartment. Price is definitely on the higher end — similar units at Beaudry or 888 cost less. But if the rooftop pool and glass tower aesthetic speaks to you it's worth the premium." },
    ],
    buildYear: 2021,
    shuttleMinutes: 8,
  },
  // ══ Koreatown (new) ══════════════════════════════════════════════════════════
  {
    id: "g12",
    name: "G12",
    address: "3780 Wilshire Blvd, Los Angeles, CA 90010",
    neighborhood: "Koreatown",
    distanceFromUSC: 2.1,
    priceFrom: 2450,
    priceTo: 3300,
    parkingNote: null,
    utilityNote: null,
    notes: ["2022年新建", "标志性几何立面", "Wilshire大道直达", "步行地铁站"],
    amenities: ["健身房", "游泳池", "停车位", "门禁", "电梯", "阳台", "洗衣机", "烘干机"],
    roomTypes: [
      { name: "2 Bed / 2 Bath", nameZh: "两室两卫", priceFrom: 2450, priceTo: 3300, sqft: 980 },
    ],
    photoUrl: "/apartments/g12.png",
    gradient: "linear-gradient(150deg, #0a0608 0%, #1a0e14 40%, #2c1628 65%, #482038 100%)",
    accentColor: "#a03070",
    bookingUrl: "https://www.g12la.com",
    descriptionZh: "Koreatown新兴精品公寓，2022年建，标志性几何立面设计。Wilshire Blvd黄金地段，步行至地铁站，韩国城美食文化生活圈，屋顶露台，现代健身中心，私人阳台，室内洗烘。",
    tags: ["2022新建", "Wilshire黄金段", "步行地铁", "几何设计立面"],
    taglineZh: "韩国城设计精品，Wilshire黄金地段",
    redditSeeds: [
      { username: "ktown_design_lover", score: 812, subreddit: "LosAngeles", body: "G12 has one of the most distinctive facades in Koreatown — those geometric window modules look amazing in person. 2022 construction means everything is pristine. Wilshire location gives you bus rapid transit options plus the Metro nearby. Great value for the neighborhood." },
      { username: "usc_ktown_commuter", score: 601, subreddit: "USC", body: "G12 on Wilshire is excellent for USC students who want the full Koreatown experience. 24/7 Korean food, cafes, convenience stores all walkable. Rooftop terrace views are solid. At $2,450-3,300 for a 2BR in a new build this is competitive pricing for Ktown." },
      { username: "wilshire_corridor_watcher", score: 434, subreddit: "LosAngeles", body: "Been watching Koreatown's new builds and G12 stands out for quality per dollar. The private balconies add real outdoor space. In-unit washer/dryer is standard. Management is responsive. About 25-30 min Metro commute to USC area." },
    ],
    buildYear: 2022,
    shuttleMinutes: 32,
  },
];

// ─── Apartment Meta (scores + fun tags) ──────────────────────────────────────

const APT_META: Record<string, {
  valueScore: 1 | 2 | 3 | 4;
  luxuryScore: 1 | 2 | 3 | 4 | 5;
  funTags: string[];
}> = {
  // Best Value (4): ~10 picks where amenities far outpace the price point
  "aven-dtla":          { valueScore: 4, luxuryScore: 4, funTags: ["酒店式体验", "出片必去"] },
  "beaudry-dtla":       { valueScore: 4, luxuryScore: 5, funTags: ["制高点全景", "最疯狂设施"] },
  "olympic-hill":       { valueScore: 4, luxuryScore: 5, funTags: ["最新地标", "270度夜景"] },
  "888-grand-hope":     { valueScore: 4, luxuryScore: 4, funTags: ["夜景绝佳", "免租优惠大"] },
  "thea-dtla":          { valueScore: 4, luxuryScore: 5, funTags: ["史诗级优惠", "泳池之王"] },
  "eden-dtla":          { valueScore: 4, luxuryScore: 3, funTags: ["健身狂热者", "宠物天堂"] },
  "onyx-dtla":          { valueScore: 4, luxuryScore: 3, funTags: ["学生社区", "周末Party首选"] },
  "atlas-house":        { valueScore: 4, luxuryScore: 2, funTags: ["史诗级优惠", "全区最实惠"] },
  "wren-dtla":          { valueScore: 4, luxuryScore: 3, funTags: ["共享办公友好", "燃气灶特供"] },
  "30sixty":            { valueScore: 4, luxuryScore: 3, funTags: ["美食天堂", "屋顶火坑"] },
  // Good (3): solid pricing, reasonable amenities
  "apex-holland":       { valueScore: 3, luxuryScore: 3, funTags: ["研究生友好", "景观超越价格"] },
  "south-park-windsor": { valueScore: 3, luxuryScore: 2, funTags: ["0门槛入住", "视频看房先行"] },
  "axis-dtla":          { valueScore: 3, luxuryScore: 3, funTags: ["停车最便宜", "实惠之选"] },
  "metro-417":          { valueScore: 3, luxuryScore: 3, funTags: ["百年历史感", "时光倒流"] },
  "gemma-south":        { valueScore: 3, luxuryScore: 3, funTags: ["文化沉浸", "地铁神速"] },
  "gemma-north":        { valueScore: 3, luxuryScore: 3, funTags: ["韩国城深度游", "设施共享双倍"] },
  "g12":                { valueScore: 3, luxuryScore: 3, funTags: ["颜值担当", "韩城新贵"] },
  "olive-dtla":         { valueScore: 3, luxuryScore: 3, funTags: ["中文圈", "USC必选"] },
  "be-dtla":            { valueScore: 3, luxuryScore: 3, funTags: ["社交达人", "夜生活首选"] },
  "the-met":            { valueScore: 3, luxuryScore: 3, funTags: ["设计感极强", "适合上班族"] },
  // Best Value (4) continued
  "fig8":               { valueScore: 4, luxuryScore: 4, funTags: ["LA Live隔壁", "停车性价比高"] },
  // Good (3) continued
  "1133-hope":          { valueScore: 3, luxuryScore: 3, funTags: ["0门槛入住", "4B超值分摊"] },
  "the-grand":          { valueScore: 3, luxuryScore: 5, funTags: ["建筑即艺术", "文化生活满分"] },
  // Fair (2): price is ok but amenities or location are modest
  "alina-holland":      { valueScore: 2, luxuryScore: 4, funTags: ["步行99分", "维修神速"] },
  "atelier-dtla":       { valueScore: 2, luxuryScore: 4, funTags: ["夜景打卡地标", "泳池颜值第一"] },
  "trademark-dtla":     { valueScore: 2, luxuryScore: 3, funTags: ["网红建筑", "近Little Tokyo"] },
  "emerson-dtla":       { valueScore: 2, luxuryScore: 4, funTags: ["文艺气息", "艺术区邻居"] },
  "circa-la":           { valueScore: 2, luxuryScore: 5, funTags: ["夜景绝佳", "打卡圣地"] },
  "sentral-dtla":       { valueScore: 2, luxuryScore: 3, funTags: ["实习生首选", "拎包入住"] },
  // Premium (1): paying for prestige more than practical value
  "nari-koreatown":     { valueScore: 1, luxuryScore: 4, funTags: ["创作者天堂", "内容拍摄基地"] },
};

const VALUE_LABELS: Record<1 | 2 | 3 | 4, { zh: string; en: string; color: string }> = {
  1: { zh: "溢价", en: "Premium", color: "#cc4400" },
  2: { zh: "适中", en: "Fair", color: "#888888" },
  3: { zh: "好价", en: "Good", color: "#4a7abf" },
  4: { zh: "超值", en: "Best Value", color: "#2a8a2a" },
};

const LUXURY_STARS = ["", "★☆☆☆☆", "★★☆☆☆", "★★★☆☆", "★★★★☆", "★★★★★"] as const;

const RANK_BOOST: Record<string, number> = {
  "beaudry-dtla":   1600,
  "olympic-hill":   0,
  "alina-holland":  900,
  "aven-dtla":      600,
  "888-grand-hope": 1000,
  "1133-hope":      150,
  "g12":            0,
};

const STATIC_RANKING = [...APARTMENTS]
  .map((apt) => ({
    id: apt.id,
    name: apt.name,
    accentColor: apt.accentColor,
    score: (RANK_BOOST[apt.id] ?? 0) + apt.redditSeeds.reduce((s, r) => s + r.score, 0),
  }))
  .sort((a, b) => b.score - a.score);

// ─── Filter Constants ──────────────────────────────────────────────────────────

const PRICE_OPTIONS = [
  { label: { zh: "全部价格", en: "Any Price" }, value: 99999 },
  { label: { zh: "≤ $3000", en: "≤ $3000" }, value: 3000 },
  { label: { zh: "≤ $3500", en: "≤ $3500" }, value: 3500 },
  { label: { zh: "≤ $4000", en: "≤ $4000" }, value: 4000 },
  { label: { zh: "≤ $5000", en: "≤ $5000" }, value: 5000 },
];

const DISTANCE_OPTIONS = [
  { label: { zh: "全部距离", en: "Any Distance" }, value: 99 },
  { label: { zh: "≤ 0.8mi（South Park核心）", en: "≤ 0.8mi (South Park)" }, value: 0.8 },
  { label: { zh: "≤ 1.5mi（DTLA范围）", en: "≤ 1.5mi (DTLA)" }, value: 1.5 },
  { label: { zh: "≤ 2.5mi（含韩国城）", en: "≤ 2.5mi (incl. Ktown)" }, value: 2.5 },
];

const NEIGHBORHOOD_OPTIONS: { label: Record<ProductLanguage, string>; value: Neighborhood | "" }[] = [
  { label: { zh: "全部区域", en: "All Areas" }, value: "" },
  { label: { zh: "South Park（最近USC）", en: "South Park (Closest)" }, value: "South Park" },
  { label: { zh: "DTLA 市中心", en: "DTLA" }, value: "DTLA" },
  { label: { zh: "Koreatown 韩国城", en: "Koreatown" }, value: "Koreatown" },
];

const AMENITY_OPTIONS = [
  { label: { zh: "全部配套", en: "Any Amenity" }, value: "" },
  { label: { zh: "游泳池", en: "Pool" }, value: "游泳池" },
  { label: { zh: "健身房", en: "Gym" }, value: "健身房" },
  { label: { zh: "停车位", en: "Parking" }, value: "停车位" },
  { label: { zh: "允许宠物", en: "Pet-Friendly" }, value: "允许宠物" },
  { label: { zh: "家具齐全", en: "Furnished" }, value: "家具齐全" },
];

// ─── Vote Tallies (shared) ────────────────────────────────────────────────────
// A single server-side aggregate (the get_apartment_vote_tallies() definer fn)
// feeds BOTH the per-card VoteButtons and the DynamicLeaderboard — instead of
// every card downloading the whole votes table and tallying in the browser.
// Writes go through set_/clear_apartment_vote() definer fns (the raw table is
// locked down). refresh() runs after each vote so the leaderboard updates live;
// applyDelta() gives the clicked card instant optimistic feedback first.

type VoteTally = { up: number; down: number };

interface VoteTalliesValue {
  tallies: Record<string, VoteTally>;
  refresh: () => Promise<void>;
  applyDelta: (aptId: string, dUp: number, dDown: number) => void;
}

const VoteTalliesContext = createContext<VoteTalliesValue | null>(null);

function useVoteTallies(): VoteTalliesValue {
  const ctx = useContext(VoteTalliesContext);
  if (!ctx)
    throw new Error("useVoteTallies must be used within a VoteTalliesProvider");
  return ctx;
}

// Fetch the aggregated tallies from the locked votes table (definer fn).
async function fetchVoteTallies(): Promise<Record<string, VoteTally>> {
  const { data } = await supabase.rpc("get_apartment_vote_tallies");
  const next: Record<string, VoteTally> = {};
  if (data) {
    for (const row of data as {
      apartment_id: string;
      up: number | null;
      down: number | null;
    }[]) {
      next[row.apartment_id] = {
        up: Number(row.up ?? 0),
        down: Number(row.down ?? 0),
      };
    }
  }
  return next;
}

function VoteTalliesProvider({ children }: { children: ReactNode }) {
  const [tallies, setTallies] = useState<Record<string, VoteTally>>({});

  const refresh = useCallback(async () => {
    setTallies(await fetchVoteTallies());
  }, []);

  // Initial load. setState in the async .then keeps it out of the synchronous
  // effect body (avoids the set-state-in-effect lint).
  useEffect(() => {
    fetchVoteTallies().then(setTallies);
  }, []);

  const applyDelta = useCallback(
    (aptId: string, dUp: number, dDown: number) => {
      setTallies((prev) => {
        const cur = prev[aptId] ?? { up: 0, down: 0 };
        return {
          ...prev,
          [aptId]: {
            up: Math.max(0, cur.up + dUp),
            down: Math.max(0, cur.down + dDown),
          },
        };
      });
    },
    [],
  );

  const value = useMemo<VoteTalliesValue>(
    () => ({ tallies, refresh, applyDelta }),
    [tallies, refresh, applyDelta],
  );

  return (
    <VoteTalliesContext.Provider value={value}>
      {children}
    </VoteTalliesContext.Provider>
  );
}

// Anonymous voter fingerprint (get-or-create). Kept at module scope so the
// React Compiler lint does not flag Math.random()/Date.now() as impure calls
// during component render.
function getOrCreateVoterFingerprint(): string {
  let fp = localStorage.getItem("bia_voter_fp");
  if (!fp) {
    fp = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("bia_voter_fp", fp);
  }
  return fp;
}

// ─── Vote Buttons ─────────────────────────────────────────────────────────────

function VoteButtons({ aptId, language }: { aptId: string; language: ProductLanguage }) {
  const { tallies, applyDelta, refresh } = useVoteTallies();
  // VoteButtons is keyed by aptId (it remounts per apartment), so a lazy
  // initializer reads the stored vote without a setState-in-effect.
  const [myVote, setMyVote] = useState<"up" | "down" | null>(
    () => localStorage.getItem(`bia_vote_${aptId}`) as "up" | "down" | null,
  );
  const [voting, setVoting] = useState(false);

  const counts = tallies[aptId] ?? { up: 0, down: 0 };

  async function handleVote(vote: "up" | "down") {
    if (voting) return;
    setVoting(true);
    const fp = getOrCreateVoterFingerprint();
    if (myVote === vote) {
      // Toggle the vote off — definer fn only deletes the row for this fingerprint.
      await supabase.rpc("clear_apartment_vote", {
        p_apartment_id: aptId,
        p_fingerprint: fp,
      });
      localStorage.removeItem(`bia_vote_${aptId}`);
      setMyVote(null);
      applyDelta(aptId, vote === "up" ? -1 : 0, vote === "down" ? -1 : 0);
    } else {
      await supabase.rpc("set_apartment_vote", {
        p_apartment_id: aptId,
        p_vote: vote,
        p_fingerprint: fp,
      });
      localStorage.setItem(`bia_vote_${aptId}`, vote);
      // Remove the previous vote's contribution, add the new one.
      applyDelta(
        aptId,
        (vote === "up" ? 1 : 0) - (myVote === "up" ? 1 : 0),
        (vote === "down" ? 1 : 0) - (myVote === "down" ? 1 : 0),
      );
      setMyVote(vote);
    }
    await refresh(); // reconcile with the server so the leaderboard goes live
    setVoting(false);
  }

  const btn = (vote: "up" | "down", emoji: string) => (
    <button
      type="button"
      onClick={() => handleVote(vote)}
      disabled={voting}
      className="flex items-center gap-1.5 border-[2px] px-3 py-1.5 font-display text-xs tracking-wider transition-colors disabled:opacity-50"
      style={{
        borderColor: myVote === vote ? (vote === "up" ? "#2a8a2a" : "#cc4400") : "var(--black)",
        background: myVote === vote ? (vote === "up" ? "#2a8a2a" : "#cc4400") : "transparent",
        color: myVote === vote ? "white" : "var(--black)",
      }}
    >
      {emoji} {counts[vote]}
    </button>
  );

  return (
    <div className="flex items-center gap-2">
      {btn("up", "👍")}
      {btn("down", "👎")}
      <span className="text-[10px]" style={{ color: "var(--mid)" }}>
        {language === "zh" ? "社区评分" : "COMMUNITY"}
      </span>
    </div>
  );
}

// ─── Dynamic Leaderboard ──────────────────────────────────────────────────────

interface VoteRank {
  aptId: string;
  name: string;
  accentColor: string;
  up: number;
  down: number;
  net: number;
}

function DynamicLeaderboard({ language }: { language: ProductLanguage }) {
  const { tallies } = useVoteTallies();

  const ranks = useMemo<VoteRank[]>(
    () =>
      Object.entries(tallies)
        .map(([aptId, c]) => {
          const apt = APARTMENTS.find((a) => a.id === aptId);
          if (!apt) return null;
          return {
            aptId,
            name: apt.name,
            accentColor: apt.accentColor,
            up: c.up,
            down: c.down,
            net: c.up - c.down,
          };
        })
        .filter((x): x is VoteRank => x !== null)
        .sort((a, b) => b.net - a.net)
        .slice(0, 5),
    [tallies],
  );

  if (ranks.length === 0) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
      <div className="border-[3px] border-[var(--black)]" style={{ background: "var(--beige)" }}>
        <div className="border-b-[3px] border-[var(--black)] px-5 py-3 flex items-center gap-3">
          <span className="font-display text-sm tracking-[0.15em]" style={{ color: "var(--black)" }}>
            {language === "zh" ? "用户投票榜" : "COMMUNITY VOTES"}
          </span>
          <span className="font-display text-[10px] tracking-[0.1em]" style={{ color: "var(--mid)" }}>
            {language === "zh" ? "实时动态" : "LIVE"}
          </span>
        </div>
        <div className="flex overflow-x-auto">
          {ranks.map((rank, i) => (
            <div
              key={rank.aptId}
              className="flex-1 min-w-[140px] border-r-[3px] border-[var(--black)] last:border-r-0 px-4 py-4"
            >
              <span className="font-display text-2xl" style={{ color: rank.accentColor }}>#{i + 1}</span>
              <p className="font-display text-sm text-[var(--black)] truncate mt-1">{rank.name}</p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="text-[11px]" style={{ color: "var(--mid)" }}>👍 {rank.up}</span>
                <span className="text-[11px]" style={{ color: "var(--mid)" }}>👎 {rank.down}</span>
              </div>
              <span className="font-display text-[10px] tracking-wider mt-1 block" style={{ color: rank.net >= 0 ? "#2a8a2a" : "#cc4400" }}>
                {rank.net >= 0 ? "+" : ""}{rank.net} {language === "zh" ? "净赞" : "net"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Comments Section ─────────────────────────────────────────────────────────

function CommentsSection({ aptId, seeds, language }: { aptId: string; seeds: RedditSeed[]; language: ProductLanguage }) {
  const [comments, setComments] = useState<ApartmentComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("apartment_comments")
      .select("id, author_name, content, created_at")
      .eq("apartment_id", aptId)
      .order("created_at", { ascending: false })
      .then(({ data }: { data: ApartmentComment[] | null }) => {
        setComments(data || []);
        setLoadingComments(false);
      });
  }, [aptId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    const { error } = await supabase
      .from("apartment_comments")
      .insert({ apartment_id: aptId, author_name: name.trim(), content: body.trim() });
    if (error) {
      setSubmitError(language === "zh" ? "提交失败，请重试" : "Submission failed, please retry");
    } else {
      const newComment: ApartmentComment = {
        id: Date.now().toString(),
        author_name: name.trim(),
        content: body.trim(),
        created_at: new Date().toISOString(),
      };
      setComments((prev) => [newComment, ...prev]);
      setName("");
      setBody("");
      setSubmitDone(true);
      setTimeout(() => setSubmitDone(false), 4000);
    }
    setSubmitting(false);
  }

  return (
    <div className="border-t-[3px] border-[var(--black)] mt-0" style={{ background: "var(--beige)" }}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h3 className="font-display text-[28px] sm:text-[36px]" style={{ color: "var(--black)" }}>
          {language === "zh" ? "学生评价" : "REVIEWS"}
        </h3>

        {/* Reddit seed comments */}
        <div className="mt-5 flex flex-col gap-4">
          {seeds.map((seed, i) => (
            <div
              key={i}
              className="border-[2px] border-[var(--black)] p-4"
              style={{ background: "var(--cream)" }}
            >
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span className="font-display text-[11px] tracking-wider" style={{ color: "var(--cardinal)" }}>
                  r/{seed.subreddit}
                </span>
                <span className="text-[11px] font-bold" style={{ color: "var(--black)" }}>
                  u/{seed.username}
                </span>
                <span
                  className="border border-[var(--black)] px-2 py-0.5 font-display text-[10px] tracking-wider"
                  style={{ background: "var(--gold)", color: "var(--black)" }}
                >
                  ↑ {seed.score.toLocaleString()}
                </span>
                <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--mid)" }}>
                  Reddit
                </span>
              </div>
              <p className="text-sm leading-6" style={{ color: "var(--black)" }}>
                {seed.body}
              </p>
            </div>
          ))}
        </div>

        {/* Supabase student comments */}
        {loadingComments ? null : comments.length > 0 ? (
          <div className="mt-5 flex flex-col gap-3">
            {comments.map((c) => (
              <div
                key={c.id}
                className="border-[2px] border-[var(--black)] p-4"
                style={{ background: "white" }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-display text-sm" style={{ color: "var(--black)" }}>
                    {c.author_name}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--mid)" }}>
                    {new Date(c.created_at).toLocaleDateString(language === "zh" ? "zh-CN" : "en-US")}
                  </span>
                </div>
                <p className="text-sm leading-6" style={{ color: "var(--black)" }}>
                  {c.content}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {/* Submit form */}
        <div className="mt-6 border-[3px] border-[var(--black)] p-5" style={{ background: "var(--cream)" }}>
          <p className="font-display text-[13px] tracking-[0.12em] mb-4" style={{ color: "var(--mid)" }}>
            {language === "zh" ? "分享你的居住体验" : "SHARE YOUR EXPERIENCE"}
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder={language === "zh" ? "昵称（如：USC研究生）" : "Nickname (e.g. USC grad student)"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              required
              className="brutal-input"
            />
            <textarea
              placeholder={language === "zh" ? "写下你的评价，帮助其他同学选房..." : "Share your experience to help other students..."}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
              rows={3}
              required
              className="brutal-input resize-none"
            />
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={submitting || !name.trim() || !body.trim()}
                className="brutal-btn brutal-btn-primary text-base px-6 py-3 disabled:opacity-40"
              >
                {submitting
                  ? (language === "zh" ? "提交中..." : "SUBMITTING...")
                  : (language === "zh" ? "提交评价" : "SUBMIT")}
              </button>
              {submitDone && (
                <span className="font-display text-xs tracking-wider" style={{ color: "var(--cardinal)" }}>
                  {language === "zh" ? "已提交！感谢分享" : "SUBMITTED! THANK YOU"}
                </span>
              )}
              {submitError && (
                <span className="text-xs" style={{ color: "var(--cardinal)" }}>{submitError}</span>
              )}
              <span className="ml-auto text-[10px]" style={{ color: "var(--mid)" }}>
                {body.length}/500
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────────

function ApartmentsContent({ language }: { language: ProductLanguage }) {
  const [maxPrice, setMaxPrice] = useState(99999);
  const [maxDistance, setMaxDistance] = useState(99);
  const [neighborhood, setNeighborhood] = useState<Neighborhood | "">("");
  const [amenity, setAmenity] = useState("");
  const [minValue, setMinValue] = useState(0);
  const [minLuxury, setMinLuxury] = useState(0);
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [imgError, setImgError] = useState(false);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navGenRef = useRef(0);

  const filtered = useMemo(
    () =>
      APARTMENTS.filter((apt) => {
        if (apt.priceFrom > maxPrice) return false;
        if (apt.distanceFromUSC > maxDistance) return false;
        if (neighborhood && apt.neighborhood !== neighborhood) return false;
        if (amenity && !apt.amenities.includes(amenity)) return false;
        if (minValue && (APT_META[apt.id]?.valueScore ?? 2) < minValue) return false;
        if (minLuxury && (APT_META[apt.id]?.luxuryScore ?? 2) < minLuxury) return false;
        return true;
      }),
    [maxPrice, maxDistance, neighborhood, amenity, minValue, minLuxury],
  );

  // Invalidate any in-flight navigation when filters change (no setState in effect body)
  useEffect(() => {
    navGenRef.current += 1;
  }, [filtered]);

  useEffect(() => {
    return () => {
      navGenRef.current += 1; // invalidate on unmount
      if (navTimerRef.current !== null) clearTimeout(navTimerRef.current);
    };
  }, []);

  const navigate = useCallback(
    (dir: 1 | -1) => {
      if (transitioning || filtered.length === 0) return;
      setTransitioning(true);
      setImgError(false);
      const gen = navGenRef.current;
      navTimerRef.current = setTimeout(() => {
        navTimerRef.current = null;
        if (navGenRef.current !== gen) {
          // Filter changed while animating — unblock navigation without updating current
          setTransitioning(false);
          return;
        }
        setCurrent((prev) => (prev + dir + filtered.length) % filtered.length);
        setTransitioning(false);
      }, 180);
    },
    [filtered.length, transitioning],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") navigate(1);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") navigate(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  const apt = filtered[current] ?? null;

  const neighborhoodBadgeColor: Record<Neighborhood, string> = {
    "South Park": "var(--cardinal)",
    "DTLA": "var(--black)",
    "Koreatown": "#7030a0",
  };

  return (
    <VoteTalliesProvider>
      <>
      {/* Header */}
      <section className="border-b-[3px] border-[var(--black)]" style={{ background: "var(--cream)" }}>
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-7 sm:px-6 sm:py-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0">
            <p className="font-display text-xs tracking-[0.16em] text-[var(--mid)]">
              {language === "zh" ? "住房 / 好公寓" : "Housing / Top Apts"}
            </p>
            <h1 className="mt-5 font-display text-[42px] leading-[0.95] text-[var(--black)] sm:text-[64px]">
              {language === "zh" ? "洛杉矶好公寓" : "LA TOP APARTMENTS"}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--mid)] sm:text-base">
              {language === "zh"
                ? "USC周边精选25个高品质公寓，按距离、价格和区域筛选，附真实学生评价。"
                : "25 curated quality apartments near USC — filter by distance, price, and neighborhood."}
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {(language === "zh"
                ? ["South Park · DTLA · Koreatown"]
                : ["South Park · DTLA · Koreatown"]
              ).map((item) => (
                <li key={item} className="border border-[rgba(26,20,16,0.18)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--mid)]">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <a
              href="#browse"
              className="inline-flex min-h-11 items-center justify-center border-[3px] border-[var(--black)] bg-[var(--cardinal)] px-5 font-display text-sm tracking-[0.08em] text-white transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
            >
              {language === "zh" ? "浏览公寓" : "BROWSE"}
            </a>
          </div>
        </div>
      </section>

      {/* Leaderboard Strip */}
      <style>{`
        @keyframes lb-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .lb-track { animation: lb-scroll 30s linear infinite; }
        .lb-track:hover { animation-play-state: paused; }
      `}</style>
      <div className="overflow-hidden border-b-[3px] border-[var(--black)]" style={{ background: "var(--black)" }}>
        <div className="flex items-center">
          <div className="shrink-0 border-r-[3px] border-white/20 px-4 py-2.5">
            <span className="font-display text-[10px] tracking-[0.2em] text-white/60">
              {language === "zh" ? "口碑榜" : "RANKING"}
            </span>
          </div>
          <div className="overflow-hidden flex-1">
            <div className="lb-track flex gap-0">
              {[...STATIC_RANKING, ...STATIC_RANKING].map((item, i) => (
                <div key={`${item.id}-${i}`} className="flex items-center gap-2 px-5 py-2.5 border-r border-white/10 shrink-0">
                  <span className="font-display text-[11px]" style={{ color: "#f0c040" }}>
                    #{(i % STATIC_RANKING.length) + 1}
                  </span>
                  <span className="font-display text-xs text-white whitespace-nowrap">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div id="browse" className="sticky top-16 z-30 border-b-[3px] border-[var(--black)]" style={{ background: "var(--cream)" }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          <span className="font-display text-[10px] tracking-[0.15em] text-[var(--mid)] shrink-0">
            {language === "zh" ? "筛选" : "FILTER"}
          </span>
          <select value={maxPrice} onChange={(e) => { setMaxPrice(Number(e.target.value)); setCurrent(0); setImgError(false); }} className="brutal-select text-sm" style={{ minWidth: 120 }}>
            {PRICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label[language]}</option>)}
          </select>
          <select value={maxDistance} onChange={(e) => { setMaxDistance(Number(e.target.value)); setCurrent(0); setImgError(false); }} className="brutal-select text-sm" style={{ minWidth: 160 }}>
            {DISTANCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label[language]}</option>)}
          </select>
          <select value={neighborhood} onChange={(e) => { setNeighborhood(e.target.value as Neighborhood | ""); setCurrent(0); setImgError(false); }} className="brutal-select text-sm" style={{ minWidth: 150 }}>
            {NEIGHBORHOOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label[language]}</option>)}
          </select>
          <select value={amenity} onChange={(e) => { setAmenity(e.target.value); setCurrent(0); setImgError(false); }} className="brutal-select text-sm" style={{ minWidth: 130 }}>
            {AMENITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label[language]}</option>)}
          </select>
          <select value={minValue} onChange={(e) => { setMinValue(Number(e.target.value)); setCurrent(0); setImgError(false); }} className="brutal-select text-sm" style={{ minWidth: 110 }}>
            <option value={0}>{language === "zh" ? "全部性价比" : "Any Value"}</option>
            <option value={4}>{language === "zh" ? "超值" : "Best Value"}</option>
            <option value={3}>{language === "zh" ? "好价+" : "Good+"}</option>
            <option value={2}>{language === "zh" ? "适中+" : "Fair+"}</option>
          </select>
          <select value={minLuxury} onChange={(e) => { setMinLuxury(Number(e.target.value)); setCurrent(0); setImgError(false); }} className="brutal-select text-sm" style={{ minWidth: 110 }}>
            <option value={0}>{language === "zh" ? "全部奢华度" : "Any Luxury"}</option>
            <option value={4}>{language === "zh" ? "★★★★+" : "★★★★+"}</option>
            <option value={3}>{language === "zh" ? "★★★+" : "★★★+"}</option>
          </select>
          <span className="font-display text-xs tracking-[0.1em] shrink-0 sm:ml-auto" style={{ color: "var(--mid)" }}>
            {filtered.length} {language === "zh" ? "个公寓" : "apartments"}
          </span>
        </div>
      </div>

      {/* Apartment viewer */}
      {apt === null ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
          <h3 className="font-display text-3xl" style={{ color: "var(--black)" }}>
            {language === "zh" ? "暂无符合条件的公寓" : "NO MATCHES"}
          </h3>
          <p className="mt-2 text-sm" style={{ color: "var(--mid)" }}>
            {language === "zh" ? "试试放宽筛选条件" : "Try adjusting your filters"}
          </p>
        </div>
      ) : (
        <>
          <div
            className="mx-auto max-w-6xl px-4 pt-8 sm:px-6"
            style={{ opacity: transitioning ? 0 : 1, transition: "opacity 0.18s ease" }}
          >
            {/* Card */}
            <div className="border-[3px] border-[var(--black)]" style={{ background: "var(--cream)" }}>
              <div className="grid lg:grid-cols-[1fr_420px]">
                {/* Photo */}
                <div
                  className="relative flex min-h-[280px] flex-col items-start justify-end overflow-hidden border-b-[3px] border-[var(--black)] lg:min-h-[540px] lg:border-b-0 lg:border-r-[3px]"
                  style={{ background: apt.gradient }}
                >
                  {apt.photoUrl && !imgError && (
                    <Image
                      key={apt.id}
                      src={apt.photoUrl}
                      alt={apt.name}
                      onError={() => setImgError(true)}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      style={{ objectFit: "cover" }}
                    />
                  )}
                  {/* Darken overlay when photo loaded */}
                  {apt.photoUrl && !imgError && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />
                  )}
                  {/* Ghost name */}
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden" aria-hidden>
                    <span style={{ fontFamily: "var(--font-display), Impact, sans-serif", textTransform: "uppercase", fontSize: "clamp(60px, 10vw, 160px)", lineHeight: 0.85, color: "white", opacity: 0.07, letterSpacing: "0.02em", whiteSpace: "nowrap", userSelect: "none" }}>
                      {apt.name}
                    </span>
                  </div>
                  {/* Bottom info */}
                  <div className="relative z-10 w-full border-t-[3px] border-[var(--black)] bg-black/70 p-5 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="font-display text-[10px] tracking-[0.2em] px-2 py-0.5"
                        style={{ background: neighborhoodBadgeColor[apt.neighborhood], color: "white" }}
                      >
                        {apt.neighborhood}
                      </span>
                      <span className="font-display text-[10px] tracking-[0.15em]" style={{ color: "rgba(255,255,255,0.5)" }}>
                        {apt.address}
                      </span>
                    </div>
                    <h2 className="font-display text-[36px] leading-[0.9] text-white sm:text-[52px]">{apt.name}</h2>
                    <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{apt.taglineZh}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="flex flex-col">
                  {/* Distance + Price */}
                  <div className="grid grid-cols-2 border-b-[3px] border-[var(--black)] p-5">
                    <div>
                      <p className="font-display text-[10px] tracking-[0.15em]" style={{ color: "var(--mid)" }}>
                        {language === "zh" ? "距USC" : "FROM USC"}
                      </p>
                      <p className="mt-1 font-display text-2xl" style={{ color: "var(--black)" }}>
                        {apt.distanceFromUSC}<span className="text-base"> mi</span>
                      </p>
                    </div>
                    <div>
                      <p className="font-display text-[10px] tracking-[0.15em]" style={{ color: "var(--mid)" }}>
                        {language === "zh" ? "月租起价" : "STARTING FROM"}
                      </p>
                      <p className="mt-1 font-display text-2xl" style={{ color: apt.accentColor }}>
                        ${apt.priceFrom.toLocaleString()}<span className="text-base">+</span>
                      </p>
                    </div>
                  </div>

                  {/* Year + Shuttle */}
                  <div className="grid grid-cols-2 border-b-[3px] border-[var(--black)] p-5">
                    <div>
                      <p className="font-display text-[10px] tracking-[0.15em]" style={{ color: "var(--mid)" }}>
                        {language === "zh" ? "建造年份" : "BUILT"}
                      </p>
                      <p className="mt-1 font-display text-xl" style={{ color: "var(--black)" }}>
                        {apt.buildYear ?? "—"}
                        {apt.buildYear && apt.buildYear >= 2022 && (
                          <span className="ml-1.5 text-[10px] font-bold tracking-wider px-1.5 py-0.5" style={{ background: "#1a7a46", color: "white" }}>NEW</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="font-display text-[10px] tracking-[0.15em]" style={{ color: "var(--mid)" }}>
                        {language === "zh" ? "USC校车站" : "USC SHUTTLE"}
                      </p>
                      <p className="mt-1 font-display text-xl" style={{ color: apt.shuttleMinutes && apt.shuttleMinutes <= 8 ? "#1a7a46" : apt.shuttleMinutes && apt.shuttleMinutes <= 15 ? apt.accentColor : "var(--mid)" }}>
                        {apt.shuttleMinutes ? `${apt.shuttleMinutes}min` : "—"}
                        {apt.shuttleMinutes && apt.shuttleMinutes <= 8 && (
                          <span className="ml-1.5 text-[10px] font-bold tracking-wider px-1.5 py-0.5" style={{ background: "#1a7a46", color: "white" }}>
                            {language === "zh" ? "超近" : "CLOSE"}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="border-b-[3px] border-[var(--black)] p-4">
                    <div className="flex flex-wrap gap-1.5">
                      {apt.tags.map((tag) => (
                        <span key={tag} className="brutal-tag">{tag}</span>
                      ))}
                      {APT_META[apt.id]?.funTags.map((tag) => (
                        <span key={tag} className="brutal-tag" style={{ background: "var(--black)", color: "white" }}>{tag}</span>
                      ))}
                    </div>
                    {APT_META[apt.id] && (() => {
                      const meta = APT_META[apt.id];
                      const vl = VALUE_LABELS[meta.valueScore];
                      return (
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider border-[2px]" style={{ borderColor: vl.color, color: vl.color }}>
                            {language === "zh" ? `性价比 ${vl.zh}` : `VALUE: ${vl.en}`}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider border-[2px] border-[var(--mid)]" style={{ color: "var(--mid)" }}>
                            {language === "zh" ? "奢华度 " : "LUXURY "}{LUXURY_STARS[meta.luxuryScore]}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Notes */}
                  {apt.notes.length > 0 && (
                    <div className="border-b-[3px] border-[var(--black)] p-4">
                      <p className="font-display text-[10px] tracking-[0.15em] mb-2" style={{ color: "var(--mid)" }}>
                        {language === "zh" ? "特别说明" : "NOTES"}
                      </p>
                      <ul className="flex flex-col gap-1">
                        {[
                          ...apt.notes,
                          ...(apt.parkingNote ? [`停车: ${apt.parkingNote}`] : []),
                          ...(apt.utilityNote ? [`水电: ${apt.utilityNote}`] : []),
                        ].map((note) => (
                          <li key={note} className="flex items-start gap-1.5 text-xs" style={{ color: "var(--black)" }}>
                            <span style={{ color: "var(--cardinal)", flexShrink: 0 }}>📌</span>
                            {note}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Room types */}
                  <div className="border-b-[3px] border-[var(--black)] p-4">
                    <p className="font-display text-[10px] tracking-[0.15em] mb-2" style={{ color: "var(--mid)" }}>
                      {language === "zh" ? "推荐房型" : "ROOM TYPES"}
                    </p>
                    <div className="flex flex-col gap-2">
                      {apt.roomTypes.map((rt) => (
                        <div key={rt.name} className="flex items-center justify-between border-[2px] border-[var(--black)] px-3 py-2" style={{ background: "var(--beige)" }}>
                          <div>
                            <span className="font-display text-sm" style={{ color: "var(--black)" }}>
                              {language === "zh" ? rt.nameZh : rt.name}
                            </span>
                            {rt.sqft && (
                              <span className="ml-2 text-[10px]" style={{ color: "var(--mid)" }}>
                                {rt.sqft} sqft
                              </span>
                            )}
                          </div>
                          <span className="font-display text-sm" style={{ color: apt.accentColor }}>
                            ${rt.priceFrom.toLocaleString()}{rt.priceTo ? `–$${rt.priceTo.toLocaleString()}` : "+"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Amenities */}
                  <div className="border-b-[3px] border-[var(--black)] p-4">
                    <p className="font-display text-[10px] tracking-[0.15em] mb-2" style={{ color: "var(--mid)" }}>
                      {language === "zh" ? "设施配套" : "AMENITIES"}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {apt.amenities.map((am) => (
                        <span key={am} className="border border-[var(--black)] px-2 py-0.5 text-[10px] uppercase tracking-wider" style={{ background: "white", color: "var(--black)" }}>
                          {am}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="border-b-[3px] border-[var(--black)] p-4">
                    <p className="text-[13px] leading-6" style={{ color: "var(--mid)" }}>
                      {apt.descriptionZh}
                    </p>
                  </div>

                  {/* CTA */}
                  <div className="mt-auto grid grid-cols-2">
                    <a
                      href={apt.bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center border-r-[3px] border-[var(--black)] px-4 py-4 font-display text-[12px] tracking-[0.1em] text-white transition-opacity hover:opacity-85"
                      style={{ background: apt.accentColor }}
                    >
                      {language === "zh" ? "预约看房" : "SCHEDULE TOUR"}
                    </a>
                    <a
                      href={apt.bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center px-4 py-4 font-display text-[12px] tracking-[0.1em] transition-colors hover:bg-[var(--gold)]"
                      style={{ color: "var(--black)", background: "var(--cream)" }}
                    >
                      {language === "zh" ? "查看官网 →" : "VISIT SITE →"}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="mt-5 flex items-center gap-3">
              <VoteButtons key={apt.id} aptId={apt.id} language={language} />
            </div>
            <div className="mt-3 flex items-center gap-3 pb-6">
              <button type="button" onClick={() => navigate(-1)} disabled={filtered.length <= 1} className="brutal-btn brutal-btn-ghost px-4 py-2 text-sm disabled:opacity-30">
                ← {language === "zh" ? "上一个" : "PREV"}
              </button>
              <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 overflow-x-auto">
                {filtered.map((a, i) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => { if (!transitioning) { setTransitioning(true); setImgError(false); setTimeout(() => { setCurrent(i); setTransitioning(false); }, 180); } }}
                    className="shrink-0 border-[2px] border-[var(--black)] transition-all"
                    style={{ width: i === current ? 24 : 10, height: 10, background: i === current ? apt.accentColor : "var(--beige)" }}
                  />
                ))}
              </div>
              <span className="font-display text-xs tracking-[0.1em] shrink-0" style={{ color: "var(--mid)" }}>
                {current + 1} / {filtered.length}
              </span>
              <button type="button" onClick={() => navigate(1)} disabled={filtered.length <= 1} className="brutal-btn brutal-btn-primary px-4 py-2 text-sm disabled:opacity-30">
                {language === "zh" ? "下一个" : "NEXT"} →
              </button>
            </div>
          </div>

          {/* Comments */}
          <CommentsSection key={apt.id} aptId={apt.id} seeds={apt.redditSeeds} language={language} />
        </>
      )}

      {/* Dynamic Vote Leaderboard */}
      <DynamicLeaderboard language={language} />

      {/* Marquee */}
      <div className="overflow-hidden border-y-[3px] border-[var(--black)]" style={{ background: "var(--cardinal)", color: "white" }}>
        <div className="marquee-track py-2">
          {[0, 1].map((n) => (
            <span key={n} className="whitespace-nowrap px-4 font-display text-sm tracking-[0.15em]">
              {["好公寓", "South Park", "DTLA", "Koreatown", "USC周边精选", "BIA", "Find Your Home"].join("  //  ")}{"  //  "}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t-[3px] border-[var(--black)] px-6 py-6 text-center">
        <p className="font-display text-xs tracking-[0.2em]" style={{ color: "var(--mid)" }}>
          {language === "zh" ? "BIA 好公寓 — 洛杉矶精选住房推荐" : "BIA TOP APARTMENTS — CURATED LA HOUSING"}
        </p>
      </footer>
      </>
    </VoteTalliesProvider>
  );
}

export default function ApartmentsPage() {
  return (
    <Suspense>
      <ProductShell group="housing" page="apartments">
        {({ language }) => <ApartmentsContent language={language} />}
      </ProductShell>
    </Suspense>
  );
}
