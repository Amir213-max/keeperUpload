"use client";

import { Suspense } from "react";
import CustomerPage from "./CustomerPage";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CustomerPage />
    </Suspense>
  );
}
