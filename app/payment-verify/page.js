import { Suspense } from "react";
import PaymentVerifyClient from "./PaymentVerifyClient";
import Loader from "../Componants/Loader";

export const dynamic = "force-dynamic";

export default function PaymentVerifyPage() {
  return (
    <Suspense fallback={<Loader />}>
      <PaymentVerifyClient />
    </Suspense>
  );
}

