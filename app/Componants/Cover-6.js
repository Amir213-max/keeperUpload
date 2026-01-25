'use client'
import { useTranslation } from "../contexts/TranslationContext";

export default function Cover_6() {
  const { t, lang } = useTranslation();

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto px-4 py-6">

      {/* الصورة الأولى */}
      <div className="w-full h-80 bg-[url('/assets/joinNow.webp')] bg-cover bg-center  shadow" />

      {/* الأزرار */}
      <div className="flex flex-col sm:flex-row gap-4 w-full">
        <button className="p-4 bg-red-600 text-white font-semibold  w-full sm:w-1/2">
          {t("goin")}
        </button>
        <button className="p-4 bg-red-600 text-white font-semibold  w-full sm:w-1/2">
          {t("goin")}
        </button>
      </div>

      {/* الصورة الثانية */}
      <div className="w-full h-96 bg-[url('/assets/alison.webp')] bg-cover bg-center shadow" />
      
    </div>
  );
}
