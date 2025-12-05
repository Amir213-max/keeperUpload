
export default function LocaleLayout({ children, params }) {
    const locale = params?.locale || 'ُen'; // إذا لم يتم تمرير اللغة، استخدم "ar"
    const dir = locale === 'en' ? 'ltr' : 'rtl';
  
    return (
      <html lang={locale} dir={dir}>
        <body>
          {children}
        </body>
      </html>
    );
  }
  