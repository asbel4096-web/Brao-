"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { Wallet } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletEnabled } from "@/hooks/use-wallet-enabled";

/**
 * WalletTrigger - زر المحفظة في الشريط العلوي.
 *
 * - يعرض رصيد BC الحالي
 * - يربط بصفحة /wallet (وليس bottom sheet)
 * - يختفي تماماً لو الأدمن أخفى المحفظة (walletEnabled = false)
 *
 * Props:
 *   variant?: "compact" | "full"  (اختياري - للتوافق مع الاستخدام القديم)
 *   className?: string
 *
 * يُستخدم في الـheader. استبدلي القديم به.
 */

interface WalletTriggerProps {
  variant?: "compact" | "full";
  className?: string;
}

export function WalletTrigger({ variant = "full", className = "" }: WalletTriggerProps) {
  const { user, profile } = useAuth();
  const { enabled } = useWalletEnabled();
  const [balance, setBalance] = useState<number>(
    Number((profile as any)?.balance || 0)
  );

  // قراءة الرصيد realtime من وثيقة المستخدم
  useEffect(() => {
    if (!user?.uid) return;
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setBalance(Number(snap.data()?.balance || 0));
      }
    });
    return () => unsub();
  }, [user?.uid]);

  // إخفاء كامل لو المحفظة معطّلة أو المستخدم غير مسجّل
  if (!enabled || !user) return null;

  const isCompact = variant === "compact";

  return (
    <Link
      href="/wallet"
      className={`
        inline-flex items-center gap-1.5 rounded-full
        bg-gradient-to-l from-blue-600 to-blue-700
        text-white shadow-sm
        transition active:scale-95 hover:shadow-md
        ${isCompact ? "px-2.5 py-1" : "px-3 py-1.5"}
        ${className}
      `}
      aria-label="المحفظة"
    >
      <span className={`font-black tabular-nums ${isCompact ? "text-[12px]" : "text-[13px]"}`}>
        {balance.toLocaleString("en-US")}
      </span>
      <span className="text-[11px] font-bold text-blue-100">BC</span>
      <Wallet size={isCompact ? 14 : 15} strokeWidth={2.2} />
    </Link>
  );
}
