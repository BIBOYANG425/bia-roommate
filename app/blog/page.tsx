import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import BlogIndex from "@/components/BlogIndex";
import { getPublishedArticles } from "@/lib/articles";

// Render at request time so CI's placeholder Supabase env doesn't trip
// build-time prerender. Production response is still cheap (one anon
// query) and the public client memoizes the connection.
export const dynamic = "force-dynamic";

export default async function BlogIndexPage() {
  const articles = await getPublishedArticles();

  return (
    <div className="relative min-h-screen bg-[#F9FAF7] text-[#171717] overflow-x-hidden font-sans">
      <SiteNav />
      <BlogIndex articles={articles} />
      <SiteFooter />
    </div>
  );
}
