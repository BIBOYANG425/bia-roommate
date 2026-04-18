export interface RoommateProfile {
  id: string;
  name: string;
  school: string | null;
  gender: "男" | "女" | "非二元" | "其他" | "不愿透露" | null;
  major: string | null;
  year: "新生" | "大一" | "大二" | "大三" | "大四" | "研究生" | null;
  enrollment_term: "Spring" | "Fall" | null;
  contact: string;
  sleep_habit: string | null;
  clean_level: "随意" | "一般" | "较整洁" | "超级整洁" | null;
  noise_level: "要绝对安静" | "偏安静" | "无所谓" | "热闹都行" | null;
  music_habit: "只戴耳机" | "偶尔外放" | "经常外放" | "无所谓" | null;
  study_style: "图书馆" | "自习室" | "宿舍" | "随心" | null;
  hobbies: string | null;
  tags: string[] | null;
  avatar_url: string | null;
  bio: string | null;
  visible: boolean;
  created_at: string;
}

export const VALID_TAGS = [
  "早起鸟",
  "夜猫子",
  "爱整洁",
  "随意派",
  "宅家型",
  "社交达人",
  "爱运动",
  "爱音乐",
  "爱读书",
  "常做饭",
  "不吸烟",
  "不饮酒",
  "养宠物",
  "游戏玩家",
  "偶尔带客",
  "素食主义",
] as const;

export const SLEEP_OPTIONS = [
  "22点前",
  "23点左右",
  "0点后",
  "凌晨2点+",
] as const;
export const CLEAN_OPTIONS = ["随意", "一般", "较整洁", "超级整洁"] as const;
export const NOISE_OPTIONS = [
  "要绝对安静",
  "偏安静",
  "无所谓",
  "热闹都行",
] as const;
export const MUSIC_OPTIONS = [
  "只戴耳机",
  "偶尔外放",
  "经常外放",
  "无所谓",
] as const;
export const STUDY_OPTIONS = ["图书馆", "自习室", "宿舍", "随心"] as const;
export const GENDER_OPTIONS = [
  "男",
  "女",
  "非二元",
  "其他",
  "不愿透露",
] as const;
export const YEAR_OPTIONS = [
  "新生",
  "大一",
  "大二",
  "大三",
  "大四",
  "研究生",
] as const;
export const ENROLLMENT_OPTIONS = ["Spring", "Fall"] as const;
export const SCHOOL_OPTIONS = ["USC", "UC Berkeley", "Stanford"] as const;

/* ── Sublet Listing (table: public.sublets) ── */

export interface SubletListing {
  id: string;
  title: string;
  apartment_name: string;
  address: string;
  school: string | null;
  rent: number;
  room_type: string | null;
  bathrooms: string | null;
  move_in_date: string | null;
  move_out_date: string | null;
  gender_preference: string | null;
  description: string | null;
  amenities: string[] | null;
  photos: string[] | null;
  contact: string;
  poster_name: string;
  user_id: string | null;
  student_id: string | null;
  status: "active" | "taken" | "expired";
  created_at: string;
}

export const ROOM_TYPE_OPTIONS = ["单间", "合租", "客厅隔断", "整套"] as const;
export const BATHROOM_OPTIONS = ["独卫", "共享"] as const;
export const GENDER_PREF_OPTIONS = ["限男生", "限女生", "男女不限"] as const;
/* ── Squad Post (找搭子) ── */

export interface SquadPost {
  id: string;
  user_id: string | null;
  poster_name: string;
  avatar_url: string | null;
  school: string | null;
  category: string;
  content: string;
  photos: string[] | null;
  location: string | null;
  max_people: number;
  current_people: number;
  deadline: string | null;
  gender_restriction: string;
  contact: string | null;
  created_at: string;
}

export const SQUAD_CATEGORIES = [
  "拼车",
  "自习",
  "约会",
  "健身",
  "游戏",
  "其它",
] as const;
export type SquadCategory = (typeof SQUAD_CATEGORIES)[number];
export const SQUAD_GENDER_OPTIONS = ["不限", "仅男生", "仅女生"] as const;

