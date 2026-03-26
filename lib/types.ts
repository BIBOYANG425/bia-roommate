export interface RoommateProfile {
  id: string
  name: string
  school: string | null
  gender: '男' | '女' | '非二元' | '其他' | '不愿透露' | null
  major: string | null
  year: '新生' | '大一' | '大二' | '大三' | '大四' | '研究生' | null
  enrollment_term: 'Spring' | 'Fall' | null
  contact: string
  sleep_habit: string | null
  clean_level: '随意' | '一般' | '较整洁' | '超级整洁' | null
  noise_level: '要绝对安静' | '偏安静' | '无所谓' | '热闹都行' | null
  music_habit: '只戴耳机' | '偶尔外放' | '经常外放' | '无所谓' | null
  study_style: '图书馆' | '自习室' | '宿舍' | '随心' | null
  hobbies: string | null
  tags: string[] | null
  bio: string | null
  created_at: string
}

export const VALID_TAGS = [
  '早起鸟', '夜猫子', '爱整洁', '随意派', '宅家型', '社交达人',
  '爱运动', '爱音乐', '爱读书', '常做饭', '不吸烟', '不饮酒',
  '养宠物', '游戏玩家', '偶尔带客', '素食主义',
] as const

export const SLEEP_OPTIONS = ['22点前', '23点左右', '0点后', '凌晨2点+'] as const
export const CLEAN_OPTIONS = ['随意', '一般', '较整洁', '超级整洁'] as const
export const NOISE_OPTIONS = ['要绝对安静', '偏安静', '无所谓', '热闹都行'] as const
export const MUSIC_OPTIONS = ['只戴耳机', '偶尔外放', '经常外放', '无所谓'] as const
export const STUDY_OPTIONS = ['图书馆', '自习室', '宿舍', '随心'] as const
export const GENDER_OPTIONS = ['男', '女', '非二元', '其他', '不愿透露'] as const
export const YEAR_OPTIONS = ['新生', '大一', '大二', '大三', '大四', '研究生'] as const
export const ENROLLMENT_OPTIONS = ['Spring', 'Fall'] as const
export const SCHOOL_OPTIONS = ['USC', 'UC Berkeley'] as const
