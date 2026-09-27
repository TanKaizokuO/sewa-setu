import Image from "next/image";

/** Official Sewa Setu wordmark. Its tagline is dark ink, so in dark mode it sits on a white chip. */
export function Logo({ className = "h-10" }: { className?: string }) {
  return (
    <Image
      src="/sewa-setu-logo.png"
      alt="सेवा सेतु — जनता के द्वार, डिजिटल सरकार"
      width={156}
      height={80}
      priority
      className={`w-auto dark:rounded-md dark:bg-white dark:px-1 ${className}`}
    />
  );
}
