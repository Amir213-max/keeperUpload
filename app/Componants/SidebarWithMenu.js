"use client";

import { useState } from "react";
import clsx from "clsx";
import { FaTimes, FaChevronDown } from "react-icons/fa";
import Link from "next/link";

export default function SidebarWithDropdown({ categoriesByPage, t, onSelectCategory }) {
  const [activeCategory, setActiveCategory] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  const parseName = (name) => {
    try {
      const parsed = JSON.parse(name);
      return parsed.en || parsed.ar || name;
    } catch {
      return name;
    }
  };

  const handleSelect = (catId) => {
    setActiveCategory(catId);
    onSelectCategory(catId);
    setSidebarOpen(false);
  };

  const mainPages = [
    { name: t('Goalkeeper Gloves'), href: '/GoalkeeperGloves' },
    { name: t('Football Boots'), href: '/FootballBoots' },
    { name: t('Goalkeeper Apparel'), href: '/Apparel' },
    { name: t('Goalkeeper Equipment'), href: '/Equipmen' },
    { name: t('Teamsport'), href: '/Teamsport' },
  ];

  return (
    <>
      {/* زر فتح الـ Drawer للشاشات الصغيرة */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-[110] p-2 bg-yellow-500   shadow-md lg:hidden"
      >
        {t("Menu")}
      </button>

      {/* Sidebar للشاشات الكبيرة */}
      <ul className="hidden lg:flex flex-col px-3 py-4 space-y-3 bg-black   shadow-sm w-64">
        {mainPages.map((page, idx) => (
          <li key={idx} className="relative">
            <Link
              href={page.href}
              className="flex items-center justify-between gap-3 p-4   cursor-pointer transition-all duration-300 text-white hover:bg-yellow-500"
              onClick={() => setOpenDropdown(openDropdown === idx ? null : idx)}
            >
              {page.name}
              <FaChevronDown className={clsx("transition-transform duration-300", openDropdown === idx && "rotate-180")} />
            </Link>

            {/* Dropdown للكاتيجوريات الخاصة بالصفحة */}
            {openDropdown === idx && categoriesByPage[page.href]?.length > 0 && (
              <ul className="ml-4 mt-1 bg-neutral-800  ">
                {categoriesByPage[page.href].map((cat) => (
                  <li key={cat.id}>
                    <div
                      onClick={() => handleSelect(cat.id)}
                      className={clsx(
                        "px-4 py-2 cursor-pointer hover:bg-yellow-500   transition-all",
                        activeCategory === cat.id ? "bg-yellow-500 text-black font-bold" : "text-white"
                      )}
                    >
                      {parseName(cat.name)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      {/* Drawer للشاشات الصغيرة */}
      <div
        className={clsx(
          "fixed top-0 right-0 h-full w-64 bg-neutral-900 shadow-lg z-[100] transition-transform duration-300 lg:hidden",
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <span className="text-xl font-bold text-white">{t("Menu")}</span>
          <button onClick={() => setSidebarOpen(false)}>
            <FaTimes size={24} className="text-white" />
          </button>
        </div>

        <ul className="flex flex-col gap-4 p-4 font-semibold text-white text-base">
          {mainPages.map((page, idx) => (
            <li key={idx} className="relative">
              <Link
                href={page.href}
                className="flex items-center justify-between gap-3 px-4 py-2   cursor-pointer hover:bg-yellow-500 transition-all"
                onClick={() => setOpenDropdown(openDropdown === idx ? null : idx)}
              >
                {page.name}
                <FaChevronDown className={clsx("transition-transform duration-300", openDropdown === idx && "rotate-180")} />
              </Link>

              {openDropdown === idx && categoriesByPage[page.href]?.length > 0 && (
                <ul className="ml-4 mt-1 bg-neutral-800  ">
                  {categoriesByPage[page.href].map((cat) => (
                    <li key={cat.id}>
                      <div
                        onClick={() => handleSelect(cat.id)}
                        className={clsx(
                          "px-4 py-2 cursor-pointer hover:bg-yellow-500   transition-all",
                          activeCategory === cat.id ? "bg-yellow-500 text-black font-bold" : "text-white"
                        )}
                      >
                        {parseName(cat.name)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
