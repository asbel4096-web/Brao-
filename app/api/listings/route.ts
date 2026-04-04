import { NextResponse } from 'next/server';
import { featuredListings } from '@/lib/mock-data';

export async function GET() {
  return NextResponse.json({ ok: true, data: featuredListings });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({
    ok: true,
    message: 'نقطة نهاية تجريبية. اربطها لاحقًا مع Firestore أو server actions.',
    received: body
  });
}
