import { Suspense } from "react";
import ShippingDetailsClient from "./ShippingDetailsClient";
import Loader from "../Componants/Loader";

export const dynamic = "force-dynamic";

export default function ShippingDetailsPage() {
  return (
    <Suspense fallback={<Loader />}>
      <ShippingDetailsClient />
    </Suspense>
  );
}

