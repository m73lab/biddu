import { GetStaticProps } from "next";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { getMessages } from "@/i18n/getMessages";
import { Locale } from "@/i18n/config";
import {
  SEO,
  SITE_URL,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_AUTHOR,
  SITE_AUTHOR_URL,
} from "@/components/common";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Footer } from "@/components/landing/Footer";

const SECTION_LINKS = [
  { href: "#caracteristicas", key: "features" },
  { href: "#como-funciona", key: "howItWorks" },
  { href: "#casos", key: "useCases" },
  { href: "#faq", key: "faq" },
] as const;

// Dynamically import below-the-fold components to reduce initial bundle
const FeatureGrid = dynamic(
  () =>
    import("@/components/landing/FeatureGrid").then((mod) => mod.FeatureGrid),
  { ssr: true },
);

const HowItWorks = dynamic(
  () => import("@/components/landing/HowItWorks").then((mod) => mod.HowItWorks),
  { ssr: true },
);

const UseCases = dynamic(
  () => import("@/components/landing/UseCases").then((mod) => mod.UseCases),
  { ssr: true },
);

const FaqSection = dynamic(
  () => import("@/components/landing/FaqSection").then((mod) => mod.FaqSection),
  { ssr: true },
);

const CallToAction = dynamic(
  () =>
    import("@/components/landing/CallToAction").then((mod) => mod.CallToAction),
  { ssr: true },
);

// Heavy animation component - no SSR needed
const ImpactVisualization = dynamic(
  () =>
    import("@/components/landing/ImpactVisualization").then(
      (mod) => mod.ImpactVisualization,
    ),
  { ssr: false },
);

export default function LandingPage() {
  // La pagina es estatica para un TTFB rapido en movil; los usuarios
  // autenticados se redirigen al dashboard en el cliente.
  const { status } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  // Homepage-specific structured data for better SEO
  const homepageStructuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Biddu - Plataforma de Subastas Gratuita",
    alternateName: [
      "Plataforma de Subastas Biddu",
      "Software de Remates Gratis",
      "Software de Subastas Gratis de Código Abierto",
    ],
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Software de Subastas Comunitarias",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "CLP",
      availability: "https://schema.org/InStock",
      priceValidUntil: "2030-12-31",
      description:
        "Completamente gratis y de código abierto - sin comisiones, sin tarjeta de crédito",
    },
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    author: {
      "@type": "Person",
      name: SITE_AUTHOR,
      url: SITE_AUTHOR_URL,
    },
    publisher: {
      "@type": "Person",
      name: SITE_AUTHOR,
      url: SITE_AUTHOR_URL,
    },
    license: "https://opensource.org/licenses/MIT",
    isAccessibleForFree: true,
    screenshot: `${SITE_URL}/og-image.png`,
    softwareVersion: "1.0",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5",
      ratingCount: "1",
      bestRating: "5",
      worstRating: "1",
    },
    featureList: [
      "Plataforma de subastas gratuita",
      "Software de remates gratis",
      "Pujas en tiempo real",
      "Modo subasta silenciosa",
      "Subastas privadas solo por invitación",
      "Gestión de miembros con permisos por roles",
      "Soporte multi-moneda (CLP, USD y más)",
      "Carga de imágenes",
      "Notificaciones por correo en español",
      "Diseño responsive",
      "Auto-alojamiento con Docker",
      "Licencia MIT de código abierto",
      "Sin comisiones de pago",
      "Subastas y lotes ilimitados",
    ],
    keywords:
      "plataforma subastas chile, remate online, subasta gratis, subastas beneficencia",
  };

  // FAQ structured data for common questions
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "¿Biddu es realmente gratis?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sí, Biddu es 100% gratis y de código abierto bajo licencia MIT. Sin comisiones ni límites: autoalójala en tu propio servidor.",
        },
      },
      {
        "@type": "Question",
        name: "¿Cómo se cobra si alguien gana una puja?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "El pago es 100% offline: el ganador coordina directamente con el dueño del artículo. La plataforma no procesa pagos ni cobra comisiones; solo lleva el registro: pendiente de pago, pagado y entregado.",
        },
      },
      {
        "@type": "Question",
        name: "¿Necesito RUT para registrarme?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No, el RUT es opcional. Solo necesitas nombre, correo y contraseña.",
        },
      },
      {
        "@type": "Question",
        name: "¿En qué moneda son las pujas?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "En la moneda que elijas al crear la subasta, con formato y hora local correspondientes.",
        },
      },
      {
        "@type": "Question",
        name: "¿Puedo tener Biddu en mi propio servidor?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sí, es autoalojable con Docker y licencia MIT.",
        },
      },
    ],
  };

  return (
    <>
      <SEO
        description={SITE_DESCRIPTION}
        keywords={SITE_KEYWORDS}
        canonical={SITE_URL}
        structuredData={homepageStructuredData}
      />
      {/* FAQ structured data for search engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqStructuredData),
        }}
      />

      <div className="min-h-dvh bg-base-100 text-base-content selection:bg-gold-500/30">
        <Navbar links={SECTION_LINKS} />

        <main>
          <Hero />
          <FeatureGrid />
          <HowItWorks />
          <ImpactVisualization />
          <UseCases />
          <FaqSection />
          <CallToAction />
        </main>

        <Footer />
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps = async (context) => {
  const messages = await getMessages(context.locale as Locale);

  return {
    props: {
      messages,
    },
    // El copy del landing cambia poco; revalidar cada hora.
    revalidate: 3600,
  };
};
