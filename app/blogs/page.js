import { graphqlClient } from "../lib/graphqlClient";
import { GET_BLOGS_QUERY } from "../lib/queries";
import BlogsPageClient from "./BlogsPageClient";

export const revalidate = 120;

export default async function BlogsPage() {
  try {
    const data = await graphqlClient.request(GET_BLOGS_QUERY);
    return <BlogsPageClient blogs={data?.blogs || []} />;
  } catch (error) {
    return <BlogsPageClient blogs={[]} error={error?.message || "Failed to load blogs"} />;
  }
}
