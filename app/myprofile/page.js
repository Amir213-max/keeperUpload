import { Suspense } from "react";
import MyProfileClient from "./MyProfileClient";
import Loader from "../Componants/Loader";

export const dynamic = "force-dynamic";

export default function MyProfilePage() {
  return (
    <Suspense fallback={<Loader />}>
      <MyProfileClient />
    </Suspense>
  );
}
