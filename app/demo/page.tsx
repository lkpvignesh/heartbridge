"use client";
import dynamic from "next/dynamic";

const Shell = dynamic(() => import("@/components/Shell"), { ssr: false, loading: () => <div className="grid min-h-screen place-items-center text-muted">Loading prototype…</div> });

export default function DemoPage() {
  return <Shell />;
}
