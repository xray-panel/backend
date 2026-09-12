-- CreateTable
CREATE TABLE "admin_audit_log" (
    "id" BIGSERIAL NOT NULL,
    "admin_uuid" UUID,
    "admin_username" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL,
    "request_ip" TEXT,
    "user_agent" TEXT,
    "duration_ms" INTEGER,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_audit_log_created_at_idx" ON "admin_audit_log"("created_at");

-- CreateIndex
CREATE INDEX "admin_audit_log_admin_username_created_at_idx" ON "admin_audit_log"("admin_username", "created_at");

