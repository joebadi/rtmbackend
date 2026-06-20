import { prisma } from '../server';

/** Stable slugs for the editable legal documents. */
export const LEGAL_SLUGS = ['privacy_policy', 'terms_of_use'] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export const isValidSlug = (slug: string): slug is LegalSlug =>
    (LEGAL_SLUGS as readonly string[]).includes(slug);

export const getDocument = (slug: string) =>
    prisma.legalDocument.findUnique({ where: { slug } });

export const listDocuments = () =>
    prisma.legalDocument.findMany({ orderBy: { slug: 'asc' } });

export const upsertDocument = (slug: string, title: string, content: string) =>
    prisma.legalDocument.upsert({
        where: { slug },
        create: { slug, title, content },
        update: { title, content },
    });
