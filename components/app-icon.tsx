type AppIconProps = {
  size?: "sm" | "md" | "lg";
};

export default function AppIcon({ size = "md" }: AppIconProps) {
  const sizeMap = {
    sm: "h-12 w-12 text-xl rounded-[16px]",
    md: "h-16 w-16 text-3xl rounded-[22px]",
    lg: "h-24 w-24 text-5xl rounded-[28px]"
  };

  return (
    <div
      className={`flex items-center justify-center bg-[#2F49C8] text-white font-black shadow-[0_14px_28px_rgba(47,73,200,0.28)] ${sizeMap[size]}`}
    >
      BC
    </div>
  );
}
