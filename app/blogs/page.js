"use client";

import { useEffect, useState } from "react";
import { graphqlClient } from "../lib/graphqlClient";
import { GET_BLOGS_QUERY } from "../lib/queries";
import Image from "next/image";
import Link from "next/link";
import Loader from "../Componants/Loader";
import { motion } from "framer-motion";

const BASE_URL = "https://keepersport.store/storage/";

export default function BlogsPage() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchBlogs() {
      try {
        const data = await graphqlClient.request(GET_BLOGS_QUERY);
        setBlogs(data.blogs || []);
      } catch (err) {
        console.error("❌ Error fetching blogs:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchBlogs();
  }, []);

  const getImageUrl = (img) => {
    if (!img) return "";
    let path = typeof img === "string" ? img : img.url || img.src || "";
    return path.startsWith("http") ? path : `${BASE_URL}${path}`;
  };

  if (loading) return <Loader />;

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
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            المدونات
          </h1>
          <p className="text-gray-400 text-lg">
            اكتشف آخر الأخبار والمقالات
          </p>
        </motion.div>

        {/* Blogs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {blogs.map((blog, idx) => {
            const imageUrl = getImageUrl(blog.image);
            // const blogLink = blog.link || "#";

            return (
              <motion.div
                key={blog.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="group"
              >
                <div
                  // href={blogLink}
                  // target={blogLink.startsWith("http") ? "_blank" : undefined}
                  // rel={blogLink.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="block h-full"
                >
                  <div className="bg-[#1a1a1a] hover:bg-[#2a2a2a] rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 h-full flex flex-col">
                    {/* Image */}
                    <div className="relative w-full aspect-[16/9] overflow-hidden">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={blog.title || "Blog Image"}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                          <span className="text-gray-500">No Image</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 sm:p-6 flex-1 flex flex-col">
                      {/* Title */}
                      {blog.title && (
                        <h2 className="text-xl sm:text-2xl font-bold mb-3 line-clamp-2 group-hover:text-yellow-400 transition-colors duration-300">
                          {blog.title}
                        </h2>
                      )}

                      {/* Description */}
                      {blog.description && (
                        <div 
                          className="text-gray-400 text-sm sm:text-base line-clamp-3 mb-4 flex-1"
                          dangerouslySetInnerHTML={{ __html: blog.description }}
                        />
                      )}

                      {/* Read More Link */}
                      <div className="mt-auto pt-4 border-t border-gray-700">
                        <span className="text-yellow-400 text-sm font-semibold group-hover:text-yellow-300 transition-colors duration-300">
                          اقرأ المزيد →
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

