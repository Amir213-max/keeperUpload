'use client';
import { useTranslation } from '../contexts/TranslationContext';
import { FaSearch, FaShoppingCart, FaUser, FaBars } from 'react-icons/fa';
import { useState , useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Globe, ChevronDown } from 'lucide-react';
import CartSidebar from './CartSidebar';
import SearchComponent from './SearchComponant';
import Sidebar from './sidebar';
import NavbarNotifications from './NotificationsBell';
import { useAuth } from '../contexts/AuthContext'; // ✅ استدعاء الـ AuthContext
import { GET_ACTIVE_HOME_PAGE_BLOCKS } from '../lib/queries';
import { graphqlClient } from '../lib/graphqlClient';
import { useCategory } from '../contexts/CategoryContext';
import { useCart } from '../contexts/CartContext';
import { clearTranslationCache } from '../lib/translationService';
import { usePublicNavSettings } from '../contexts/PublicNavSettingsContext';
import { SITE_LOGO_FALLBACK_URL } from '../lib/siteLogoFromSettings';

export default function NavbarWithLinks() {
  const { t, lang, setLang } = useTranslation();
  const pathname = usePathname();
  const [cartOpen, setCartOpen] = useState(false);
  const { getCartItemCount } = useCart();
  const cartItemCount = getCartItemCount();
  
  // التحقق من أننا في الصفحة الرئيسية
  const isHomePage = pathname === '/';

  // Clear translation cache when language changes
  useEffect(() => {
    clearTranslationCache();
  }, [lang]);

    const [blocks, setBlocks] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { siteLogoUrl, offersLabel } = usePublicNavSettings();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef(null);
  useEffect(() => {
    async function fetchBlocks() {
      try {
        const data = await graphqlClient.request(GET_ACTIVE_HOME_PAGE_BLOCKS);
        const activeBlocks = data.activeHomepageBlocks || [];
        setBlocks(activeBlocks);

        // تحميل المنتجات الخاصة بالبلوكات من نوع products
       
      } catch (error) {
        console.error("❌ Error fetching home page blocks:", error);
      } 
    }

    fetchBlocks();
  }, []);

  // ✅ فتح الـ CartSidebar عند إضافة منتج
  useEffect(() => {
    const handleOpenCart = () => {
      console.log("🛒 Opening cart sidebar...");
      setCartOpen(true);
    };

    window.addEventListener("openCart", handleOpenCart);
    return () => window.removeEventListener("openCart", handleOpenCart);
  }, []);

  // إغلاق dropdown اللغة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
        setLangDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

        
  // ✅ جلب بيانات المستخدم والتوكن من الـ AuthContext
  const { user, token, logout } = useAuth();

  /** جلسة مسجّلة: يكفي توكن أو مستخدم في السياق (لا نطلب الاثنين معًا) */
  const hasSession = Boolean(token || user);
  const userAccountHref = hasSession ? "/profile" : "/login";

    const { setSelectedCategoryId, goalkeeperGlovesBrands } = useCategory();
  const handleCategorySelect = (catId) => {
    setSelectedCategoryId(catId);
    setSidebarOpen(false);
  };
  

 const firstTextBlock = blocks.find((b) => b.type === "text");
  
  return (
    <>
      {/* ✅ Offers Label Banner - أعلى نقطة في المشروع - يظهر فقط في الصفحة الرئيسية */}
      {isHomePage && offersLabel && offersLabel.value && (
        <div className="w-full bg-red-700 text-black text-center  px-4">
          {offersLabel.url ? (
            <Link 
              href={offersLabel.url} 
              className="font-bold  text-sm md:text-base hover:underline"
            >
              {offersLabel.value}
            </Link>
          ) : (
            <span className="font-bold text-2xl md:text-base">{offersLabel.value}</span>
          )}
        </div>
      )}

      {/* ✅ Navbar */}
      <header className="relative z-40 w-full bg-black shadow px-4 py-4">
        <div className="navbar-container container mx-auto px-2 flex items-center justify-between">
          {/* ✅ Left side (Menu + Cart) */}
          <div className="navbar-left flex items-center gap-4 md:gap-6 lg:gap-5 xl:gap-6 order-3 sm:order-1">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-white hover:text-amber-400 transition-colors duration-200 cursor-pointer md:hidden"
              aria-label="Open menu"
              aria-expanded={sidebarOpen}
            >
              <FaBars size={20} />
            </button>

            <button
              onClick={() => setCartOpen(true)}
              className="relative text-white hover:text-amber-400 transition-colors duration-200 cursor-pointer flex items-center"
              aria-label={`Shopping cart${cartItemCount > 0 ? ` with ${cartItemCount} items` : ''}`}
              aria-expanded={cartOpen}
            >
              <FaShoppingCart size={20} />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center" aria-hidden="true">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </button>
          </div>

          {/* ✅ Center (Logo) */}
          <div className="navbar-center order-1 sm:order-2 flex items-center gap-4">
            <Link
              href="/"
              className="relative block w-[110px] h-[36px] sm:w-[140px] sm:h-[44px] md:w-[190px] md:h-[56px] max-w-[190px] max-h-[56px]"
            >
              <Image
                key={siteLogoUrl || "fallback"}
                src={siteLogoUrl || SITE_LOGO_FALLBACK_URL}
                alt="Logo"
                fill
                sizes="(max-width: 640px) 110px, (max-width: 768px) 140px, 190px"
                className="object-contain"
                priority
                unoptimized={Boolean(siteLogoUrl && /^https?:\/\//i.test(siteLogoUrl))}
              />
            </Link>
          </div>

          {/* ✅ Right side (Search + Notifications + Lang) */}
          <div className="navbar-right order-2 flex items-center gap-4 md:gap-6 lg:gap-5 xl:gap-6">

            {/* 👤 الملف الشخصي — يظهر من md فما فوق (مثل شريط الأقسام) */}
            <Link
              href={userAccountHref}
              className="hidden md:block text-white hover:text-amber-400 transition-colors duration-200 cursor-pointer"
              title={hasSession ? t("Profile") || "الملف الشخصي" : t("Login") || "تسجيل الدخول"}
              aria-label={hasSession ? t("Profile") || "Profile" : t("Login") || "Login"}
            >
              <FaUser size={20} />
            </Link>

            {/* 🔍 Search */}
            <button
              className="text-white hover:text-amber-400 transition-colors duration-200 cursor-pointer"
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="Search products"
              aria-expanded={searchOpen}
            >
              <FaSearch size={20} />
            </button>

            {/* 🔔 Notifications - مخفية مؤقتاً */}
            {/* {token && <NavbarNotifications userToken={token} />} */}

            {/* ✅ Search Modal */}
            {searchOpen && (
              <SearchComponent onClose={() => setSearchOpen(false)} />
            )}

            {/* 🌐 Language Selector - محسّن */}
            <div className="relative" ref={langDropdownRef}>
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center gap-1.5 text-white hover:text-amber-400 transition-colors duration-200 px-2 py-1.5 rounded border border-gray-600 hover:border-amber-400"
                aria-label="Select language"
                aria-expanded={langDropdownOpen}
              >
                <Globe size={18} className="text-white" />
                <span className="text-sm font-medium hidden sm:inline">
                  {lang === 'ar' ? 'العربية' : 'English'}
                </span>
                <ChevronDown 
                  size={14} 
                  className={`text-white transition-transform duration-200 ${langDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Dropdown Menu */}
              {langDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 bg-black border border-gray-600 rounded shadow-lg z-50 min-w-[120px]">
                  <button
                    onClick={() => {
                      if (lang !== 'ar') {
                        clearTranslationCache();
                        setLang('ar');
                        console.log('🔄 Language changed to Arabic');
                      }
                      setLangDropdownOpen(false);
                    }}
                    className={`w-full text-right px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                      lang === 'ar'
                        ? 'bg-amber-400/20 text-amber-400 font-semibold'
                        : 'text-white hover:bg-gray-800'
                    }`}
                  >
                    <span>العربية</span>
                    {lang === 'ar' && (
                      <svg
                        className="w-4 h-4 text-amber-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (lang !== 'en') {
                        clearTranslationCache();
                        setLang('en');
                        console.log('🔄 Language changed to English');
                      }
                      setLangDropdownOpen(false);
                    }}
                    className={`w-full text-right px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                      lang === 'en'
                        ? 'bg-amber-400/20 text-amber-400 font-semibold'
                        : 'text-white hover:bg-gray-800'
                    }`}
                  >
                    <span>English</span>
                    {lang === 'en' && (
                      <svg
                        className="w-4 h-4 text-amber-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ✅ Navigation Links */}
      <nav
        id="main-links"
        className="relative z-30 hidden md:flex justify-around bg-black shadow py-3 text-sm sm:text-[14px] lg:text-lg"
      >
        <ul className="flex gap-6 md:gap-12 text-white font-bold">
          <li>
            <Link href="/GoalkeeperGloves" className="hover:border-b-2 pb-1 border-white">
              {t('Goalkeeper Gloves')}
            </Link>
          </li>
          <li>
            <Link href="/FootballBoots" className="hover:border-b-2 pb-1 border-white">
              {t('Football Boots')}
            </Link>
          </li>
          <li>
            <Link href="/Goalkeeperapparel" className="hover:border-b-2 pb-1 border-white">
              {t('Goalkeeper Apparel')}
            </Link>
          </li>
          <li>
            <Link href="/Goalkeeperequipment" className="hover:border-b-2 pb-1 border-white">
              {t('Goalkeeper Equipment')}
            </Link>
          </li>
          <li>
            <Link href="/Teamsport" className="hover:border-b-2 pb-1 border-white">
              {t('Teamsport')}
            </Link>
          </li>
          <li>
            <Link href="/Sale" className="hover:border-b-2 pb-1 border-white">
              {t('Sale')}
            </Link>
          </li>
        </ul>
      </nav>

      {/* ✅ Sidebar (for mobile) */}
      <div className="md:hidden">
        <Sidebar
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          onSelectCategory={handleCategorySelect}
          brands={goalkeeperGlovesBrands || []}
          isRTL={lang === 'ar'}
        />
      </div>

      {/* 🛒 Cart Drawer */}
      <CartSidebar isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
