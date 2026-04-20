import { Suspense } from "react";
import Loader from "../Componants/Loader";
import ProfilePageClient from "./ProfilePageClient";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  return (
    <Suspense fallback={<Loader />}>
      <ProfilePageClient />
    </Suspense>
  );
}
