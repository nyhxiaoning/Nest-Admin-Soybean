-- PC Creator Center 独立用户表，不复用后台 sys_user。
CREATE TABLE "creator_user" (
  "id" UUID NOT NULL,
  "phone" VARCHAR(11) NOT NULL,
  "password" VARCHAR(200),
  "name" VARCHAR(50) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  "last_login_at" TIMESTAMP(6),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "creator_user_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "creator_user_phone_key" ON "creator_user"("phone");
CREATE INDEX "creator_user_status_idx" ON "creator_user"("status");
