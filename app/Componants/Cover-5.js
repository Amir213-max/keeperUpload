'use client'
import { useTranslation } from "../contexts/TranslationContext";

export default function Cover_5() {
  const { t, lang } = useTranslation();

  return (
    <div key={lang} className="w-full flex flex-col md:flex-row p-4 gap-6 justify-center items-center mx-auto">

      {/* العنصر الأول */}
      <div className="w-full md:w-1/2 flex flex-col items-center">
        <div
          className="w-full h-80 bg-[url('/assets/cover-5.webp')] bg-center bg-cover rounded"
        ></div>
        <h2 className="font-bold text-2xl sm:text-3xl mt-4 text-center">
          {t("REUSCH ATTRAKT CARBON")}
        </h2>
      </div>

      {/* العنصر الثاني */}
      <div className="w-full md:w-1/2 flex flex-col items-center">
        <div
          className="w-full h-80 bg-[url('/assets/cover-5..webp')] bg-center bg-cover rounded"
        ></div>
        <h2 className="font-bold text-2xl sm:text-3xl mt-4 text-center">
          {t("REUSCH ATTRAKT CARBON")}
        </h2>
      </div>
      
    </div>
  );
}
