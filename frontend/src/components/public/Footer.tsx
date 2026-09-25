import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import {
  SiFacebook,
  SiInstagram,
  SiWhatsapp,
  SiX,
  SiYoutube,
} from "react-icons/si";
import NewsletterForm from "@/components/public/NewsletterForm";

type SocialLinks = {
  facebook?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  whatsapp?: string;
};

export default function PublicFooter({
  siteName,
  churchName,
  socialLinks,
  publisherId,
}: {
  siteName: string;
  churchName?: string | null;
  socialLinks?: SocialLinks | null;
  publisherId?: string;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-parchment-300 bg-parchment-100 dark:border-ink-800 dark:bg-ink-950">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mx-auto mb-8 max-w-xl rounded-2xl border border-parchment-300 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
          <NewsletterForm
            churchName={churchName ?? siteName}
            publisherId={publisherId}
          />
        </div>

        <div className="text-center">
          <p className="font-display text-lg font-semibold text-ink-900 dark:text-parchment-50">
            {siteName}
          </p>
          {churchName && (
            <p className="mt-1 text-sm text-ink-500 dark:text-parchment-300">
              {churchName}
            </p>
          )}

          {socialLinks && Object.values(socialLinks).some(Boolean) && (
            <div className="mt-5 flex justify-center gap-4">
              {socialLinks.facebook && (
                <a
                  href={socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  title="Facebook"
                  className="flex h-[18px] w-[18px] items-center justify-center text-ink-400 hover:text-gold-700 dark:hover:text-gold-400"
                >
                  <SiFacebook size={18} aria-hidden="true" />
                </a>
              )}
              {socialLinks.twitter && (
                <a
                  href={socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X"
                  title="X"
                  className="flex h-[18px] w-[18px] items-center justify-center text-ink-400 hover:text-gold-700 dark:hover:text-gold-400"
                >
                  <SiX size={17} aria-hidden="true" />
                </a>
              )}
              {socialLinks.instagram && (
                <a
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  title="Instagram"
                  className="flex h-[18px] w-[18px] items-center justify-center text-ink-400 hover:text-gold-700 dark:hover:text-gold-400"
                >
                  <SiInstagram size={18} aria-hidden="true" />
                </a>
              )}
              {socialLinks.youtube && (
                <a
                  href={socialLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  title="YouTube"
                  className="flex h-[18px] w-[18px] items-center justify-center text-ink-400 hover:text-gold-700 dark:hover:text-gold-400"
                >
                  <SiYoutube size={20} aria-hidden="true" />
                </a>
              )}
              {socialLinks.whatsapp && (
                <a
                  href={`https://wa.me/${socialLinks.whatsapp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  title="WhatsApp"
                  className="text-ink-400 hover:text-gold-700 dark:hover:text-gold-400"
                >
                  <SiWhatsapp size={18} aria-hidden="true" />
                </a>
              )}
            </div>
          )}

          <p className="mt-6 text-xs text-ink-400 dark:text-parchment-500">
            © {year} {siteName}. All rights reserved. ·{" "}
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white/80 px-3 py-1.5 text-xs font-semibold tracking-wide text-ink-700 shadow-sm transition hover:-translate-y-0.5 hover:border-gold-400 hover:text-gold-700 dark:border-ink-700 dark:bg-ink-900/80 dark:text-parchment-200 dark:hover:border-gold-500 dark:hover:text-gold-300"
            >
              <ShieldCheck size={14} />
              Admin
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
