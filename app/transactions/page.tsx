"use client";

// This page redirects to /history
// Keeping it for backwards compatibility with existing links
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader } from "lucide-react";

export default function TransactionsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/history");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#1A1A1D] flex items-center justify-center">
      <div className="text-center">
        <Loader className="w-12 h-12 text-[#00F0FF] mx-auto mb-4 animate-spin" />
        <p className="text-[#A0A0A5]">Redirecting...</p>
      </div>
    </div>
  );
}
