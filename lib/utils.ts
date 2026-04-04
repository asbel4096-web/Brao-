import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(value: number | string | undefined) {
  const numeric = Number(value ?? 0);
  if (Number.isNaN(numeric)) return `${value ?? ''} د.ل`;
  return `${new Intl.NumberFormat('ar-LY').format(numeric)} د.ل`;
}

export function normalizePhone(phone: string) {
  const raw = phone.replace(/\s+/g, '').trim();
  if (raw.startsWith('+')) return raw;
  if (raw.startsWith('218')) return `+${raw}`;
  if (raw.startsWith('0')) return `+218${raw.slice(1)}`;
  return raw;
}

export function whatsappLink(phone: string) {
  const normalized = normalizePhone(phone).replace('+', '');
  return `https://wa.me/${normalized}`;
}
