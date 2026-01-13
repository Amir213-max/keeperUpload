'use client';

import { useTranslation } from "@/app/contexts/TranslationContext";
import { useState, useEffect } from "react";

export default function ProductDescription({ product }) {
  const { t, lang } = useTranslation();
  const [activeTab, setActiveTab] = useState("description");
  const [translatedDesc, setTranslatedDesc] = useState("");

  // helper للكشف إذا فيه حروف عربية
  const hasArabic = (txt) => /[\u0600-\u06FF\u0750-\u077F]/.test(txt || "");

  useEffect(() => {
    let mounted = true;

    const translateIfNeeded = async () => {
      if (lang === "ar") {
        const arCandidate = product.description_ar || "";
        if (arCandidate.trim() && hasArabic(arCandidate)) {
          if (mounted) setTranslatedDesc(arCandidate);
          return;
        }

        const sourceText = product.description_en || product.description_ar || "";
        if (!sourceText.trim()) {
          if (mounted) setTranslatedDesc("");
          return;
        }

        try {
          // 👇 بدل ما تروح لـ LibreTranslate مباشر
          const res = await fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: sourceText,
              target: "ar",
            }),
          });

          const data = await res.json();
          const translated =
            data?.translatedText ??
            data?.translation ??
            data?.translated ??
            "";

          if (mounted) setTranslatedDesc(translated || sourceText);
        } catch (err) {
          console.error("Translation failed:", err);
          if (mounted) setTranslatedDesc(sourceText);
        }
      } else {
        const enCandidate = product.description_en || product.description_ar || "";
        if (mounted) setTranslatedDesc(enCandidate);
      }
    };

    translateIfNeeded();

    return () => {
      mounted = false;
    };
  }, [lang, product]);

  return (
    <div className="p-4 mt-4 bg-white rounded-2xl shadow-lg text-neutral-800 w-full">
      {/* tabs */}
      <div className="flex space-x-4 mb-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("description")}
          className={`py-2 px-4 font-semibold cursor-pointer ${
            activeTab === "description"
              ? "text-amber-500 border-b-2 border-amber-500"
              : "text-gray-500"
          }`}
        >
          {t("Description")}
        </button>
        <button
          onClick={() => setActiveTab("details")}
          className={`py-2 px-4 font-semibold cursor-pointer ${
            activeTab === "details"
              ? "text-amber-500 border-b-2 border-amber-500"
              : "text-gray-500"
          }`}
        >
          {t("Details")}
        </button>
      </div>

      {/* المحتوى */}
      <div
        className="prose max-w-3xl p-4"
        dangerouslySetInnerHTML={{ __html: translatedDesc || "" }}
      />
    </div>
  );
}