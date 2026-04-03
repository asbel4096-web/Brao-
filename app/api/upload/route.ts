import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    ok: true,
    message: 'هذه نقطة رفع تجريبية. عند التفعيل الحقيقي اربطها مع Firebase Storage أو خدمة تخزين آمنة.'
  });
}
