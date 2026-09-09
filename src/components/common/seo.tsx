import Head from "next/head";

export const SITE_URL = "https://biddu.cl";
export const SITE_NAME = "Biddu";
export const SITE_AUTHOR = "Biddu";
export const SITE_AUTHOR_URL = "https://biddu.cl";
export const SITE_TWITTER = "@biddu";

export const SITE_KEYWORDS = [
  "plataforma subastas chile",
  "subastas online gratis",
  "subasta privada chile",
  "subastas en vivo",
  "plataforma subastas gratuita",
  "subastas silenciosas",
  "subastas beneficencia chile",
  "subastas bomberos",
  "subastas club deportivo",
  "remate online chile",
  "remate privado",
  "plataforma remates",
  "subastas pymes chile",
  "liquidacion empresas chile",
  "subastas entre amigos",
  "subastas familiares",
  "subastas oficina",
  "software subastas abierto",
  "codigo abierto subastas",
  "autoalojamiento subastas",
  "pujas tiempo real",
  "subastas multiples monedas",
  "subasta sin comisiones",
  "subasta gratis",
].join(", ");

export const SITE_DESCRIPTION =
  "Biddu es una plataforma de subastas 100% gratuita y de código abierto para Chile. Ideal para eventos benéficos, clubes, bomberos, pymes y uso personal. Crea subastas ilimitadas con pujas en tiempo real, gestión de miembros y soporte multi-moneda. Sin comisiones, sin límites.";

export const SITE_DESCRIPTION_SHORT =
  "Plataforma de subastas gratuita y de código abierto para Chile. Subastas privadas con pujas en tiempo real — completamente gratis, sin comisiones.";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  noindex?: boolean;
  ogType?: "website" | "article" | "product";
  ogImage?: string;
  ogImageAlt?: string;
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    section?: string;
    tags?: string[];
  };
  structuredData?: object;
}

export function SEO({
  title,
  description = SITE_DESCRIPTION_SHORT,
  keywords = SITE_KEYWORDS,
  canonical,
  noindex = false,
  ogType = "website",
  ogImage = `${SITE_URL}/pictures/og-image.png`,
  ogImageAlt = "Biddu - Plataforma de Subastas",
  article,
  structuredData,
}: SEOProps) {
  const fullTitle = title
    ? `${title} | ${SITE_NAME}`
    : `${SITE_NAME} - Plataforma de Subastas Gratuita para Chile`;

  const canonicalUrl = canonical || SITE_URL;

  const defaultStructuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Auction Software",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "CLP",
    },
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    author: {
      "@type": "Organization",
      name: SITE_AUTHOR,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_AUTHOR,
    },
    license: "https://opensource.org/licenses/MIT",
    isAccessibleForFree: true,
    featureList: [
      "Pujas en tiempo real",
      "Subastas privadas",
      "Gestión de miembros",
      "Soporte multi-moneda",
      "Carga de imágenes",
      "Notificaciones por correo",
      "Diseño responsive",
      "Autoalojamiento",
    ],
  };

  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: SITE_DESCRIPTION_SHORT,
  };

  const websiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION_SHORT,
    publisher: {
      "@type": "Organization",
      name: SITE_AUTHOR,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={SITE_AUTHOR} />
      <meta name="creator" content={SITE_AUTHOR} />
      <meta name="publisher" content={SITE_AUTHOR} />

      <meta
        name="robots"
        content={
          noindex
            ? "noindex, nofollow"
            : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        }
      />
      <meta
        name="googlebot"
        content={noindex ? "noindex, nofollow" : "index, follow"}
      />
      <meta
        name="bingbot"
        content={noindex ? "noindex, nofollow" : "index, follow"}
      />

      <meta name="language" content="es" />
      <meta httpEquiv="content-language" content="es-CL" />

      <meta name="revisit-after" content="3 days" />
      <meta name="rating" content="general" />
      <meta name="distribution" content="global" />

      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:secure_url" content={ogImage} />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={ogImageAlt} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="es_CL" />

      {article && (
        <>
          {article.publishedTime && (
            <meta property="article:published_time" content={article.publishedTime} />
          )}
          {article.modifiedTime && (
            <meta property="article:modified_time" content={article.modifiedTime} />
          )}
          {article.author && (
            <meta property="article:author" content={article.author} />
          )}
          {article.section && (
            <meta property="article:section" content={article.section} />
          )}
          {article.tags?.map((tag, i) => (
            <meta key={i} property="article:tag" content={tag} />
          ))}
        </>
      )}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={SITE_TWITTER} />
      <meta name="twitter:creator" content={SITE_TWITTER} />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={ogImageAlt} />

      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content={SITE_NAME} />
      <meta name="application-name" content={SITE_NAME} />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="format-detection" content="telephone=no" />

      <meta name="theme-color" content="#6366f1" />
      <meta name="msapplication-TileColor" content="#6366f1" />
      <meta name="msapplication-navbutton-color" content="#6366f1" />

      <link rel="icon" href="/favicon.ico" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/site.webmanifest" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData || defaultStructuredData),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationData),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteData),
        }}
      />
    </Head>
  );
}

export const pageSEO = {
  home: {
    title: undefined,
    description: SITE_DESCRIPTION,
    keywords: SITE_KEYWORDS,
  },
  login: {
    title: "Iniciar Sesión",
    description:
      "Inicia sesión en Biddu para gestionar tus subastas, pujar y seguir tus eventos. Plataforma gratuita de subastas para Chile.",
    keywords:
      "login subastas, iniciar sesion subasta, subasta chile acceso",
    noindex: true,
  },
  register: {
    title: "Crear Cuenta Gratis",
    description:
      "Crea una cuenta gratis en Biddu para comenzar a subastar. Sin tarjeta de crédito — completamente gratis y de código abierto.",
    keywords:
      "crear cuenta subasta, registro subasta gratis, subasta chile registro",
    noindex: true,
  },
  dashboard: {
    title: "Panel",
    description:
      "Gestiona tus subastas, sigue tus pujas activas y revisa tu progreso. Tu centro de control para todas tus subastas.",
    noindex: true,
  },
  createAuction: {
    title: "Crear Nueva Subasta",
    description:
      "Crea una nueva subasta para tu evento, organización o uso personal. Configura subastas privadas o públicas.",
    noindex: true,
  },
  privacy: {
    title: "Política de Privacidad",
    description:
      "Política de Privacidad de Biddu — Cómo protegemos tus datos. Plataforma de código abierto comprometida con la seguridad.",
    keywords:
      "privacidad subasta, proteccion datos, subasta plataforma privacidad",
    noindex: true,
  },
  terms: {
    title: "Términos de Servicio",
    description:
      "Términos de Servicio de Biddu — Conoce los términos y condiciones para usar nuestra plataforma de subastas gratuita.",
    keywords:
      "terminos subasta, condiciones uso, plataforma subastas terminos",
    noindex: true,
  },
};

export default SEO;
