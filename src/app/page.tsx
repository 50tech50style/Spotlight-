"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Lang = "en" | "es";

const COPY: Record<
  Lang,
  {
    brand: string;
    title: string;
    tagline: string;
    steps: { n: string; text: string }[];
    tip: string;
    actions: { performer: string; wrangler: string; stage: string };
    langEN: string;
    langES: string;
    chooseLanguage: string;
  }
> = {
  en: {
    brand: "CLUB E11EVEN",
    title: "SPOTLIGHT",
    tagline: "Stage rotation, without the crowd.",
    steps: [
      { n: "01", text: "Log in or create an account." },
      { n: "02", text: "Join the rotation when you’re ready." },
      { n: "03", text: "Get a 10-min & 5-min heads-up to prepare." },
    ],
    tip: "Tip: Keep notifications enabled so you don’t miss your call.",
    actions: {
      performer: "Performer Access",
      wrangler: "Stage Wrangler",
      stage: "View Stage Screen",
    },
    langEN: "English",
    langES: "Español",
    chooseLanguage: "Language",
  },
  es: {
    brand: "CLUB E11EVEN",
    title: "SPOTLIGHT",
    tagline: "Rotación de escenario, sin el tumulto.",
    steps: [
      { n: "01", text: "Inicia sesión o crea una cuenta." },
      { n: "02", text: "Entra a la rotación cuando estés lista." },
      { n: "03", text: "Recibe avisos de 10 min y 5 min para prepararte." },
    ],
    tip: "Tip: Mantén las notificaciones activas para no perder tu turno.",
    actions: {
      performer: "Acceso de Performer",
      wrangler: "Panel de Stage Wrangler",
      stage: "Ver Pantalla del Escenario",
    },
    langEN: "English",
    langES: "Español",
    chooseLanguage: "Idioma",
  },
};

    const GOLD = "#FFE066";

function LanguageToggle({
  lang,
  setLang,
  labels,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  labels: { chooseLanguage: string; langEN: string; langES: string };
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      <span className="text-[11px] md:text-xs tracking-[0.18em] uppercase text-zinc-200/70">
        {labels.chooseLanguage}
      </span>

      <div className="inline-flex rounded-full border border-white/10 bg-black/35 p-1 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setLang("en")}
          className={[
            "px-4 py-2 text-xs md:text-sm rounded-full tracking-wide transition",
            lang === "en"
              ? "bg-white text-black"
              : "text-zinc-200 hover:text-white",
          ].join(" ")}
        >
          {labels.langEN}
        </button>

        <button
          type="button"
          onClick={() => setLang("es")}
          className={[
            "px-4 py-2 text-xs md:text-sm rounded-full tracking-wide transition",
            lang === "es"
              ? "bg-white text-black"
              : "text-zinc-200 hover:text-white",
          ].join(" ")}
        >
          {labels.langES}
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("spotlight_lang") as Lang | null;
    if (saved === "en" || saved === "es") setLang(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("spotlight_lang", lang);
  }, [lang]);

  const t = useMemo(() => COPY[lang], [lang]);

  return (
    <div className="relative z-0 min-h-screen text-white flex items-center justify-center px-6 py-14 overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center scale-[1.03]"
        style={{
          backgroundImage: "url(/bg/e11even.jpg)",
          filter: "contrast(1.12) saturate(1.12) brightness(1.05)",
        }}
        aria-hidden="true"
      />

      {/* Lighter overlay */}
      <div className="absolute inset-0 z-0 bg-black/20" aria-hidden="true" />

      {/* Vignette (no blur) */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(70% 60% at 50% 28%, rgba(255,255,255,0.12), transparent 62%), radial-gradient(120% 110% at 50% 120%, rgba(0,0,0,0.35), rgba(0,0,0,0.70))",
        }}
        aria-hidden="true"
      />

      {/* Foreground panel */}
      <div className="relative z-10 w-full max-w-md md:max-w-lg text-center flex flex-col min-h-[78vh] rounded-3xl border border-white/12 bg-black/22 backdrop-blur-xl shadow-[0_0_70px_rgba(255,255,255,0.10)] px-6 py-10">
        <div className="flex-1 flex flex-col justify-center">
          <div className="space-y-6 md:space-y-7">
            <p
              className="text-[10px] md:text-xs tracking-[0.35em]"
              style={{
                color: GOLD,
                textShadow: "0 0 18px rgba(245,197,66,0.22)",
              }}
            >
              {t.brand}
            </p>

            <h1 className="mx-auto text-3xl md:text-4xl tracking-[0.28em] md:tracking-[0.32em] font-semibold text-shadow-[0_0_30px_rgba(255,255,255,0.18)]">
              {t.title}
            </h1>

            <p className="mx-auto max-w-sm text-sm md:text-base text-zinc-100/80 leading-relaxed">
              {t.tagline}
            </p>
          </div>

          <div className="my-10 md:my-12 flex items-center justify-center">
            <div
              className="h-px w-16 md:w-24 bg-gradient-to-r from-transparent to-transparent"
              style={{
                backgroundImage: `linear-gradient(to right, transparent, rgba(245,197,66,0.75), transparent)`,
                boxShadow: "0 0 16px rgba(245,197,66,0.18)",
              }}
            />
          </div>

          <div className="mx-auto max-w-sm md:max-w-md space-y-5 md:space-y-6 text-sm md:text-base text-zinc-50/85">
            {t.steps.map((s) => (
              <div key={s.n} className="flex justify-between gap-6">
                <span
                  className="tabular-nums"
                  style={{
                    color: GOLD,
                    textShadow: "0 0 16px rgba(245,197,66,0.18)",
                  }}
                >
                  {s.n}
                </span>
                <span className="flex-1 text-left">{s.text}</span>
              </div>
            ))}

            <p className="pt-2 text-[11px] md:text-xs text-zinc-100/55">
              {t.tip}
            </p>
          </div>

          <div className="mt-12 md:mt-14 space-y-4 md:space-y-5">
            <Link
              href="/login"
              className="block w-full rounded-full text-black py-3.5 md:py-4 text-sm md:text-base tracking-wide font-semibold transition hover:opacity-90 active:scale-[0.99]"
              style={{
                backgroundColor: GOLD,
                boxShadow:
                  "0 0 44px rgba(245,197,66,0.40), 0 0 90px rgba(245,197,66,0.16)",
              }}
            >
              {t.actions.performer}
            </Link>

            <Link
              href="/wrangler"
              className="block w-full rounded-full border border-white/20 text-white py-3.5 md:py-4 text-sm md:text-base tracking-wide transition hover:border-white/35 hover:bg-white/5"
            >
              {t.actions.wrangler}
            </Link>

            <Link
              href="/stage"
              className="block w-full py-2 text-xs md:text-sm text-zinc-100/60 tracking-[0.18em] uppercase transition hover:text-zinc-100"
            >
              {t.actions.stage}
            </Link>
          </div>
        </div>

        <div className="pt-10 md:pt-12">
          <LanguageToggle
            lang={lang}
            setLang={setLang}
            labels={{
              chooseLanguage: t.chooseLanguage,
              langEN: t.langEN,
              langES: t.langES,
            }}
          />
        </div>
      </div>
    </div>
  );
}