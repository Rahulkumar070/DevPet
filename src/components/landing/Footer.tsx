import Link from "next/link";
import { GithubIcon } from "@/components/icons/GithubIcon";

export function Footer() {
  return (
    <footer className="border-t border-black/[.06] py-10 px-4 bg-[#f5f3ed]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h3 className="font-['Jost',sans-serif] font-extrabold text-lg">DevPet</h3>
            <p className="text-sm text-[#999] mt-0.5">Your AI coding companion</p>
          </div>

          <div className="flex gap-5">
            <Link
              href="https://github.com/devpet"
              target="_blank"
              className="flex items-center gap-1.5 text-sm text-[#999] hover:text-[#1a1a1a] transition-colors"
            >
              <GithubIcon className="w-4 h-4" />
              GitHub
            </Link>
            <Link href="#" className="text-sm text-[#999] hover:text-[#1a1a1a] transition-colors">
              VSCode Extension
            </Link>
            <Link href="#" className="text-sm text-[#999] hover:text-[#1a1a1a] transition-colors">
              Docs
            </Link>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-black/[.05] text-center text-xs text-[#bbb]">
          © 2026 DevPet. Made with ❤️ for developers.
        </div>
      </div>
    </footer>
  );
}
