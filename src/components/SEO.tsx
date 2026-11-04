import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_URL = 'https://www.yatricloud.com';
const SITE_NAME = 'Yatri Cloud';
const DEFAULT_IMAGE =
  'https://raw.githubusercontent.com/yatricloud/yatri-images/refs/heads/main/Logo/yatricloud-round-transparent.png';

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  type?: string;
  url?: string;
  canonical?: string;
  noindex?: boolean;
  breadcrumbs?: BreadcrumbItem[];
  faqs?: FAQItem[];
  jsonLd?: object | object[];
  // Article-specific
  articleAuthor?: string;
  articleTags?: string[];
  articleSection?: string;
  articlePublishedTime?: string;
  articleModifiedTime?: string;
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

export function buildFAQSchema(faqs: FAQItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function buildQuizSchema(title: string, description: string, questionsCount: number) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Quiz',
    name: title,
    description: description,
    educationalLevel: 'Professional',
    about: {
      '@type': 'Thing',
      name: 'Cloud Computing Certification Exam',
    },
    hasPart: {
      '@type': 'Question',
      name: `Practice Questions (${questionsCount} total questions with explanations)`,
    },
  };
}

export function buildCourseSchema(name: string, description: string, provider: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: name,
    description: description,
    provider: {
      '@type': 'EducationalOrganization',
      name: 'Yatri Cloud',
      sameAs: SITE_URL,
    },
    educationalCredentialAwarded: `${provider} Certification`,
  };
}

export interface ArticleSchemaProps {
  title: string;
  description?: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  authorName: string;
  authorId: string;
  authorSlugUrl: string;
  authorPhoto?: string;
  wordCount?: number;
  keywords?: string[];
  section?: string;
  slug: string;
}

export function buildArticleSchema(props: ArticleSchemaProps) {
  const articleUrl = `${SITE_URL}/blog/${props.slug}`;
  const authorUrl = `${SITE_URL}/blog/author/${props.authorSlugUrl}`;
  const readingMins = props.wordCount ? Math.max(1, Math.round(props.wordCount / 200)) : 5;
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': articleUrl,
    headline: props.title,
    name: props.title,
    description: props.description || undefined,
    image: props.image
      ? { '@type': 'ImageObject', url: props.image, width: 1200, height: 630 }
      : DEFAULT_IMAGE,
    url: articleUrl,
    mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
    datePublished: props.datePublished || undefined,
    dateModified: props.dateModified || props.datePublished || undefined,
    wordCount: props.wordCount || undefined,
    timeRequired: `PT${readingMins}M`,
    isAccessibleForFree: true,
    creativeWorkStatus: 'Published',
    keywords: props.keywords?.join(', ') || undefined,
    articleSection: props.section || 'Cloud Computing',
    inLanguage: 'en-US',
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', '[data-aeo-summary]', '.blog-article-content > p:first-of-type'],
    },
    author: {
      '@type': 'Person',
      '@id': authorUrl,
      name: props.authorName,
      url: authorUrl,
      image: props.authorPhoto || undefined,
    },
    publisher: {
      '@type': 'EducationalOrganization',
      '@id': SITE_URL,
      name: 'Yatri Cloud',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: DEFAULT_IMAGE },
    },
    isPartOf: {
      '@type': 'Blog',
      '@id': `${SITE_URL}/blog`,
      name: 'Yatri Cloud Blog',
      publisher: {
        '@type': 'EducationalOrganization',
        name: 'Yatri Cloud',
        url: SITE_URL,
      },
    },
  };
}

export interface AuthorProfileSchemaProps {
  name: string;
  id: string;
  slugUrl: string;
  bio?: string | null;
  tagline?: string | null;
  photo?: string | null;
  followerCount?: number;
  storyCount?: number;
  linkedinUrl?: string | null;
  twitterHandle?: string | null;
  githubUrl?: string | null;
  websiteUrl?: string | null;
  topics?: string[];
}

export function buildAuthorProfileSchema(props: AuthorProfileSchemaProps) {
  const profileUrl = `${SITE_URL}/blog/author/${props.slugUrl}`;
  const sameAs: string[] = [];
  if (props.linkedinUrl) sameAs.push(props.linkedinUrl);
  if (props.twitterHandle) sameAs.push(`https://twitter.com/${props.twitterHandle.replace(/^@/, '')}`);
  if (props.githubUrl) sameAs.push(props.githubUrl);
  if (props.websiteUrl) sameAs.push(props.websiteUrl);

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      '@id': profileUrl,
      url: profileUrl,
      name: `${props.name} | Yatri Cloud Blog`,
      mainEntity: {
        '@type': 'Person',
        '@id': `${profileUrl}#author`,
        name: props.name,
        url: profileUrl,
        description: props.bio || props.tagline || undefined,
        image: props.photo
          ? { '@type': 'ImageObject', url: props.photo }
          : undefined,
        sameAs: sameAs.length ? sameAs : undefined,
        knowsAbout: props.topics?.length ? props.topics : undefined,
        interactionStatistic: props.followerCount != null
          ? {
              '@type': 'InteractionCounter',
              interactionType: 'https://schema.org/FollowAction',
              userInteractionCount: props.followerCount,
            }
          : undefined,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      '@id': `${profileUrl}#author`,
      name: props.name,
      url: profileUrl,
      description: props.bio || props.tagline || undefined,
      image: props.photo ? { '@type': 'ImageObject', url: props.photo } : undefined,
      sameAs: sameAs.length ? sameAs : undefined,
    },
  ];
}


