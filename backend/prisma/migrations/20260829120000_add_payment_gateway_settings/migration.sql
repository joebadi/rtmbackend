-- Payment credentials stay in environment variables. This table provides the
-- runtime on/off switch controlled from the admin dashboard.
CREATE TABLE "payment_gateway_settings" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_gateway_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_gateway_settings_provider_key"
ON "payment_gateway_settings"("provider");
