// لا تضع "use client" هنا
import { sendTestNotification } from "@/utils/sendTestNotification";
import { subscribeUser } from "@/utils/subscribeUser";
import Cover_2 from "./Componants/cover-2";
import Cover_3 from "./Componants/cover-3";
import Cover_4 from "./Componants/cover-4";
import Cover_5 from "./Componants/Cover-5";
import Cover_6 from "./Componants/Cover-6";
import HomePageBlocks from "./Componants/HomePageBlocks";
import Cover from "./Componants/imgCover";
import ProductSlider from "./Componants/ProductSlider";

import MultiSlider from "./Componants/Slider-1";
import MultiSlider_2 from "./Componants/Slider_2";
import MultiSlider_3 from "./Componants/Slider_3";
import MultiSlider_4 from "./Componants/Slider_4";
import MultiSlider_5 from "./Componants/Slider_5";
import MultiSlider_6 from "./Componants/Slider_6";
import MultiSlider_7 from "./Componants/Slider_7";
// باقي الاستيرادات بدون Splide لأنه Client فقط



// import { graphqlClient } from './lib/graphqlClient';
// import { BROWSE_CATALOG_QUERY } from "./lib/queries";

// const fetchProductsByCategory = async () => {
//   const input = { categoryIds: ["17"] };
//   const variables = { input };

//   const data = await graphqlClient.request(BROWSE_CATALOG_QUERY, variables);
//   return data.catalog.products.edges;
// };

export default async function Home() {
  // const products = await fetchProductsByCategory();

  return (
    <div>
      

      {/* <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mx-2.5 gap-4">
        {products.map((edge) => (
          <div
            key={edge.node.sku}
            className="bg-gray-100 hover:bg-gray-200 text-[#666666] shadow-md overflow-hidden flex flex-col"
          >
            <ProductSlider images={edge.node.images} productName={edge.node.name} />

            <div className="p-5">
              <div className="bg-slate-500 text-white rounded-tl-xl rounded-br-xl text-center w-fit px-3 py-1 text-sm mb-2">
                {edge.node.categories.map((cat) => cat.name).join(", ")}
              </div>
              <h3 className="text-lg text-center font-semibold mb-1">
                {edge.node.name}
              </h3>
              <p className="text-center text-sm">{edge.node.brand?.name}</p>
              <h2 className="font-bold text-2xl mt-4 flex justify-center line-clamp-1">
                $98 <span className="text-xs ml-1">99</span>
              </h2>
            </div>
          </div>
        ))}
      </div> */}

      {/* باقي الأقسام */}
      {/* <button className="p-5 bg-amber-300 text-white hover:bg-amber-500 " onClick={subscribeUser}>اشترك في الإشعارات</button> */}
      {/* <Cover /> */}
      <HomePageBlocks />
      {/* <button
      onClick={sendTestNotification}
      className="px-4 py-2 bg-blue-500 text-white rounded"
    >
      Send Test Notification
    </button> */}
      {/* <MultiSlider />
      <Cover_2 />
      <MultiSlider_2 />
      <Cover_3 />
      <MultiSlider_3 />
      
      <Cover_4 />
      <Cover_5 />
      <MultiSlider_5 />
      <Cover_6 /> */}
      {/* <MultiSlider_6 /> */}
      {/* <MultiSlider_7 />
      <MultiSlider_2 /> */}
    </div>
  );
}
