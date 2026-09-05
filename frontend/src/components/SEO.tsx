import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  type?: string;
  canonical?: string;
}

const DEFAULT_TITLE = "ORCA Marine AI — Autonomous Ocean Intelligence & Decision Support";
const DEFAULT_DESCRIPTION =
  "Agentic AI-powered conversational marine platform integrating satellite Earth Observation, PFZ discovery, safe route navigation, and IMBL geofencing for SIH 2026.";
const DEFAULT_IMAGE = "/og-image.png";
const BASE_URL = import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin;

export function SEO({
  title,
  description,
  keywords,
  image,
  type = "website",
  canonical,
}: SEOProps) {
  const location = useLocation();

  useEffect(() => {
    const fullTitle = title
      ? title.includes("ORCA")
        ? title
        : `${title} | ORCA Marine AI`
      : DEFAULT_TITLE;
    const finalDesc = description || DEFAULT_DESCRIPTION;
    const finalImage = image || DEFAULT_IMAGE;
    const finalCanonical = canonical || `${BASE_URL}${location.pathname}`;

    // Update document title
    document.title = fullTitle;

    // Helper to set or create meta tag
    const setMeta = (selector: string, attrName: string, attrVal: string, contentVal: string) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attrName, attrVal);
        document.head.appendChild(element);
      }
      element.setAttribute("content", contentVal);
    };

    // Standard Meta
    setMeta('meta[name="description"]', "name", "description", finalDesc);
    if (keywords) {
      setMeta('meta[name="keywords"]', "name", "keywords", keywords);
    }

    // Open Graph
    setMeta('meta[property="og:title"]', "property", "og:title", fullTitle);
    setMeta('meta[property="og:description"]', "property", "og:description", finalDesc);
    setMeta('meta[property="og:url"]', "property", "og:url", finalCanonical);
    setMeta('meta[property="og:type"]', "property", "og:type", type);
    setMeta('meta[property="og:image"]', "property", "og:image", finalImage);

    // Twitter Card
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", fullTitle);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", finalDesc);
    setMeta('meta[name="twitter:image"]', "name", "twitter:image", finalImage);

    // Canonical link
    let linkCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!linkCanonical) {
      linkCanonical = document.createElement("link");
      linkCanonical.setAttribute("rel", "canonical");
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute("href", finalCanonical);
  }, [title, description, keywords, image, type, canonical, location.pathname]);

  return null;
}
