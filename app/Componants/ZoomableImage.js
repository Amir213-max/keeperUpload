'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

export default function ZoomableImage({ src, alt }) {
  const [zoom, setZoom] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const imageRef = useRef(null);

  const handleMouseMove = (e) => {
    const { left, top, width, height } = imageRef.current.getBoundingClientRect();
    const x = ((e.pageX - left) / width) * 100;
    const y = ((e.pageY - top) / height) * 100;
    setPosition({ x, y });
  };

  return (
    <div
      ref={imageRef}
      className="relative w-full h-[500px] overflow-hidden   border border-gray-200 bg-gray-50"
      onMouseEnter={() => setZoom(true)}
      onMouseLeave={() => setZoom(false)}
      onMouseMove={handleMouseMove}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className={`object-contain transition-transform duration-300 ease-out ${
          zoom ? 'scale-[2.5]' : 'scale-100'
        }`}
        style={{
          transformOrigin: `${position.x}% ${position.y}%`,
        }}
        priority
      />
    </div>
  );
}
