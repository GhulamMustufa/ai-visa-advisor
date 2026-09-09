"use client";

import { useRouter } from "next/navigation";
import { RESULT_STORAGE_KEY } from "@/lib/storage";

export function RecentAssessmentCard({ 
  item, 
  children 
}: { 
  item: any; 
  children: React.ReactNode 
}) {
  const router = useRouter();

  const handleClick = () => {
    // Rehydrate the stored result format
    const storedData = {
      profileSummary: item.profile,
      pathways: (item.result?.pathways || []).map((p: any) => ({
        ...p,
        baseScore: typeof p.baseScore === "number" ? p.baseScore : (typeof p.score === "number" ? p.score : 0),
      })),
      whatIfs: item.result?.whatIfs || []
    };
    
    sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(storedData));
    router.push("/results");
  };

  return (
    <li 
      onClick={handleClick} 
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-soft cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors"
    >
      {children}
    </li>
  );
}
