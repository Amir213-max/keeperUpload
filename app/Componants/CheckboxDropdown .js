'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon, ChevronUpIcon, CheckIcon } from '@heroicons/react/20/solid';
import { useTranslation } from '../contexts/TranslationContext';

export default function FilterDropdown({ attributeValues, onFilterChange }) {
  const [selectedFilters, setSelectedFilters] = useState({});
  const [showMore, setShowMore] = useState(false);
  const { t } = useTranslation();

  // الفلترة تحدث فوراً عند اختيار القيم
  useEffect(() => {
    onFilterChange(selectedFilters);
  }, [selectedFilters, onFilterChange]);

  const toggleOption = (attribute, value) => {
    setSelectedFilters((prev) => {
      const current = prev[attribute] || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [attribute]: updated };
    });
  };

  const visibleFilters = attributeValues.slice(0, 4);
  const hiddenFilters = attributeValues.slice(4);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[...visibleFilters, ...(showMore ? hiddenFilters : [])].map(
          ({ attribute, values }) => (
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
          )
        )}
      </div>

      {hiddenFilters.length > 0 && (
        <div>
          <button
            onClick={() => setShowMore(!showMore)}
            className="flex items-center px-4 py-2 text-sm font-medium text-black bg-gray-100 hover:bg-gray-200 duration-150 cursor-pointer transition"
          >
            {showMore ? (
              <>
                <ChevronUpIcon className="w-4 h-4 mr-1" />
                {t('More Filters')}
              </>
            ) : (
              <>
                <ChevronDownIcon className="w-4 h-4 mr-1" />
                {t('More Filters')}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function Dropdown({ attribute, values, selected, onChange }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [tempSelected, setTempSelected] = useState(selected); // للتأكيد
  const dropdownRef = useRef(null);

  useEffect(() => {
    setTempSelected(selected);
  }, [selected]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setTempSelected(selected); // الرجوع للقيم السابقة عند إغلاق الدروبداون
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selected]);

  const toggleOption = (value) => {
    const updated = tempSelected.includes(value)
      ? tempSelected.filter((v) => v !== value)
      : [...tempSelected, value];
    setTempSelected(updated); // تحديث مؤقت
    onChange(updated); // تحديث فوراً للفلترة
  };

  const confirmSelection = () => {
    setTempSelected(tempSelected);
    setIsOpen(false); // اغلاق الدروبداون
  };

  return (
    <div className="relative w-full sm:w-64 md:w-48" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center cursor-pointer px-3 py-2 text-sm text-neutral-700 font-medium bg-white border border-gray-300 shadow hover:bg-gray-50 focus:outline-none"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{attribute} {selected.length > 0 && `(${selected.length})`}</span>
        <ChevronDownIcon
          className={`w-5 h-5 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        className={`absolute mt-2 w-full bg-white border border-gray-200 shadow-lg z-50 max-h-64 overflow-y-auto transition-opacity duration-300 ease-in-out
          ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
        style={{ transformOrigin: 'top center' }}
      >
        <div className="p-3 space-y-2 text-gray-800 text-sm">
          {values.map((value) => (
            <label
              key={value}
              className="flex items-center justify-between cursor-pointer hover:bg-gray-100 px-2 py-1"
            >
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={tempSelected.includes(value)}
                  onChange={() => toggleOption(value)}
                  className="accent-blue-600"
                />
                <span>{value}</span>
              </div>
              {tempSelected.includes(value) && <CheckIcon className="w-4 h-4 text-blue-600" />}
            </label>
          ))}

          {/* زر التأكيد */}
          <div className="flex justify-end mt-4">
            <button
              onClick={confirmSelection}
              className="px-3 py-1 text-sm bg-black text-white hover:bg-gray-900 transition"
            >
              {t("Done ✔")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
