'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslation } from "../contexts/TranslationContext";
import DynamicText from "../components/DynamicText";
import BlogImageWithLoader from "../components/BlogImageWithLoader";

const BASE_URL = "https://keepersport.store/storage/";

function getImageUrl(img) {
  if (!img) return "";
  const path = typeof img === "string" ? img : img.url || img.src || "";
  return path.startsWith("http") ? path : `${BASE_URL}${path}`;
}

export default function BlogsPageClient({ blogs = [], error = null }) {
  const { t } = useTranslation();

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] bg-black">
        <p className="text-red-500 text-lg">Error: {error}</p>
      </div>
    );
  }

  if (!blogs || blogs.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] bg-black">
        <p className="text-gray-400 text-lg">No blogs available.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            {t("Blogs") || "المدونات"}
          </h1>
          <p className="text-gray-400 text-lg">
            {t("Discover latest articles") || "اكتشف آخر الأخبار والمقالات"}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {blogs.map((blog, idx) => {
            const imageUrl = getImageUrl(blog.image);
            return (
              <motion.div
                key={blog.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.08 }}
                className="group"
              >
                <Link href={`/blogs/${blog.id}`} className="block h-full">
                  <div className="bg-[#1a1a1a] hover:bg-[#2a2a2a] rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 h-full flex flex-col">
                    <div className="relative w-full aspect-[16/9] overflow-hidden">
                      {imageUrl ? (
                        <BlogImageWithLoader
                          src={imageUrl}
                          alt={blog.title || "Blog Image"}
                          className="object-cover group-hover:scale-110"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                          <span className="text-gray-500">No Image</span>
                        </div>
                      )}
                    </div>

                    <div className="p-4 sm:p-6 flex-1 flex flex-col">
                      {blog.title ? (
                        <h2 className="text-xl sm:text-2xl font-bold mb-2 line-clamp-2 group-hover:text-yellow-400 transition-colors duration-300">
                          <DynamicText>{blog.title}</DynamicText>
                        </h2>
                      ) : null}
                      {blog.author_name ? (
                        <p className="text-gray-500 text-sm mb-2">
                          <span className="text-gray-600">{t("Author")}: </span>
                          <DynamicText>{blog.author_name}</DynamicText>
                          {blog.date ? <span className="text-gray-600"> · {blog.date}</span> : null}
                        </p>
                      ) : null}
                      {blog.description ? (
                        <div
                          className="text-gray-400 text-sm sm:text-base line-clamp-3 mb-4 flex-1 [&_p]:m-0 [&_*]:text-inherit"
                          dangerouslySetInnerHTML={{ __html: blog.description }}
                        />
                      ) : null}

                      <div className="mt-auto pt-4 border-t border-gray-700">
                        <span className="text-yellow-400 text-sm font-semibold group-hover:text-yellow-300 transition-colors duration-300">
                          {t("Read More") || "اقرأ المزيد"} →
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
