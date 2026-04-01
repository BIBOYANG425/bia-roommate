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

/* ── Sublet Listing ── */

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
  created_at: string;
}

export const ROOM_TYPE_OPTIONS = ["单间", "合租", "客厅隔断", "整套"] as const;
export const BATHROOM_OPTIONS = ["独卫", "共享"] as const;
export const GENDER_PREF_OPTIONS = ["限男生", "限女生", "男女不限"] as const;
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
