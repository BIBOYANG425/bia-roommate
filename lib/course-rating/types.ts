export interface CourseReview {
  id: string;
  dept: string;
  course_number: string;
  professor?: string;
  term?: string;
  difficulty: number;
  workload: number;
  grading: number;
  gpa?: string;
  comment: string;
  created_at: string;
  isOwn?: boolean;
}

export interface CourseAggregate {
  dept: string;
  course_number: string;
  review_count: number;
  avg_difficulty: number;
  avg_workload: number;
  avg_grading: number;
  professors: string[];
}

export interface CourseListItem {
  dept: string;
  number: string;
  title: string;
  units: string;
  geTag?: string;
}

export interface CourseList {
  id: string;
  slug: string;
  title: string;
  description?: string;
  display_order: number;
  courses: CourseListItem[];
}

export interface ReviewsResponse {
  reviews: CourseReview[];
  aggregate: CourseAggregate | null;
}

export interface AggregatesBatchResponse {
  aggregates: Record<string, CourseAggregate | null>;
}

export type CourseRankingSort =
  | "grading"
  | "recent"
  | "reviews"
  | "difficulty"
  | "workload";

export interface RankingsResponse {
  rows: CourseAggregate[];
  total: number;
  page: number;
  pageSize: number;
  sort: CourseRankingSort;
}
