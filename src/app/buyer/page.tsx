"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BuyerRootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/buyer/catalog");
  }, [router]);
  return null;
}

