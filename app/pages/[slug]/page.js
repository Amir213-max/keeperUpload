'use client';

import { use } from 'react';
import { useState, useEffect } from 'react';
import { graphqlRequest } from '../../lib/graphqlClientHelper';
import { gql } from 'graphql-request';
import { useTranslation } from '../../contexts/TranslationContext'; // ✅ استخدام الـ context
import Loader from '../../Componants/Loader';

const GET_PAGE_BY_SLUG = gql`
  query GetPageBySlug($slug: String!) {
    pageBySlug(slug: $slug) {
      id
      slug
      name
      description_ar
      description_en
    }
  }
`;

export default function PageSlug({ params }) {
  const { slug } = use(params);
  const { lang } = useTranslation(); // ✅ اللغة من الـ context
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPage() {
      try {
        // Use API route proxy to avoid CORS issues
        const data = await graphqlRequest(GET_PAGE_BY_SLUG, { slug });
        setPage(data.pageBySlug);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchPage();
  }, [slug]);

  if (loading) return <Loader />;

  if (error)
    return (
      <div className="flex justify-center items-center h-[50vh] bg-black">
        <p className="text-red-500 text-lg">Error: {error}</p>
      </div>
    );

  if (!page)
    return (
      <div className="flex justify-center items-center h-[50vh] bg-black">
        <p className="text-gray-400 text-lg">Page not found.</p>
      </div>
    );

  // ✅ نحدد أي وصف نعرضه حسب اللغة
  const description =
    lang === 'ar' ? page.description_ar : page.description_en;

  // ✅ الاتجاه حسب اللغة
  const direction = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <div
      className={`min-h-screen bg-black text-white flex flex-col px-4 py-12 ${
        direction === 'rtl' ? 'text-right' : 'text-left'
      }`}
      dir={direction}
    >
     
<h1 className="text-3xl mx-7 font-bold mb-6 text-yellow-400 ">
      {page.name}
      </h1>
      <div
        className="prose prose-invert max-w-3xl mx-7 prose-headings:text-yellow-400 prose-a:text-yellow-400"
        
        dangerouslySetInnerHTML={{ __html: description }}
      />
       
    </div>
  );
}
