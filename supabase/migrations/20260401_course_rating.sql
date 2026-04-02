-- Course Rating System: 3 tables, trigger, indexes, RLS policies
-- Apply via Supabase dashboard SQL editor or supabase db push

-- ─── Table: course_reviews ───
CREATE TABLE course_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dept text NOT NULL,
  course_number text NOT NULL,
  professor text,
  term text NOT NULL,
  difficulty int NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  workload int NOT NULL CHECK (workload BETWEEN 1 AND 5),
  grading int NOT NULL CHECK (grading BETWEEN 1 AND 5),
  gpa text,
  comment text NOT NULL CHECK (char_length(comment) BETWEEN 10 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_review_per_term UNIQUE (user_id, dept, course_number, term)
);

CREATE INDEX idx_course_reviews_course ON course_reviews (dept, course_number);
CREATE INDEX idx_course_reviews_professor ON course_reviews (dept, course_number, professor);

-- ─── Table: course_rating_aggregates ───
CREATE TABLE course_rating_aggregates (
  dept text NOT NULL,
  course_number text NOT NULL,
  review_count int NOT NULL DEFAULT 0,
  avg_difficulty numeric(3,2) NOT NULL DEFAULT 0,
  avg_workload numeric(3,2) NOT NULL DEFAULT 0,
  avg_grading numeric(3,2) NOT NULL DEFAULT 0,
  professors text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dept, course_number)
);

-- ─── Table: course_lists ───
CREATE TABLE course_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  display_order int NOT NULL DEFAULT 0,
  courses jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Trigger: refresh_course_aggregates ───
CREATE OR REPLACE FUNCTION refresh_course_aggregates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dept text;
  v_number text;
  v_count int;
BEGIN
  -- On UPDATE where dept/course_number changed, refresh the OLD course first
  IF TG_OP = 'UPDATE'
    AND (OLD.dept IS DISTINCT FROM NEW.dept OR OLD.course_number IS DISTINCT FROM NEW.course_number)
  THEN
    SELECT count(*) INTO v_count
    FROM course_reviews
    WHERE dept = OLD.dept AND course_number = OLD.course_number;

    IF v_count = 0 THEN
      DELETE FROM course_rating_aggregates
      WHERE dept = OLD.dept AND course_number = OLD.course_number;
    ELSE
      INSERT INTO course_rating_aggregates (dept, course_number, review_count, avg_difficulty, avg_workload, avg_grading, professors, updated_at)
      SELECT OLD.dept, OLD.course_number, count(*),
        round(avg(difficulty), 2), round(avg(workload), 2), round(avg(grading), 2),
        COALESCE(array_agg(DISTINCT professor) FILTER (WHERE professor IS NOT NULL AND professor <> ''), '{}'),
        now()
      FROM course_reviews WHERE dept = OLD.dept AND course_number = OLD.course_number
      ON CONFLICT (dept, course_number) DO UPDATE SET
        review_count = EXCLUDED.review_count, avg_difficulty = EXCLUDED.avg_difficulty,
        avg_workload = EXCLUDED.avg_workload, avg_grading = EXCLUDED.avg_grading,
        professors = EXCLUDED.professors, updated_at = EXCLUDED.updated_at;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_dept := OLD.dept;
    v_number := OLD.course_number;
  ELSE
    v_dept := NEW.dept;
    v_number := NEW.course_number;
  END IF;

  SELECT count(*) INTO v_count
  FROM course_reviews
  WHERE dept = v_dept AND course_number = v_number;

  IF v_count = 0 THEN
    DELETE FROM course_rating_aggregates
    WHERE dept = v_dept AND course_number = v_number;
  ELSE
    INSERT INTO course_rating_aggregates (dept, course_number, review_count, avg_difficulty, avg_workload, avg_grading, professors, updated_at)
    SELECT
      v_dept, v_number, count(*),
      round(avg(difficulty), 2),
      round(avg(workload), 2),
      round(avg(grading), 2),
      COALESCE(array_agg(DISTINCT professor) FILTER (WHERE professor IS NOT NULL AND professor <> ''), '{}'),
      now()
    FROM course_reviews
    WHERE dept = v_dept AND course_number = v_number
    ON CONFLICT (dept, course_number) DO UPDATE SET
      review_count = EXCLUDED.review_count,
      avg_difficulty = EXCLUDED.avg_difficulty,
      avg_workload = EXCLUDED.avg_workload,
      avg_grading = EXCLUDED.avg_grading,
      professors = EXCLUDED.professors,
      updated_at = EXCLUDED.updated_at;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_refresh_course_aggregates
  AFTER INSERT OR UPDATE OR DELETE ON course_reviews
  FOR EACH ROW
  EXECUTE FUNCTION refresh_course_aggregates();

-- ─── RLS Policies ───
ALTER TABLE course_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_rating_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lists ENABLE ROW LEVEL SECURITY;

-- Public read on all three tables
CREATE POLICY "read_reviews" ON course_reviews FOR SELECT USING (true);
CREATE POLICY "read_aggregates" ON course_rating_aggregates FOR SELECT USING (true);
CREATE POLICY "read_lists" ON course_lists FOR SELECT USING (true);

-- Auth insert own reviews only
CREATE POLICY "insert_own_reviews" ON course_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update/delete own reviews only
CREATE POLICY "update_own_reviews" ON course_reviews FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "delete_own_reviews" ON course_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- No user write to aggregates (trigger handles via SECURITY DEFINER)
-- No user write to lists (admin only via Supabase dashboard)
