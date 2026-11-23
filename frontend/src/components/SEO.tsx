import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { APP_NAME, TAGLINE, getPublicBaseUrl } from "@/lib/brand";

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  type?: string;
  canonical?: string;
}

const DEFAULT_TITLE = `${APP_NAME} — Coastal Safety & Marine Decision Support`;
const DEFAULT_DESCRIPTION = `${TAGLINE} — coastal safety alerts, sea conditions, Potential Fishing Zone discovery, IMBL geofencing, and multilingual voice assistance across India's coastline.`;
const DEFAULT_IMAGE = "/og-image.png?v=5";
const BASE_URL = getPublicBaseUrl();

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
      ? title.includes(APP_NAME)
        ? title
        : `${title} | ${APP_NAME}`
      : DEFAULT_TITLE;
    const finalDesc = description || DEFAULT_DESCRIPTION;
    const rawImage = image || DEFAULT_IMAGE;
    const finalImage =
      rawImage.startsWith("/") && BASE_URL ? `${BASE_URL}${rawImage}` : rawImage;
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
