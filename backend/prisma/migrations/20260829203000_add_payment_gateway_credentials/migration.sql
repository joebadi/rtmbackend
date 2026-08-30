ALTER TABLE "payment_gateway_settings"
ADD COLUMN "publicKeyEncrypted" TEXT,
ADD COLUMN "secretKeyEncrypted" TEXT,
ADD COLUMN "publicKeyHint" TEXT,
ADD COLUMN "secretKeyHint" TEXT,
ADD COLUMN "keyMode" TEXT;