// Sitewide structured data, rendered once and kept in <head> for every route.
const SITE_JSON_LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: DEFAULT_IMAGE,
    sameAs: [
      'https://www.youtube.com/@yatricloud',
      'https://linkedin.com/company/yatricloud',
      'https://linktr.ee/yatricloud',
      'https://t.me/yatricloud',
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '52000',
      bestRating: '5',
      worstRating: '1',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
  },
];

export const SEO = ({
  title = 'Yatri Cloud · Discounted Cloud Certification Vouchers',
  description = 'Free practice tests, study guides and discounted vouchers for AWS, Azure, GCP, Kubernetes and DevOps certifications. Join 50K+ happy learners.',
  image = DEFAULT_IMAGE,
  type = 'website',
  url,
  canonical,
  noindex = false,
  breadcrumbs,
  faqs,
  jsonLd,
  articleAuthor,
  articleTags,
  articleSection,
  articlePublishedTime,
  articleModifiedTime,
}: SEOProps) => {
  const location = useLocation();
  const currentUrl = canonical || url || `${SITE_URL}${location.pathname}`;

  const schemas: object[] = [];
  if (breadcrumbs && breadcrumbs.length > 0) {
    schemas.push(buildBreadcrumbSchema(breadcrumbs));
  }
  if (faqs && faqs.length > 0) {
    schemas.push(buildFAQSchema(faqs));
  }
  if (jsonLd) {
    if (Array.isArray(jsonLd)) schemas.push(...jsonLd);
    else schemas.push(jsonLd);
  }

  const jsonLdString = schemas.length > 0 ? JSON.stringify(schemas.length === 1 ? schemas[0] : schemas) : '';

  useEffect(() => {
    // Update document title
    document.title = title;

    // Update or create meta tags
    const updateMetaTag = (property: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${property}"]`);

      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, property);
        document.head.appendChild(element);
      }

      element.setAttribute('content', content);
    };

    const removeMetaTag = (property: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      document.querySelector(`meta[${attribute}="${property}"]`)?.remove();
    };

    // Primary meta tags
    updateMetaTag('description', description);
    updateMetaTag('title', title);

    // Robots (noindex for private/utility pages, rich previews for all public pages)
    updateMetaTag('robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');

    // Open Graph tags
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:type', type, true);
    updateMetaTag('og:image', image, true);
    updateMetaTag('og:url', currentUrl, true);
    updateMetaTag('og:site_name', SITE_NAME, true);

    // Article OG tags (only when type === 'article')
    if (type === 'article') {
      if (articlePublishedTime) updateMetaTag('article:published_time', articlePublishedTime, true);
      if (articleModifiedTime) updateMetaTag('article:modified_time', articleModifiedTime, true);
      if (articleAuthor) updateMetaTag('article:author', articleAuthor, true);
      if (articleSection) updateMetaTag('article:section', articleSection, true);
      articleTags?.forEach((tag, i) => {
        // article:tag supports multiple, so we use indexed IDs
        const el = document.createElement('meta');
        el.setAttribute('property', 'article:tag');
        el.setAttribute('content', tag);
        el.setAttribute('data-article-tag', String(i));
        if (!document.querySelector(`meta[data-article-tag="${i}"]`)) {
          document.head.appendChild(el);
        }
      });
    } else {
      // Clean up article tags when navigating away from an article
      removeMetaTag('article:published_time', true);
      removeMetaTag('article:modified_time', true);
      removeMetaTag('article:author', true);
      removeMetaTag('article:section', true);
      document.querySelectorAll('meta[data-article-tag]').forEach((el) => el.remove());
    }

    // Twitter tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', image);

    // Canonical URL
    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', currentUrl);

    // Sitewide JSON-LD (Organization + WebSite), rendered once, never removed
    if (!document.getElementById('seo-jsonld-site')) {
      const siteScript = document.createElement('script');
      siteScript.type = 'application/ld+json';
      siteScript.id = 'seo-jsonld-site';
      siteScript.textContent = JSON.stringify(SITE_JSON_LD);
      document.head.appendChild(siteScript);
    }

    // Per-page JSON-LD, replaced on each route/page change
    let pageScript = document.getElementById('seo-jsonld-page') as HTMLScriptElement | null;
    if (jsonLdString) {
      if (!pageScript) {
        pageScript = document.createElement('script');
        pageScript.type = 'application/ld+json';
        pageScript.id = 'seo-jsonld-page';
        document.head.appendChild(pageScript);
      }
      pageScript.textContent = jsonLdString;
    } else if (pageScript) {
      pageScript.remove();
    }

    return () => {
      // Clean up per-page JSON-LD so it never leaks to the next route
      const stale = document.getElementById('seo-jsonld-page');
      if (stale) stale.remove();
      document.querySelectorAll('meta[data-article-tag]').forEach((el) => el.remove());
    };
  }, [title, description, image, type, currentUrl, noindex, jsonLdString, articleAuthor, articleTags, articleSection, articlePublishedTime, articleModifiedTime]);

  return null;
};


