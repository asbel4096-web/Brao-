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
 * يُستخدم في الـheader. استبدلي القديم به.
 */

export function WalletTrigger() {
  const { user, profile } = useAuth();
  const { enabled } = useWalletEnabled();
  const [balance, setBalance] = useState<number>(
    Number((profile as any)?.walletBalance || 0)
  );

  // قراءة الرصيد realtime من وثيقة المستخدم
  useEffect(() => {
    if (!user?.uid) return;
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setBalance(Number(snap.data()?.walletBalance || 0));
      }
    });
    return () => unsub();
  }, [user?.uid]);

  // إخفاء كامل لو المحفظة معطّلة أو المستخدم غير مسجّل
  if (!enabled || !user) return null;

  return (
    <Link
      href="/wallet"
      className="
        inline-flex items-center gap-1.5 rounded-full
        bg-gradient-to-l from-blue-600 to-blue-700
        px-3 py-1.5 text-white shadow-sm
        transition active:scale-95 hover:shadow-md
      "
      aria-label="المحفظة"
    >
      <span className="text-[13px] font-black tabular-nums">
        {balance.toLocaleString("en-US")}
      </span>
      <span className="text-[11px] font-bold text-blue-100">BC</span>
      <Wallet size={15} strokeWidth={2.2} />
    </Link>
  );
}
