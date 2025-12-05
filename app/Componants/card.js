
'use client'; 

import React from 'react'

import { useEffect } from 'react';
import Splide from '@splidejs/splide';
import '@splidejs/splide/dist/css/splide.min.css';
import Link from 'next/link';

export default function Card_1() {

    useEffect(() => {
        new Splide('.cio', {
          type: 'loop',
          perPage: 1,
          autoplay: true,
          interval: 3000,
          pauseOnHover: true,
          arrows: true,
          pagination: true,
        }).mount();
      }, []);
  return (
    

     
    <>

<Link href={'/Product'}   className="bg-gray-100 hover:bg-gray-200 text-[#666666]  shadow-md overflow-hidden flex flex-col   ">
              <div className="relative w-full h-full   flex items-center justify-center">
                         
    <div  className="splide cio">
      <div className="splide__track">
        <ul className="splide__list">
          <li className="splide__slide grid justify-center ">
            <img src="/assets/ball.webp?text=Slide+1"  alt="Slide 1" />
          </li>
          <li className="splide__slide  grid justify-center">
            <img src="/assets/ball.webp?text=Slide+2" alt="Slide 2" />
          </li>
          <li className="splide__slide  grid justify-center">
            <img src="/assets/ball.webp?text=Slide+3" alt="Slide 3" />
          </li>
        </ul>
      </div>
    </div>
              </div>
              <div className="p-5">
                
                <div className='bg-slate-500 text-white rounded-tl-xl rounded-br-xl text-center w-14 p-2'>NEW</div>
                <h3 className="text-lg text-center font-semibold mb-2">REHAB</h3>
                <p className=" text-center text-sm">MasterNC Resist</p>
                <h2 className='font-bold text-2xl mt-8 flex justify-center line-clamp-1 '>$98 <span className='text-xs '>99 </span></h2>
              </div>
            </Link>

  
    </>

   


  )
}
