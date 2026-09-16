import { Suspense } from "react";
import SetupAccountClient from "./SetupAccountClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Set Up Your Account | PRISM",
};

export default function SetupAccountPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/prl-logo.png" alt="" width={600} height={600} className="select-none max-w-[80vw]" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
          <Suspense fallback={<div className="text-center py-8 text-gray-500 text-sm">Loading...</div>}>
            <SetupAccountClient />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
