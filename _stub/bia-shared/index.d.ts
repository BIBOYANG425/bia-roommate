import type { ComponentType } from "react";

export interface Article {
  id: string;
  slug: string;
  title: string;
  html_clean: string;
  excerpt: string | null;
  cover_image_url: string | null;
  language: string;
  tags: string[] | null;
  author_id: string | null;
  status: string;
  submitted_at: string | null;
  submitted_by: string | null;
  published_at: string | null;
  published_by: string | null;
  unpublished_at: string | null;
  unpublished_by: string | null;
  created_at: string;
  updated_at: string;
}

export declare const ArticleRenderer: ComponentType<{ html: string; className?: string }>;
