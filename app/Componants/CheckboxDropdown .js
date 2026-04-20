'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
  // 🔹 تهيئة prevInitialFiltersRef بقيمة null في البداية لتجنب مشاكل التهيئة
  const prevInitialFiltersRef = useRef(null);
  const prevSelectedFiltersRef = useRef(null);
  const isUpdatingFromInitialRef = useRef(false);
  const hasMountedRef = useRef(false);

  // 🔹 مزامنة selectedFilters مع initialFilters
  // استخدام deep comparison للتحقق من التغييرات الفعلية
  useEffect(() => {
    // 🔹 تحويل initialFilters إلى string للمقارنة
    // استخدام JSON.stringify مع sorting للـ keys لضمان المقارنة الصحيحة
    const normalizeFilters = (filters) => {
      // 🔹 معالجة جميع الحالات: null, undefined, empty objects, arrays
      if (!filters || typeof filters !== 'object' || Array.isArray(filters)) {
        return '{}';
      }
      
      const sorted = Object.keys(filters).sort().reduce((acc, key) => {
        const value = filters[key];
        // 🔹 معالجة المصفوفات: ترتيبها وإزالة القيم الفارغة/null/undefined
        if (Array.isArray(value)) {
          const filteredArray = value.filter(v => v != null && v !== '');
          acc[key] = filteredArray.length > 0 ? [...filteredArray].sort() : [];
        } else if (value != null && value !== '') {
          // 🔹 تجاهل القيم null, undefined, empty strings
          acc[key] = value;
        }
        return acc;
      }, {});
      
      return JSON.stringify(sorted);
    };
    
    const currentInitialFiltersStr = normalizeFilters(initialFilters);
    const prevInitialFiltersStr = prevInitialFiltersRef.current;
    
    // التحقق من وجود تغيير فعلي في initialFilters
    // مقارنة أكثر دقة: التحقق من null و empty objects
    const hasChanged = prevInitialFiltersStr === null || 
                      currentInitialFiltersStr !== prevInitialFiltersStr;
    
    if (hasChanged) {
      // 🔹 إنشاء نسخة جديدة من initialFilters لضمان التحديث
      const newFilters = initialFilters ? { ...initialFilters } : {};
      
      // 🔹 تنظيف المصفوفات الفارغة
      Object.keys(newFilters).forEach(key => {
        if (Array.isArray(newFilters[key]) && newFilters[key].length === 0) {
          delete newFilters[key];
        }
      });
      
      // 🔹 تعيين flag لمنع استدعاء onFilterChange عند التحديث من initialFilters
      isUpdatingFromInitialRef.current = true;
      setSelectedFilters(newFilters);
      // تحديث المرجع للقيمة السابقة
      prevInitialFiltersRef.current = currentInitialFiltersStr;
      prevSelectedFiltersRef.current = JSON.stringify(normalizeFilters(newFilters));
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔹 FilterDropdown: Updated selectedFilters from initialFilters:', newFilters);
        console.log('🔹 FilterDropdown: Previous:', prevInitialFiltersStr);
        console.log('🔹 FilterDropdown: Current:', currentInitialFiltersStr);
        console.log('🔹 FilterDropdown: selectedFilters updated to:', newFilters);
        console.log('🔹 FilterDropdown: Brand selected:', newFilters.Brand);
        console.log('🔹 FilterDropdown: Brand array:', newFilters.Brand);
        console.log('🔹 FilterDropdown: Brand length:', newFilters.Brand?.length);
        console.log('🔹 FilterDropdown: Has changed:', hasChanged);
      }
      
      // 🔹 إعادة تعيين flag بعد التحديث
      setTimeout(() => {
        isUpdatingFromInitialRef.current = false;
      }, 0);
    } else {
      // تهيئة prevInitialFiltersRef في المرة الأولى
      if (prevInitialFiltersStr === null) {
        prevInitialFiltersRef.current = currentInitialFiltersStr;
        // تحديث selectedFilters في المرة الأولى أيضاً
        const newFilters = initialFilters ? { ...initialFilters } : {};
        setSelectedFilters(newFilters);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🔹 FilterDropdown: Initial mount with initialFilters:', initialFilters);
          console.log('🔹 FilterDropdown: Initial selectedFilters:', newFilters);
        }
      }
    }
  }, [initialFilters]);

  // الفلترة تحدث فوراً عند اختيار القيم
  useEffect(() => {
    // 🔹 منع استدعاء onFilterChange عند التحديث من initialFilters
    if (isUpdatingFromInitialRef.current) {
      return;
    }
    
    // 🔹 التحقق من وجود تغيير فعلي في selectedFilters
    const normalizeFilters = (filters) => {
      if (!filters || typeof filters !== 'object' || Array.isArray(filters)) {
        return '{}';
      }
      const sorted = Object.keys(filters).sort().reduce((acc, key) => {
        const value = filters[key];
        if (Array.isArray(value)) {
          const filteredArray = value.filter(v => v != null && v !== '');
          acc[key] = filteredArray.length > 0 ? [...filteredArray].sort() : [];
        } else if (value != null && value !== '') {
          acc[key] = value;
        }
        return acc;
      }, {});
      return JSON.stringify(sorted);
    };
    
    const currentSelectedFiltersStr = normalizeFilters(selectedFilters);
    const prevSelectedFiltersStr = prevSelectedFiltersRef.current;
    
    // 🔹 لا تطلق onFilterChange عند أول mount لتجنب مسح deep-link filters
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      prevSelectedFiltersRef.current = currentSelectedFiltersStr;
      return;
    }

    // 🔹 استدعاء onFilterChange فقط إذا تغيرت selectedFilters فعلياً
    if (currentSelectedFiltersStr !== prevSelectedFiltersStr) {
      prevSelectedFiltersRef.current = currentSelectedFiltersStr;
      onFilterChange(selectedFilters);
    }
  }, [selectedFilters, onFilterChange]);

  // على الديسكتوب، نعرض 4 فلاتر فقط في البداية
  const visibleFilters = showAllFilters ? attributeValues : attributeValues.slice(0, 4);
  const hasMoreFilters = attributeValues.length > 4;

  return (
    <div className="space-y-4  w-full">
      {/* Desktop View - Flex Wrap */}
      <div className="hidden md:flex flex-wrap gap-2 items-center">
        {visibleFilters.map(({ attribute, values, countsByValue }) => {
          const selectedValues = selectedFilters[attribute] || [];
          
          if (process.env.NODE_ENV === 'development' && attribute === 'Brand') {
            console.log(`🔹 FilterDropdown: Rendering ${attribute} dropdown with selected:`, selectedValues);
          }
          
          return (
            <Dropdown
              key={attribute}
              attribute={attribute}
              values={values}
              countsByValue={countsByValue}
              selected={selectedValues}
              onChange={(newSelected) => {
                setSelectedFilters((prev) => ({
                  ...prev,
                  [attribute]: newSelected,
                }));
              }}
            />
          );
        })}
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
                      : attribute === 'Brand' && selectedFilters[attribute]?.length > 0
                      ? 'bg-yellow-400 text-yellow-900 border border-yellow-500 shadow-md hover:bg-yellow-300'
                      : 'bg-white text-gray-700 shadow-md hover:shadow-lg hover:bg-gray-50'
                  }`}
              >
                <span>
                  {attribute} {selectedFilters[attribute]?.length > 0 && `(${selectedFilters[attribute].length})`}
                </span>
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
              countsByValue={attributeValues.find(a => a.attribute === openDropdown)?.countsByValue}
              selected={selectedFilters[openDropdown] || []}
              key={openDropdown}
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

function Dropdown({ attribute, values, countsByValue, selected, onChange, isMobile = false, onClose }) {
  const { t } = useTranslation();
  // 🔹 تهيئة tempSelected من selected prop مباشرة
  const [tempSelected, setTempSelected] = useState(() => {
    return Array.isArray(selected) ? [...selected] : [];
  });
  const dropdownRef = useRef(null);
  const prevSelectedStrRef = useRef(null);

  useEffect(() => {
    // 🔹 تحويل selected إلى string للمقارنة الدقيقة
    const normalizeSelected = (sel) => {
      if (!Array.isArray(sel)) return '[]';
      if (sel.length === 0) return '[]';
      // 🔹 ترتيب المصفوفة لضمان المقارنة الصحيحة
      return JSON.stringify([...sel].sort());
    };
    
    const currentSelectedStr = normalizeSelected(selected);
    const prevSelectedStr = prevSelectedStrRef.current;
    
    // 🔹 تحديث tempSelected فقط إذا تغيرت القيمة فعلياً
    if (prevSelectedStr === null || currentSelectedStr !== prevSelectedStr) {
      if (process.env.NODE_ENV === 'development' && attribute === 'Brand') {
        console.log(`🔹 Dropdown (${attribute}): selected prop changed to:`, selected);
        console.log(`🔹 Dropdown (${attribute}): Previous:`, prevSelectedStr);
        console.log(`🔹 Dropdown (${attribute}): Current:`, currentSelectedStr);
        console.log(`🔹 Dropdown (${attribute}): Updating tempSelected to:`, selected);
        console.log(`🔹 Dropdown (${attribute}): selected is array:`, Array.isArray(selected));
        console.log(`🔹 Dropdown (${attribute}): selected length:`, selected?.length);
        console.log(`🔹 Dropdown (${attribute}): isMobile:`, isMobile);
      }
      // 🔹 تحديث tempSelected مباشرة - استخدام Array.isArray للتحقق
      if (Array.isArray(selected)) {
        setTempSelected([...selected]);
      } else {
        setTempSelected([]);
      }
      prevSelectedStrRef.current = currentSelectedStr;
    }
  }, [selected, attribute, isMobile]);

  // 🔹 useEffect إضافي للتأكد من تحديث tempSelected عند mount أو re-mount (خاصة في وضع الجوال)
  // 🔹 استخدام useRef لتتبع tempSelected لتجنب dependency loop
  const tempSelectedRef = useRef(tempSelected);
  tempSelectedRef.current = tempSelected;
  
  useEffect(() => {
    // 🔹 التأكد من تحديث tempSelected من selected prop عند mount أو عند تغيير selected
    // 🔹 هذا مهم خاصة في وضع الجوال عند فتح الـ dropdown
    if (Array.isArray(selected)) {
      const currentSelectedStr = JSON.stringify([...selected].sort());
      const tempSelectedStr = JSON.stringify([...tempSelectedRef.current].sort());
      
      // 🔹 تحديث tempSelected إذا كان مختلفاً عن selected
      if (currentSelectedStr !== tempSelectedStr) {
        if (process.env.NODE_ENV === 'development' && attribute === 'Brand') {
          console.log(`🔹 Dropdown (${attribute}): Syncing tempSelected with selected`);
          console.log(`🔹 Dropdown (${attribute}): selected:`, selected);
          console.log(`🔹 Dropdown (${attribute}): tempSelected:`, tempSelectedRef.current);
          console.log(`🔹 Dropdown (${attribute}): isMobile:`, isMobile);
        }
        setTempSelected([...selected]);
      }
    } else if (tempSelectedRef.current.length > 0) {
      // 🔹 إذا كان selected ليس array و tempSelected يحتوي على قيم، امسح tempSelected
      setTempSelected([]);
    }
  }, [selected, attribute, isMobile]); // 🔹 يعمل عند تغيير selected أو attribute أو isMobile

  // 🔹 إزالة handleClickOutside في وضع الجوال - الـ dropdown يغلق فقط عند الضغط على X أو على زر الـ dropdown نفسه
  useEffect(() => {
    // فقط في وضع الويب (Desktop)
    if (isMobile) return;
    
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setTempSelected(selected);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [selected, isMobile])
  const toggleOption = (value) => {
    const updated = tempSelected.includes(value)
      ? tempSelected.filter((v) => v !== value)
      : [...tempSelected, value];
    setTempSelected(updated);
    // 🔹 في وضع الجوال، التغييرات تحدث فوراً (مثل وضع الويب)
    onChange(updated);
  };

  /** Desktop: زر Done يطبّق الاختيار المؤقت قبل الإغلاق */
  const confirmSelection = () => {
    onChange(Array.isArray(tempSelected) ? [...tempSelected] : []);
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
                <span>
                  <DynamicText>{value}</DynamicText>
                  {typeof countsByValue?.[value] === "number" && (
                    <span className="text-gray-500 ms-1">({countsByValue[value]})</span>
                  )}
                </span>
              </div>
              {tempSelected.includes(value) && <CheckIcon className="w-4 h-4 text-blue-600" />}
            </label>
          ))}
        </div>
        {/* 🔹 إزالة زر "Done" - التغييرات تحدث فوراً في وضع الجوال */}
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
          className={`w-full flex justify-between items-center cursor-pointer px-3 py-2 text-sm font-medium border shadow hover:bg-gray-50 focus:outline-none transition-all ${
            attribute === 'Brand' && selected.length > 0
              ? 'bg-yellow-400 text-yellow-900 border-yellow-500 hover:bg-yellow-300'
              : 'bg-white text-neutral-700 border-gray-300'
          }`}
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
                    <span>
                      <DynamicText>{value}</DynamicText>
                      {typeof countsByValue?.[value] === "number" && (
                        <span className="text-gray-500 ms-1">({countsByValue[value]})</span>
                      )}
                    </span>
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
