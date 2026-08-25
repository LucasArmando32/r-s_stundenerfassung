"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocale } from "@/i18n/actions";

const OPTIONS = [
  { code: "de", label: "DE" },
  { code: "es", label: "ES" },
];

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(code) {
    if (code === locale) return;
    startTransition(async () => {
      await setLocale(code);
      router.refresh();
    });
  }

  return (
    <div className="inline-flex rounded-md border border-neutral-300 overflow-hidden text-sm">
      {OPTIONS.map((opt) => (
        <button
          key={opt.code}
          type="button"
          disabled={isPending}
          onClick={() => handleChange(opt.code)}
          className={`px-2.5 py-1 font-medium transition-colors ${
            locale === opt.code
              ? "bg-brand text-white"
              : "bg-white text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
