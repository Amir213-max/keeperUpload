import { graphqlClient } from "@/app/lib/graphqlClient";
import { GET_BLOG_BY_ID } from "@/app/lib/queries";
import BlogDetailClient from "./BlogDetailClient";

export const revalidate = 120;

export default async function BlogDetailPage({ params }) {
  const id = params?.id;
  if (!id) return <BlogDetailClient blog={null} error={"Invalid blog id"} />;
  try {
    const data = await graphqlClient.request(GET_BLOG_BY_ID, { id: String(id) });
    return <BlogDetailClient blog={data?.blog || null} />;
  } catch (error) {
    return <BlogDetailClient blog={null} error={error?.message || "Failed to load blog"} />;
  }
}
