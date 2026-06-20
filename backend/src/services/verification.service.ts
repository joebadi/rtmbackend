import { prisma } from '../server';
import { uploadImage } from '../utils/storage.util';

export const getVerification = (userId: string) =>
    prisma.verificationRequest.findUnique({ where: { userId } });

/**
 * Submit (or re-submit) a verification request with a selfie + ID document.
 * Sets status back to PENDING for admin review.
 */
export const submitVerification = async (
    userId: string,
    selfieBuffer: Buffer,
    idBuffer?: Buffer
) => {
    const selfie = await uploadImage(selfieBuffer, 'verification');
    const documents: { selfieUrl: string; idUrl?: string } = {
        selfieUrl: selfie.url,
    };

    if (idBuffer) {
        const idDoc = await uploadImage(idBuffer, 'verification');
        documents.idUrl = idDoc.url;
    }

    return prisma.verificationRequest.upsert({
        where: { userId },
        create: { userId, documents, status: 'PENDING' },
        update: {
            documents,
            status: 'PENDING',
            reviewedAt: null,
            reviewNotes: null,
            reviewedBy: null,
        },
    });
};
