import { useRouterState } from "@tanstack/react-router";

export function WhatsAppFab() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname.startsWith("/admin")) return null;
  return (
    <a
      href="https://wa.me/37498580085"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp +374 98 58 00 85"
      className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 md:bottom-6 md:right-6 md:h-14 md:w-14"
    >
      <svg viewBox="0 0 32 32" fill="currentColor" className="h-6 w-6 md:h-7 md:w-7" aria-hidden="true">
        <path d="M16.003 3C9.374 3 4 8.373 4 15c0 2.387.701 4.612 1.905 6.495L4 29l7.736-1.852A11.94 11.94 0 0 0 16.003 28C22.633 28 28 22.627 28 16S22.633 3 16.003 3zm0 22.07a9.99 9.99 0 0 1-5.097-1.397l-.365-.217-4.59 1.099 1.107-4.475-.238-.379A9.96 9.96 0 0 1 6.04 15c0-5.504 4.464-9.97 9.963-9.97 5.5 0 9.964 4.466 9.964 9.97 0 5.502-4.464 10.07-9.964 10.07zm5.473-7.412c-.3-.151-1.777-.876-2.053-.975-.275-.1-.476-.151-.677.15-.2.302-.776.974-.951 1.175-.176.2-.351.225-.651.075-.301-.15-1.272-.469-2.422-1.495-.895-.798-1.499-1.784-1.674-2.086-.176-.301-.019-.464.132-.614.135-.135.301-.351.451-.527.15-.176.2-.301.301-.501.1-.2.05-.376-.025-.527-.075-.15-.677-1.633-.927-2.236-.244-.587-.491-.508-.677-.517l-.577-.01a1.1 1.1 0 0 0-.802.376c-.275.302-1.052 1.026-1.052 2.502s1.077 2.903 1.227 3.103c.15.2 2.123 3.241 5.143 4.547.719.31 1.28.494 1.717.633.722.23 1.379.197 1.898.12.579-.087 1.777-.726 2.028-1.427.25-.7.25-1.301.175-1.427-.075-.126-.276-.2-.577-.351z"/>
      </svg>
    </a>
  );
}