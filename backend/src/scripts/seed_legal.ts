import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEFAULTS = [
    {
        slug: 'privacy_policy',
        title: 'Privacy Policy',
        content: `Last updated: ${new Date().toISOString().slice(0, 10)}

Your privacy matters to us. This Privacy Policy explains what information we collect, how we use it, and the choices you have.

1. Information We Collect
We collect the details you provide when you register and build your profile (such as your name, date of birth, gender, photos, location and preferences), and information generated as you use the app (matches, messages and activity).

2. How We Use Your Information
We use your information to create your profile, suggest compatible matches, enable messaging, keep the community safe, and improve the service.

3. Sharing
We do not sell your personal data. Limited information is shared with other members as part of the matching experience, and with service providers who help us operate the app.

4. Verification
Photos and documents you submit for verification are used only to confirm your identity and are never shown on your public profile.

5. Your Choices
You can edit your profile, adjust your preferences, and delete your account at any time from Options. Deleting your account permanently removes your data.

6. Contact
If you have questions about this policy, contact our support team.`,
    },
    {
        slug: 'terms_of_use',
        title: 'Terms of Use',
        content: `Last updated: ${new Date().toISOString().slice(0, 10)}

Welcome. By creating an account and using the app, you agree to these Terms of Use.

1. Eligibility
You must be at least 18 years old and legally able to enter into this agreement to use the service.

2. Your Account
You are responsible for the accuracy of the information on your profile and for keeping your account secure. Impersonation, fake profiles and misuse are not allowed.

3. Acceptable Use
Treat other members with respect. Harassment, hate speech, solicitation, spam and any illegal activity are prohibited and may result in suspension or removal.

4. Content
You retain ownership of the content you post but grant us a licence to display it within the service. You are responsible for the content you share.

5. Verification & Safety
We may offer identity verification and may review reported behaviour. We reserve the right to remove content or accounts that violate these terms.

6. Termination
You may delete your account at any time. We may suspend or terminate accounts that breach these terms.

7. Changes
We may update these terms from time to time. Continued use of the app means you accept the updated terms.`,
    },
];

async function seedLegal() {
    for (const doc of DEFAULTS) {
        // Create only if missing — never overwrite content edited from the admin panel.
        const existing = await prisma.legalDocument.findUnique({
            where: { slug: doc.slug },
        });
        if (existing) {
            console.log(`• ${doc.slug} already exists — skipping`);
            continue;
        }
        await prisma.legalDocument.create({ data: doc });
        console.log(`✓ seeded ${doc.slug}`);
    }
}

seedLegal()
    .then(() => console.log('Legal documents seeded.'))
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
