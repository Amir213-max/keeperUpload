'use client';

import { use, useMemo } from 'react';
import { useState, useEffect } from 'react';
import { graphqlRequest } from '../../lib/graphqlClientHelper';
import { gql } from 'graphql-request';
import { useTranslation } from '../../contexts/TranslationContext'; // ✅ استخدام الـ context
import Loader from '../../Componants/Loader';
import { rewriteCmsHtmlMediaUrls } from '../../lib/cmsPageHtml';

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

  // Hooks must run before any early return (same order every render).
  const htmlWithAbsoluteMedia = useMemo(() => {
    if (!page) return '';
    const description =
      lang === 'ar' ? page.description_ar : page.description_en;
    return rewriteCmsHtmlMediaUrls(description || '');
  }, [page, lang]);

  const direction = lang === 'ar' ? 'rtl' : 'ltr';

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

  return (
    <div
      className={`min-h-screen bg-neutral-950 text-neutral-100 ${
        direction === 'rtl' ? 'text-right' : 'text-left'
      }`}
      dir={direction}
    >
      <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="mb-8 text-3xl font-bold tracking-tight text-amber-400 sm:text-4xl">
          {page.name}
        </h1>
        <div
          className={[
            'cms-page-html prose prose-invert max-w-none',
            'prose-headings:text-amber-100 prose-p:text-neutral-200 prose-li:text-neutral-200',
            'prose-a:text-amber-400 prose-a:underline prose-a:decoration-amber-400/60 hover:prose-a:text-amber-300',
            'prose-strong:text-white prose-blockquote:border-amber-500/40 prose-blockquote:text-neutral-300',
            'prose-img:mx-auto prose-img:rounded-lg prose-img:shadow-lg prose-img:max-w-full',
            'prose-hr:border-neutral-700',
            'prose-table:block prose-table:w-full prose-table:overflow-x-auto',
            'prose-th:border prose-th:border-neutral-600 prose-td:border prose-td:border-neutral-700',
            'prose-pre:bg-neutral-900 prose-pre:text-neutral-100',
            'break-words [word-break:break-word]',
          ].join(' ')}
          dangerouslySetInnerHTML={{ __html: htmlWithAbsoluteMedia }}
        />
      </article>
    </div>
  );
}
