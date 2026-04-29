'use client';

import Link from "next/link";
import DynamicText from "@/app/components/DynamicText";
import { useTranslation } from "@/app/contexts/TranslationContext";
import { ArrowRight, ArrowLeft } from "lucide-react";
import BlogImageWithLoader from "@/app/components/BlogImageWithLoader";

const BASE_URL = "https://keepersport.store/storage/";

function getImageUrl(img) {
  if (!img) return "";
  const path = typeof img === "string" ? img : img.url || img.src || "";
  return path.startsWith("http") ? path : `${BASE_URL}${path}`;
}

const blogBodyClass =
  "max-w-3xl mx-auto px-4 sm:px-6 py-8 text-neutral-200 leading-relaxed " +
  "[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-6 [&_h1]:text-white " +
  "[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-white " +
  "[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-white " +
  "[&_p]:mb-4 [&_p]:text-neutral-300 " +
  "[&_a]:text-yellow-400 [&_a]:underline hover:[&_a]:text-yellow-300 " +
  "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 " +
  "[&_li]:mb-1 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-4 " +
  "[&_blockquote]:border-l-4 [&_blockquote]:border-amber-500/60 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4 " +
  "[&_table]:w-full [&_table]:text-sm [&_th]:border [&_th]:border-gray-600 [&_th]:p-2 [&_td]:border [&_td]:border-gray-600 [&_td]:p-2";

export default function BlogDetailClient({ blog = null, error = null }) {
  const { t, lang } = useTranslation();

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-red-400">{error}</p>
        <Link href="/blogs" className="text-yellow-400 hover:underline">
          {t("Back to blogs")}
        </Link>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-gray-400">{t("Blog not found")}</p>
        <Link href="/blogs" className="text-yellow-400 hover:underline">
          {t("Back to blogs")}
        </Link>
      </div>
    );
  }

  const imageUrl = getImageUrl(blog.image);
  const BackIcon = lang === "ar" ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 pb-12">
        <Link
          href="/blogs"
          className="inline-flex items-center gap-2 text-sm text-yellow-400 hover:text-yellow-300 mb-6"
        >
          <BackIcon className="w-4 h-4" aria-hidden />
          {t("Back to blogs")}
        </Link>

        {imageUrl ? (
          <div className="relative w-full aspect-[21/9] max-h-[420px] min-h-[160px] overflow-hidden rounded-xl bg-neutral-900 mb-8">
            <BlogImageWithLoader
              src={imageUrl}
              alt={blog.title || ""}
              className="object-cover object-center"
              sizes="(max-width: 768px) 100vw, 896px"
              priority
            />
          </div>
        ) : null}

        <header className="mb-8 border-b border-neutral-800 pb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            <DynamicText>{blog.title}</DynamicText>
          </h1>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-neutral-400">
            {blog.author_name ? (
              <span>
                <span className="text-neutral-500">{t("Author")}: </span>
                <DynamicText>{blog.author_name}</DynamicText>
              </span>
            ) : null}
            {blog.date ? <span className="text-neutral-500">{blog.date}</span> : null}
          </div>
        </header>

        <article
          className={blogBodyClass}
          dangerouslySetInnerHTML={{ __html: blog.description || "" }}
        />
      </div>
    </div>
  );
}
