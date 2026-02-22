'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/20/solid';
import { useTranslation } from '../contexts/TranslationContext';
import DynamicText from '../components/DynamicText';
import { Splide, SplideSlide } from '@splidejs/react-splide';
import '@splidejs/react-splide/css';

export default function FilterDropdown({ attributeValues, onFilterChange, initialFilters = {} }) {
  const [selectedFilters, setSelectedFilters] = useState(initialFilters);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showAllFilters, setShowAllFilters] = useState(false);
  const { t, lang } = useTranslation();
  const isRTL = lang === 'ar';

  // 🔹 مزامنة selectedFilters مع initialFilters من URL
  useEffect(() => {
    if (initialFilters && Object.keys(initialFilters).length > 0) {
      setSelectedFilters(initialFilters);
    }
  }, [initialFilters]);

  // الفلترة تحدث فوراً عند اختيار القيم
  useEffect(() => {
    onFilterChange(selectedFilters);
  }, [selectedFilters, onFilterChange]);

  // على الديسكتوب، نعرض 4 فلاتر فقط في البداية
  const visibleFilters = showAllFilters ? attributeValues : attributeValues.slice(0, 4);
  const hasMoreFilters = attributeValues.length > 4;

  return (
    <div className="space-y-4  w-full">
      {/* Desktop View - Flex Wrap */}
      <div className="hidden md:flex flex-wrap gap-2 items-center">
        {visibleFilters.map(({ attribute, values }) => (
          <Dropdown
            key={attribute}
            attribute={attribute}
            values={values}
            selected={selectedFilters[attribute] || []}
            onChange={(newSelected) => {
              setSelectedFilters((prev) => ({
                ...prev,
                [attribute]: newSelected,
              }));
            }}
          />
        ))}
        {hasMoreFilters && !showAllFilters && (
          <button
            onClick={() => setShowAllFilters(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-700 hover:bg-gray-800 border border-gray-600 shadow hover:shadow-md focus:outline-none  transition-all"
          >
            {t("More Filters")} {attributeValues.length - 4}
          </button>
        )}
        {showAllFilters && hasMoreFilters && (
          <button
            onClick={() => setShowAllFilters(false)}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-700 hover:bg-gray-800 border border-gray-600 shadow hover:shadow-md focus:outline-none  transition-all"
          >
            {t("Show Less")}
          </button>
        )}
      </div>

      {/* Mobile View - Slider */}
      <div className="md:hidden relative my-6 px-0">
        <Splide
          options={{
            type: 'loop',
            autoWidth: true,
            perMove: 1,
            gap: '.5rem',
            pagination: false,
            arrows: false,
            direction: isRTL ? 'rtl' : 'ltr',
          }}
          aria-label="Filter attributes"
          className="w-full"
        >
          {attributeValues.map(({ attribute, values }) => (
            <SplideSlide
              key={attribute}
              className="p-0 m-0 flex justify-center items-center"
            >
              <button
                onClick={() => {
                  setOpenDropdown(openDropdown === attribute ? null : attribute);
                }}
                className={`inline-flex items-center justify-center gap-1.5
                  text-sm font-semibold
                  px-5 py-2.5 cursor-pointer
                  transition-all duration-300 ease-in-out
                  whitespace-nowrap w-fit
                  
                  ${
                    openDropdown === attribute
                      ? 'bg-gradient-to-r text-white from-gray-400 to-gray-500 shadow-lg transform scale-105'
                      : 'bg-white text-gray-700 shadow-md hover:shadow-lg hover:bg-gray-50'
                  }`}
              >
                <span>{attribute} {selectedFilters[attribute]?.length > 0 && `(${selectedFilters[attribute].length})`}</span>
                <ChevronDownIcon 
                  className={`w-4 h-4 transition-transform duration-200 ${
                    openDropdown === attribute ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </SplideSlide>
          ))}
        </Splide>

        {/* Dropdown Content for Mobile */}
        {openDropdown && (
          <div className="mt-4 bg-white border border-gray-200 shadow-lg  p-4 z-50">
            <Dropdown
              attribute={openDropdown}
              values={attributeValues.find(a => a.attribute === openDropdown)?.values || []}
              selected={selectedFilters[openDropdown] || []}
              onChange={(newSelected) => {
                setSelectedFilters((prev) => ({
                  ...prev,
                  [openDropdown]: newSelected,
                }));
              }}
              isMobile={true}
              onClose={() => setOpenDropdown(null)}
            />
          </div>
        )}

        {/* تخصيص تصميم السلايدر */}
        <style jsx>{`
          .splide__track {
            overflow: hidden !important;
          }

          .splide {
            overflow: hidden !important;
            width: 100% !important;
          }

          .splide__container {
            overflow: hidden !important;
            width: 100% !important;
          }

          .splide__list {
            display: flex !important;
            width: fit-content !important;
          }

          .splide__slide {
            max-width: fit-content !important;
            flex-shrink: 0 !important;
            width: auto !important;
          }
        `}</style>
      </div>
    </div>
  );
}

function Dropdown({ attribute, values, selected, onChange, isMobile = false, onClose }) {
  const { t } = useTranslation();
  const [tempSelected, setTempSelected] = useState(selected);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setTempSelected(selected);
  }, [selected]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        if (isMobile && onClose) {
          onClose();
        }
        setTempSelected(selected);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [selected, isMobile, onClose])
  const toggleOption = (value) => {
    const updated = tempSelected.includes(value)
      ? tempSelected.filter((v) => v !== value)
      : [...tempSelected, value];
    setTempSelected(updated);
    onChange(updated);
  };

  const confirmSelection = () => {
    setTempSelected(tempSelected);
    if (isMobile && onClose) {
      onClose();
    }
  };

  // على الموبايل، نعرض القائمة مباشرة بدون dropdown
  if (isMobile) {
    return (
      <div ref={dropdownRef} className="w-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">
            <DynamicText>{attribute}</DynamicText>
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          )}
        </div>
        <div className="space-y-2 text-gray-800 text-sm max-h-64 overflow-y-auto">
          {values.map((value) => (
            <label
              key={value}
              className="flex items-center justify-between cursor-pointer hover:bg-gray-100 px-2 py-1 "
            >
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={tempSelected.includes(value)}
                  onChange={() => toggleOption(value)}
                  className="accent-blue-600"
                />
                <span><DynamicText>{value}</DynamicText></span>
              </div>
              {tempSelected.includes(value) && <CheckIcon className="w-4 h-4 text-blue-600" />}
            </label>
          ))}
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={confirmSelection}
            className="px-3 py-1 text-sm bg-black text-white hover:bg-gray-900 transition "
          >
            {t("Done ✔")}
          </button>
        </div>
      </div>
    );
  }

  // على Desktop، نعرض dropdown عادي
  const [isOpen, setIsOpen] = useState(false);

  // إغلاق الـ Dropdown عند الضغط خارجها
  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setIsOpen(false);
          setTempSelected(selected);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [isOpen, selected]);

  return (
    <>
      {/* Backdrop */}
        {isOpen && (
          <div 
            className="fixed inset-0 bg-black/30 z-[99]"
            onClick={() => {
              setIsOpen(false);
              setTempSelected(selected);
            }}
          />
        )}

      <div className="relative w-full sm:w-64 md:w-48" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex justify-between items-center cursor-pointer px-3 py-2 text-sm text-neutral-700 font-medium bg-white border border-gray-300 shadow hover:bg-gray-50 focus:outline-none "
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span>
            <DynamicText>{attribute}</DynamicText> {selected.length > 0 && `(${selected.length})`}
          </span>
          <ChevronDownIcon
            className={`w-5 h-5 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div className="absolute mt-2 w-full bg-white border border-gray-300 shadow-xl z-[100] max-h-80 overflow-y-auto">
            <div className="p-2 space-y-1 text-gray-800 text-sm">
              {values.map((value) => (
                <label
                  key={value}
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 px-3 py-2  transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={tempSelected.includes(value)}
                      onChange={() => toggleOption(value)}
                      className="accent-blue-600"
                    />
                    <span><DynamicText>{value}</DynamicText></span>
                  </div>
                  {tempSelected.includes(value) && <CheckIcon className="w-4 h-4 text-blue-600" />}
                </label>
              ))}

              <div className="flex justify-end mt-3 pt-3 border-t border-gray-200">
                <button
                  onClick={() => {
                    confirmSelection();
                    setIsOpen(false);
                  }}
                  className="px-4 py-2 text-sm font-medium bg-black text-white hover:bg-gray-800 transition "
                >
                  {t("Done ✔")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
