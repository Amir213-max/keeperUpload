// components/ChatSidebar.js
'use client';
import { useChat } from '../contexts/ChatContext';
import { X, ArrowLeft } from 'lucide-react';
import { FaCommentDots, FaEnvelope, FaHome } from 'react-icons/fa';

export default function ChatSidebar() {
  const { openChat,isChatOpen, closeChat, page, goToForm, goToHome } = useChat();

  return (
    <>
     
     {!isChatOpen && (
  <button
    onClick={() => openChat()}
    className="hidden lg:block fixed bottom-4 cursor-pointer right-4 bg-yellow-400 text-black p-4 rounded-full shadow-lg z-50 hover:scale-125 duration-100"
  >
    <FaCommentDots size={24} className="text-white" />
  </button>
)}


    
      {isChatOpen && (
        <div className="animate-slide-in-right fixed bottom-4 right-4 w-[350px] h-[500px] bg-gradient-to-b from-[#333] via-[#d0d0d0] to-gray-100 shadow-lg rounded-2xl z-50 flex flex-col">

  
          <div className="flex justify-between items-center p-4 border-b ">
            {page === 'form' ? (
              <button onClick={goToHome}>
                <ArrowLeft className="w-5 h-5 cursor-pointer hover:scale-110 duration-150" />
              </button>
            ) : (
              <div />
            )}
            <h2 className="text-sm font-semibold">KEEPERsport</h2>
            <button onClick={closeChat}>
              <X className="w-7 h-7" />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-auto">
            {page === 'home' ? (
              <div>
                <p className="text-2xl text-gray-300">Hi there 👋</p>
                <p className="font-semibold text-2xl mb-4">How can we help?</p>
                <button
                  onClick={goToForm}
                  className="w-full text-start cursor-pointer duration-150  bg-white p-4 text-[14px] text-neutral-700 rounded-2xl hover:bg-gray-100"
                >
                  Send us a message → <br/>
                  We'll be back online in 30 minutes
                </button>
                <div className='absolute bottom-0 left-0 w-full bg-gray-50 rounded-2xl flex flex-wrap  justify-around border-t-2 border-gray-300 p-4' >
<button  onClick={goToHome} className='flex cursor-pointer  flex-col items-center text-neutral-700 hover:scale-110 duration-150' >
<FaHome fontSize={20} />
Home
  
</button>
<button  onClick={goToForm} className='flex cursor-pointer  flex-col items-center text-neutral-700 hover:scale-110 duration-150'>
<FaEnvelope   fontSize={20} />
Message
</button>
                </div>   
              </div>
            ) : (
              <div className="flex flex-col gap-2 ">
                <p className="text-sm text-center ">Should you require assistance our KEEPERsport customer service team will help you out in a matter of minutes. #KeepItAll ✌️</p>
                <div className='flex flex-col gap-2 absolute bottom-0 left-0 w-full border border-gray-300 shadow-2xl rounded-2xl p-3 bg-gray-50'>
                <input
                  type="email"
                  placeholder="email@example.com"
                  className=" w-[90%] border-b text-neutral-700 border-gray-400 p-2 rounded"
                />
                <textarea placeholder="Message..." className="  text-neutral-700  p-2 rounded h-28" />
                <button className="bg-yellow-400 text-black py-2 rounded font-bold">
                  Send
                </button>
                  </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}






