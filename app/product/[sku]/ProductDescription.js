'use client';

import { useTranslation } from "@/app/contexts/TranslationContext";
import { useState, useEffect, useMemo } from "react";
import DynamicText from "@/app/components/DynamicText";
import { isSizeLikeAttributeLabel } from "@/app/lib/variantMatch";

function buildDetailsRows(product) {
  const rows = product?.productAttributeValues;
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const filtered = rows.filter((v) => {
    const label = v?.attribute?.label;
    if (!label || !String(label).trim()) return false;
    if (isSizeLikeAttributeLabel(label)) return false;
    const key = v?.key;
    if (key == null || String(key).trim() === "") return false;
    return true;
  });

  const map = new Map();
  for (const v of filtered) {
    const label = String(v.attribute.label).trim();
    const val = String(v.key).trim();
    if (!map.has(label)) map.set(label, []);
    map.get(label).push(val);
  }

  return [...map.entries()].map(([label, keys]) => ({
    label,
    valuesText: [...new Set(keys)].join(", "),
  }));
}

export default function ProductDescription({ product }) {
  const { t, lang } = useTranslation();
  const [activeTab, setActiveTab] = useState("description");
  const [translatedDesc, setTranslatedDesc] = useState("");

  const detailRows = useMemo(() => buildDetailsRows(product), [product]);

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
      <div className="flex space-x-4 mb-4 border-b border-gray-200">
        <button
          type="button"
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
          type="button"
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

      {activeTab === "description" && (
        <div
          className="prose max-w-3xl p-4"
          dangerouslySetInnerHTML={{ __html: translatedDesc || "" }}
        />
      )}

      {activeTab === "details" && (
        <div className="max-w-3xl p-4 text-neutral-800">
          {detailRows.length === 0 ? (
            <p className="text-gray-500 text-sm">
              {t("No additional specifications")}
            </p>
          ) : (
            <ul className="list-disc pl-5 sm:pl-6 space-y-2 marker:text-neutral-800">
              {detailRows.map(({ label, valuesText }) => (
                <li key={label} className="leading-relaxed">
                  <span className="font-semibold text-neutral-900">
                    <DynamicText>{label}</DynamicText>
                  </span>
                  <span className="text-neutral-600">: </span>
                  <span className="text-neutral-800">
                    <DynamicText>{valuesText}</DynamicText>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
