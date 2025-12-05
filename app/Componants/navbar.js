'use client';
import { useTranslation } from '../contexts/TranslationContext';
import { FaSearch, FaShoppingCart, FaUser, FaBars } from 'react-icons/fa';
import { useState , useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import CartSidebar from './CartSidebar';
import SearchComponent from './SearchComponant';
import Sidebar from './sidebar';
import NavbarNotifications from './NotificationsBell';
import { useAuth } from '../contexts/AuthContext'; // ✅ استدعاء الـ AuthContext
import { GET_ACTIVE_HOME_PAGE_BLOCKS } from '../lib/queries';
import { graphqlClient } from '../lib/graphqlClient';
import { useCategory } from '../contexts/CategoryContext';
import CurrencySwitcher from '../components/CurrencySwitcher';
import { useCart } from '../contexts/CartContext';

export default function NavbarWithLinks() {
  const { t, lang, setLang } = useTranslation();
  const [cartOpen, setCartOpen] = useState(false);
  const { getCartItemCount } = useCart();
  const cartItemCount = getCartItemCount();

    const [blocks, setBlocks] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
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

        
  // ✅ جلب بيانات المستخدم والتوكن من الـ AuthContext
  const { user, token, logout } = useAuth();

    const { setSelectedCategoryId } = useCategory();
  const handleCategorySelect = (catId) => {
    setSelectedCategoryId(catId);
    setSidebarOpen(false);
  };
  

 const firstTextBlock = blocks.find((b) => b.type === "text");
  
  return (
    <>

      {/* ✅ Navbar */}
      <header className="w-full bg-black shadow py-4">
        <div className="navbar-container container mx-auto px-4 flex items-center justify-between">
          {/* ✅ Left side (Menu + Cart) */}
          <div className="navbar-left flex items-center gap-2 order-3 sm:order-1">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-white hover:text-amber-400 transition-colors duration-200 cursor-pointer lg:hidden"
            >
              <FaBars size={20} />
            </button>

            <button
              onClick={() => setCartOpen(true)}
              className="relative text-white hover:text-amber-400 transition-colors duration-200 cursor-pointer"
            >
              <FaShoppingCart className='hidden md:flex'  size={20} />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </button>
             <CurrencySwitcher />
          </div>

          {/* ✅ Center (Logo) */}
          <div className="navbar-center order-1 sm:order-2 flex items-center gap-4">
            <Link
              href="/"
              className="relative w-24 sm:w-32 md:w-40 h-10 sm:h-12 md:h-14 block"
            >
              <Image
                src="https://static-assets.keepersport.net/dist/82d4dde2fe42e8e4fbfc.svg"
                alt="LOGO"
                fill
                sizes="(max-width: 640px) 6rem, (max-width: 768px) 8rem, 10rem"
                className="object-contain"
                priority
              />
            </Link>
          </div>

          {/* ✅ Right side (User + Search + Notifications + Lang) */}
          <div className="navbar-right order-2 flex items-center gap-2 md:gap-4">
            {/* 🔑 لو المستخدم مسجل دخول */}
             
    
{user ? (
  <div className="flex items-center gap-2 md:gap-3">
    <Link href="/myprofile" className="flex items-center gap-2 text-white hover:text-amber-400 transition-colors">
      <span className="text-xs sm:text-sm hidden sm:inline">{user.name}</span>
      <FaUser size={18} className="md:w-5 md:h-5" />
    </Link>

    {/* ✅ زر Logout أصغر ومتجاوب - مخفي في الشاشات الصغيرة */}
    <button
      onClick={() => {
        logout();
        setCartOpen(false);
      }}
      className="hidden lg:flex bg-red-600 hover:bg-red-700 text-white px-2 py-1 md:px-3 md:py-1.5 rounded text-xs md:text-sm transition-colors duration-200"
      title="Logout"
    >
      <span className="hidden sm:inline">Logout</span>
      <span className="sm:hidden">Out</span>
    </button>
  </div>
) : (
  <Link
    href="/login"
    className="text-white hover:text-amber-600 cursor-pointer transition-colors duration-200"
  >
    <FaUser className="hidden md:flex" size={20} />
  </Link>
)}

            {/* 🔍 Search */}
            <button
              className="text-white hover:text-amber-400 transition-colors duration-200 cursor-pointer"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <FaSearch size={20} />
            </button>

            {/* 🔔 Notifications */}
            {token && <NavbarNotifications userToken={token} />}

            {/* ✅ Search Modal */}
            {searchOpen && (
              <SearchComponent onClose={() => setSearchOpen(false)} />
            )}

            {/* 💰 Currency Switcher */}
            

            {/* 🌐 Language Selector */}
            <select
              onChange={(e) => setLang(e.target.value)}
              value={lang}
              className="bg-black text-white border border-gray-500 px-2 py-1  text-sm"
            >
              <option value="en">en</option>
              <option value="ar">ar</option>
            </select>
          </div>
        </div>
      </header>

      {/* ✅ Navigation Links */}
      <nav
        id="main-links"
        className="hidden lg:flex justify-around bg-black shadow py-3 text-sm sm:text-[14px] lg:text-lg"
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
      <div className="lg:hidden">
        <Sidebar
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          onSelectCategory={handleCategorySelect}
          isRTL={lang === 'ar'}
        />
      </div>

      {/* 🛒 Cart Drawer */}
      <CartSidebar isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
