
import { Geist, Geist_Mono } from "next/font/google";
import Footer from "./Componants/Footer";
import NavbarWithLinks from "./Componants/navbar";
import { CartProvider } from "./contexts/CartContext";
import { TranslationProvider } from "./contexts/TranslationContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import RegisterSWClient from "./Componants/RegisterSWClient";
import { Toaster } from 'react-hot-toast';
import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";
import { CategoryProvider } from "./contexts/CategoryContext";
import { PublicNavSettingsProvider } from "./contexts/PublicNavSettingsContext";
import ProgressBar from "./components/ProgressBar";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // 🔹 Improve LCP by showing fallback font immediately
  preload: true, // 🔹 Preload critical fonts
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "optional", // 🔹 Better for mobile - don't block rendering if font fails
  preload: false, // 🔹 Don't preload secondary font
  adjustFontFallback: false, // 🔹 Reduce layout shift on mobile
});

export const metadata = {
  title: "كيبر سبورت | أكبر تشكيلة من قفازات حراس المرمى، أحذية كرة القدم، ملابس ومعدات احترافية",
  description:
    "كيبر سبورت | أكبر تشكيلة من قفازات حراس المرمى، أحذية كرة القدم، ملابس ومعدات احترافية",
  
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },

  openGraph: {
    title: "كيبر سبورت | أكبر تشكيلة من قفازات حراس المرمى، أحذية كرة القدم، ملابس ومعدات احترافية",
    description:
      "كيبر سبورت | أكبر تشكيلة من قفازات حراس المرمى، أحذية كرة القدم، ملابس ومعدات احترافية",
    url: "https://www.keepersport.sa",
    siteName: "KeeperSport",
    images: [
      {
        url: "https://www.keepersport.sa/logo.jpg",
        width: 1200,
        height: 630,
        alt: "كيبر سبورت | أكبر تشكيلة من قفازات حراس المرمى، أحذية كرة القدم، ملابس ومعدات احترافية",
      },
    ],
    locale: "ar_SA",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: " كيبر سبورت | أكبر تشكيلة من قفازات حراس المرمى، أحذية كرة القدم، ملابس ومعدات احترافية",
    description:
      "كيبر سبورت | أكبر تشكيلة من قفازات حراس المرمى، أحذية كرة القدم، ملابس ومعدات احترافية",
    images: ["https://www.keepersport.sa/logo.jpg"],
  },
};


export default function RootLayout({ children  }) {
 

  return (
    
    <html lang="ar" dir="rtl">
     <body className={`${geistSans.variable} ${geistMono.variable}`}>

   <TranslationProvider>
   <PublicNavSettingsProvider>
<AuthProvider>
<CurrencyProvider>
  
     <CategoryProvider>
     <CartProvider>
     

{/* <ChatProvider> */}

     <ProgressBar />
     <nav aria-label="Main navigation">
       <NavbarWithLinks />
     </nav>

     <main id="main-content">
       {children}
     </main>
       
        <RegisterSWClient />
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <footer>
          <Footer />
        </footer>
     </CartProvider>
</CategoryProvider>
</CurrencyProvider>
</AuthProvider>
   </PublicNavSettingsProvider>
    </TranslationProvider>
      </body>
      </html>
    
  );
}