export const AMENITY_OPTIONS = [
  "健身房",
  "游泳池",
  "停车位",
  "洗衣机",
  "烘干机",
  "空调",
  "暖气",
  "阳台",
  "电梯",
  "WiFi",
  "门禁",
  "家具齐全",
  "允许宠物",
] as const;

/* ── Shipping / 集运 (tables: public.parcels, public.shipments, etc.) ── */

export const PARCEL_STATUS_VALUES = [
  "expected",
  "received_cn",
  "in_transit",
  "arrived_us",
  "picked_up",
  "lost",
  "returned",
  "disputed",
] as const;
export type ParcelStatus = (typeof PARCEL_STATUS_VALUES)[number];

export const SHIPMENT_STATUS_VALUES = [
  "forming",
  "sealed",
  "departed_cn",
  "customs",
  "arrived_us",
  "pickup_open",
  "pickup_closed",
  "archived",
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUS_VALUES)[number];

export const PARCEL_CATEGORY_OPTIONS = [
  "电子产品",
  "服饰",
  "食品",
  "日用品",
  "书籍",
  "其它",
] as const;
export type ParcelCategory = (typeof PARCEL_CATEGORY_OPTIONS)[number];

export const CN_CARRIER_OPTIONS = [
  "顺丰",
  "中通",
  "圆通",
  "韵达",
  "申通",
  "京东",
  "EMS",
  "其它",
] as const;

export interface Parcel {
  id: string;
  user_id: string | null;
  student_id: string | null;
  member_id: string;
  tracking_cn: string | null;
  carrier_cn: string | null;
  description: string;
  declared_value_cny: number | null;
  category: string | null;
  photos: string[];
  status: ParcelStatus;
  warehouse_id: string | null;
  shipment_id: string | null;
  received_at: string | null;
  weight_grams: number | null;
  dim_cm_l: number | null;
  dim_cm_w: number | null;
  dim_cm_h: number | null;
  notes: string | null;
  user_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParcelEvent {
  id: string;
  parcel_id: string;
  from_status: ParcelStatus | null;
  to_status: ParcelStatus;
  actor_user_id: string | null;
  actor_role: "user" | "admin" | "system" | null;
  note: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface Shipment {
  id: string;
  name: string;
  status: ShipmentStatus;
  carrier: string | null;
  international_tracking: string | null;
  departed_cn_at: string | null;
  arrived_us_at: string | null;
  pickup_location: string | null;
  pickup_starts_at: string | null;
  pickup_ends_at: string | null;
  price_per_kg_cents: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WarehouseAddress {
  id: string;
  code: string;
  display_name: string;
  recipient_template: string;
  street: string;
  city: string;
  province: string;
  postal_code: string;
  phone: string;
  active: boolean;
  notes: string | null;
}

/** Human-facing Chinese labels + styling intent per parcel status. */
export const PARCEL_STATUS_META: Record<
  ParcelStatus,
  { label: string; hint: string; tone: "pending" | "active" | "good" | "bad" }
> = {
  expected: {
    label: "待入库",
    hint: "仓库还没收到，发货后记得填跟踪号",
    tone: "pending",
  },
  received_cn: {
    label: "仓库签收",
    hint: "已签收并上架，等下一批国际段",
    tone: "active",
  },
  in_transit: {
    label: "国际段运输",
    hint: "正在飞往美国，一般 7-14 天",
    tone: "active",
  },
  arrived_us: {
    label: "到达美国",
    hint: "到了，等 BIA 安排取件",
    tone: "active",
  },
  picked_up: {
    label: "已取件",
    hint: "完成",
    tone: "good",
  },
  lost: {
    label: "丢失",
    hint: "联系 BIA 运营，我们跟进理赔",
    tone: "bad",
  },
  returned: {
    label: "退回",
    hint: "包裹被退回，查看备注",
    tone: "bad",
  },
  disputed: {
    label: "待核实",
    hint: "有问题需要沟通，BIA 会联系你",
    tone: "bad",
  },
};
