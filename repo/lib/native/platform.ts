import { Capacitor } from "@capacitor/core";

/** هل نعمل داخل تطبيق أصلي (Android/iOS) أم على الويب؟ */
export const isNative = (): boolean => Capacitor.isNativePlatform();

/** "ios" | "android" | "web" */
export const getPlatform = (): string => Capacitor.getPlatform();

export const isAndroid = (): boolean => Capacitor.getPlatform() === "android";
export const isIOS = (): boolean => Capacitor.getPlatform() === "ios";
