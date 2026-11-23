import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/lib/orca/i18n";
import { policyCopy } from "@/lib/orca/policy-copy";
import { Footer } from "@/components/Footer";
import { MatsyaLoader } from "@/components/orca/MatsyaLoader";
import { ServiceState } from "@/components/orca/ServiceState";
import {
  APP_NAME,
  DEFAULT_PUBLIC_BASE_URL,
  POWERED_BY,
  getAssistantPersona,
  getLocalizedAppName,
  askAssistantLabel,
} from "@/lib/brand";
import {
  chatCopy,
  landingCopy,
  authOceanCopy,
  voiceCopy,
  safetyCopy,
  mapPanelCopy,
  snapshotStaleCopy,
  serviceStateCopy,
} from "@/lib/orca/ui-copy";
import type { LangCode } from "@/lib/orca/i18n";

describe("Matsya rebrand, loader, and localized personas", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
  });

  it("renders MatsyaLoader with animated wave, brand copy, and custom status in light and dark mode", () => {
    const { container, rerender } = render(
      <I18nProvider>
        <MatsyaLoader variant="fullscreen" message="Loading sea data" />
      </I18nProvider>,
    );

    expect(screen.getByText(APP_NAME)).toBeInTheDocument();
    expect(screen.getByText(POWERED_BY)).toBeInTheDocument();
    expect(screen.getByText("Loading sea data")).toBeInTheDocument();
    expect(screen.queryByText(/ORCA Marine/i)).not.toBeInTheDocument();
    expect(container.querySelector(".matsya-wave-motion")).not.toBeNull();
    expect(container.querySelector(".matsya-fish-motion")).not.toBeNull();
    expect(container.querySelector(".matsya-bar-motion")).not.toBeNull();

    // Verify dark mode renders identically without old branding
    document.documentElement.classList.add("dark");
    rerender(
      <I18nProvider>
        <MatsyaLoader variant="section" message="Checking weather" />
      </I18nProvider>,
    );
    expect(screen.getByText("Checking weather")).toBeInTheDocument();
    expect(screen.queryByText(/ORCA Marine/i)).not.toBeInTheDocument();
  });

  it("maps every language to the configured persona and falls back to Sagar Mitra", () => {
    expect(getAssistantPersona("gu").latin).toBe("Nakhuda");
    expect(getAssistantPersona("gu").display).toBe("નાખુદા");
    expect(getAssistantPersona("mr").latin).toBe("Daryasarang");
    expect(getAssistantPersona("mr").display).toBe("दर्यासारंग");
    expect(getAssistantPersona("kn").latin).toBe("Ambiga");
    expect(getAssistantPersona("kn").display).toBe("ಅಂಬಿಗ");
    expect(getAssistantPersona("ml").latin).toBe("Kappithan");
    expect(getAssistantPersona("ml").display).toBe("കപ്പിത്താൻ");
    expect(getAssistantPersona("ta").latin).toBe("Kadal Thunai");
    expect(getAssistantPersona("ta").display).toBe("கடல் துணை");
    expect(getAssistantPersona("bn").latin).toBe("Majhi");
    expect(getAssistantPersona("bn").display).toBe("মাঝি");
    expect(getAssistantPersona("or").latin).toBe("Majhi");
    expect(getAssistantPersona("or").display).toBe("ମାଝି");
    expect(getAssistantPersona("hi").latin).toBe("Sagar Mitra");
    expect(getAssistantPersona("hi").display).toBe("सागर मित्र");
    expect(getAssistantPersona("te").latin).toBe("Sagar Mitra");
    expect(getAssistantPersona("en").latin).toBe("Sagar Mitra");
    expect(getAssistantPersona("pa").latin).toBe("Sagar Mitra");

    // Unknown or missing languages fall back to Sagar Mitra
    expect(getAssistantPersona("fr").display).toBe("Sagar Mitra");
    expect(getAssistantPersona("").display).toBe("Sagar Mitra");
    expect(getAssistantPersona(undefined).display).toBe("Sagar Mitra");
    expect(askAssistantLabel("gu")).toContain("નાખુદા");
    expect(askAssistantLabel("unknown")).toContain("Sagar Mitra");
  });

  it("renders Matsya branding on error/unavailable service state", () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <ServiceState kind="backend" />
        </I18nProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText(/Matsya is temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/ORCA is temporarily unavailable/i)).not.toBeInTheDocument();
  });

  it("exposes localized persona metadata for every supported Indian language", () => {
    const expectedLanguages = ["en", "hi", "gu", "mr", "ta", "te", "ml", "bn", "kn", "or", "pa"];
    for (const code of expectedLanguages) {
      const persona = getAssistantPersona(code);
      expect(persona.display.length).toBeGreaterThan(0);
      expect(persona.speakingLabel).toContain(persona.display);
      expect(persona.placeholder.length).toBeGreaterThan(0);
      expect(persona.askLabel.length).toBeGreaterThan(0);
      expect(persona.voiceHint.length).toBeGreaterThan(0);
      expect(persona.placeholder).not.toMatch(/ORCA/i);
      expect(persona.askLabel).not.toMatch(/ORCA/i);
    }
  });

  it("uses https://matsya.app as the default public base URL", () => {
    expect(DEFAULT_PUBLIC_BASE_URL).toBe("https://matsya.app");
  });

  it("includes support@matsya.app in every language privacy policy and Footer", () => {
    for (const entry of Object.values(policyCopy)) {
      expect(entry.privacy.join(" ")).toContain("support@matsya.app");
    }
    render(
      <MemoryRouter>
        <I18nProvider>
          <Footer />
        </I18nProvider>
      </MemoryRouter>,
    );
    const supportLink = screen.getByRole("link", { name: /support@matsya\.app/i });
    expect(supportLink).toHaveAttribute("href", "mailto:support@matsya.app");
  });

  it("translates Matsya brand name and chat/landing/map/voice UI copy across all 11 languages", () => {
    const nonEnglish: LangCode[] = ["hi", "gu", "mr", "ta", "te", "ml", "bn", "kn", "or", "pa"];
    expect(getLocalizedAppName("en")).toBe("Matsya");
    for (const code of nonEnglish) {
      expect(getLocalizedAppName(code)).not.toBe("Matsya");
      expect(chatCopy[code].welcome).not.toBe(chatCopy.en.welcome);
      expect(chatCopy[code].history).not.toBe(chatCopy.en.history);
      expect(landingCopy[code].title).not.toBe(landingCopy.en.title);
      expect(authOceanCopy[code].headline).not.toBe(authOceanCopy.en.headline);
      expect(voiceCopy[code].conversation).not.toBe(voiceCopy.en.conversation);
      expect(safetyCopy[code].insufficientLive).not.toBe(safetyCopy.en.insufficientLive);
      expect(mapPanelCopy[code].details).not.toBe(mapPanelCopy.en.details);
      expect(snapshotStaleCopy[code]).not.toBe(snapshotStaleCopy.en);
      expect(serviceStateCopy[code].expired).not.toBe(serviceStateCopy.en.expired);
    }
  });
});
