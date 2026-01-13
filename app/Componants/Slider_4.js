
'use client';


import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import Image from 'next/image';
import { useTranslation } from '../contexts/TranslationContext';
// import { GET_PRODUCTS } from '../graphql/queries';




const cards1 = [
  {
    image: '/assets/getafe.webp',
     title:'FOOTball'
  },
  {
    image: '/assets/getafe.webp',
     title:'FOOTball'

  },
{
    image: '/assets/getafe.webp',
    title:'FOOTball'
       
  },
];

export default function MultiSlider_4() {
 

  const { t , lang} = useTranslation();
  return (
    <div className="w-full  mx-auto px-4 space-y-5 py-10">
    <div className="mx-auto text-2xl flex justify-center font-bold   text-white">{t("From the league to the national team - our gloves show off worldwide")}</div>

<Swiper
        key={lang}
        modules={[Navigation, Autoplay]}
        spaceBetween={16}
        slidesPerView={4}
        loop={cards1.length > 4}
        autoplay={{
          delay: 3000,
          pauseOnMouseEnter: true,
          disableOnInteraction: false,
        }}
        navigation={true}
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        breakpoints={{
          1024: { slidesPerView: 3 },
          640: { slidesPerView: 2 },
        }}
        className="h-fit"
        aria-label="عروض مميزة"
      >
        {cards1.map((item, index) => (
          <SwiperSlide key={index}>
            <div className="   shadow-md overflow-hidden w-full flex flex-col h-96">
              <div className="relative w-full h-full    flex items-center justify-center">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-contain w-80 "
                />
              </div>
             
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <button className='flex justify-center font-bold p-5 cursor-pointer rounded-sm bg-green-600 text-black text-lg mx-auto mt-3'>{t("KEEPERSPORT PROS")}</button>

     
    </div>
  );
}
