import { Suspense } from "react";
import PaymentSuccessClient from "./PaymentSuccessClient";

export const dynamic = "force-dynamic"; // تأكد إنها دايناميك مش Static

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="text-center mt-10">Loading...</div>}>
      <PaymentSuccessClient />
    </Suspense>
  );
}
