
'use client'; 

import{ React , useState }from 'react'


import '@splidejs/splide/dist/css/splide.min.css';






export default function page() {


const images = [
    "/assets/gallery-1.webp",
    "/assets/gallery-2.webp",
    "/assets/gallery-3.webp",
    "/assets/gallery-4.webp",
  ]
  const [selectedImage, setSelectedImage] = useState(images[0]);
  return (
    <div className='bg-[#373e3e]'>

<div className="grid pt-4 grid-cols-4  ">
  
  <div className="col-span-3 p-4 bg-white">

    <h1 className='text-4xl text-[#1f2323] p-2'> THE Product NAME</h1>
   
 
    
  
      <div className=" w-full flex justify-start items-center  ">
        <div className="">
          {images.map((img, index) => (
            <img
              key={index}
              src={img}
              alt={`صورة ${index + 1}`}
              onClick={() => setSelectedImage(img)}
              className="w-30 h-36 object-contain gap-3 border-2 border-gray-200 cursor-pointer hover:border-amber-300 transition"
            />
          ))}
        </div>
        <img
          src={selectedImage}
          alt="الصورة الرئيسية"
          className="w-[100%] h-[85vh] object-contain "
        />
     
    </div>
    
  </div>


  <div className="col-span-1 grid-cols-4 gap-3 bg-[#1f2323]">
    

   
  </div>
</div>
    </div>

  )
}
