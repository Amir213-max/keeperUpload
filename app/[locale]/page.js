// app/[locale]/page.js

import Cover_2 from '../Componants/cover-2';
import Cover_3 from '../Componants/cover-3';
import Cover_4 from '../Componants/cover-4';
import Cover from '../Componants/imgCover';
import LanguageSwitcher from '../Componants/LanguageSwitcher';
import NavbarWithLinks from '../Componants/navbar';
import MultiSlider from '../Componants/Slider-1';
import MultiSlider_2 from '../Componants/Slider_2';
import MultiSlider_3 from '../Componants/Slider_3';
import MultiSlider_4 from '../Componants/Slider_4';
import { TranslationProvider } from '../contexts/TranslationContext';

export default async function HomePage({ params }) {
 

  return (
    <TranslationProvider>

    <main >
    
    <div className="flex mt-3 justify-center text-xl font-extrabold align-middle  text-red-600 ">
      <h2>
      END OF SALES
     </h2>
   </div>

<Cover />



<MultiSlider />

<Cover_2 />
<MultiSlider_2 />
<Cover_3 />
<MultiSlider_3 />
<MultiSlider_4 />

      <LanguageSwitcher />
      
    </main>
    </TranslationProvider>
  );
}
