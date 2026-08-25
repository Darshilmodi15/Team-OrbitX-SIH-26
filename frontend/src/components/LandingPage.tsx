import { Anchor, Bell, Bot, CloudSun, Globe2, ShieldCheck, Waves } from 'lucide-react';
import { getLanguageDisplay, getStrings } from '../i18n';

interface LandingPageProps {
  currentLang: string;
  onGetStarted: () => void;
  onExplorePlatform: () => void;
  onSelectLanguage: () => void;
}

export default function LandingPage({
  currentLang,
  onGetStarted,
  onExplorePlatform,
  onSelectLanguage,
}: LandingPageProps) {
  const t = getStrings(currentLang);

  const capabilities = [
    { title: t.capabilitySafety, body: t.capabilitySafetyDesc, icon: ShieldCheck },
    { title: t.capabilityWeather, body: t.capabilityWeatherDesc, icon: Waves },
    { title: t.capabilityBoundaries, body: t.capabilityBoundariesDesc, icon: Bell },
    { title: t.capabilityAssistant, body: t.capabilityAssistantDesc, icon: Bot },
  ];

  return (
    <div className="min-h-screen overflow-y-auto bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0B3D5B] text-white">
              <Anchor className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-[#0B3D5B]">{t.brand}</p>
              <p className="hidden truncate text-xs font-medium text-slate-500 sm:block">{t.descriptor}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSelectLanguage}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50"
            >
              <Globe2 className="h-4 w-4 text-teal-700" aria-hidden="true" />
              <span className="max-w-[92px] truncate sm:max-w-none">{getLanguageDisplay(currentLang)}</span>
            </button>
            <button
              type="button"
              onClick={onGetStarted}
              className="hidden min-h-10 rounded-lg bg-[#0B3D5B] px-4 text-sm font-bold text-white transition hover:bg-[#082C42] sm:inline-flex sm:items-center"
            >
              {t.getStarted}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid min-h-[calc(100vh-68px)] max-w-6xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-teal-800">
              <CloudSun className="h-3.5 w-3.5" aria-hidden="true" />
              {t.descriptor}
            </div>
            <h1 className="text-balance text-4xl font-extrabold leading-tight tracking-normal text-[#0B3D5B] sm:text-5xl lg:text-6xl">
              {t.brand}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">{t.landingIntro}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onGetStarted}
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#0B3D5B] px-6 text-base font-bold text-white shadow-sm transition hover:bg-[#082C42]"
              >
                {t.getStarted}
              </button>
              <button
                type="button"
                onClick={onExplorePlatform}
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-300 bg-white px-6 text-base font-bold text-slate-800 transition hover:border-teal-300 hover:bg-teal-50"
              >
                {t.explorePlatform}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {capabilities.map(({ title, body, icon: Icon }) => (
              <article key={title} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-teal-700">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-950">{title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
