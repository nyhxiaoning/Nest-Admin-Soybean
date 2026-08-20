-- CreateEnum
CREATE TYPE "CreatorWorkType" AS ENUM ('STATIC', 'GIF');

-- CreateEnum
CREATE TYPE "CreatorWorkPublishStatus" AS ENUM ('OFFLINE', 'REVIEWING', 'REJECTED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "CreatorWorkSubmissionType" AS ENUM ('PUBLISH', 'UPDATE');

-- CreateEnum
CREATE TYPE "CreatorWorkSubmissionStatus" AS ENUM ('REVIEWING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "creator_work" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "type" "CreatorWorkType" NOT NULL DEFAULT 'STATIC',
    "cover_url" VARCHAR(1000),
    "gif_file_url" VARCHAR(1000),
    "gif_file_size" BIGINT,
    "editable_file_url" VARCHAR(1000),
    "bin_file_url" VARCHAR(1000),
    "bin_file_size" BIGINT,
    "width" INTEGER,
    "height" INTEGER,
    "frame_count" INTEGER,
    "frame_delay" INTEGER,
    "preview" TEXT,
    "publish_status" "CreatorWorkPublishStatus" NOT NULL DEFAULT 'OFFLINE',
    "work_version" INTEGER NOT NULL DEFAULT 1,
    "content_consistent" BOOLEAN NOT NULL DEFAULT true,
    "published_snapshot" JSONB,
    "submitted_at" TIMESTAMP(6),
    "remark" VARCHAR(500),
    "rejected_reason" VARCHAR(500),
    "last_view_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "creator_work_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_work_tag" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "tag_code" VARCHAR(50) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "creator_work_tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_work_tag_relation" (
    "id" UUID NOT NULL,
    "work_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_work_tag_relation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_work_submission" (
    "id" UUID NOT NULL,
    "work_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "type" "CreatorWorkSubmissionType" NOT NULL,
    "status" "CreatorWorkSubmissionStatus" NOT NULL DEFAULT 'REVIEWING',
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "remark" VARCHAR(500),
    "rejected_reason" VARCHAR(500),
    "auditor_id" VARCHAR(64),
    "submitted_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "audited_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "creator_work_submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "creator_work_creator_id_deleted_at_updated_at_idx" ON "creator_work"("creator_id", "deleted_at", "updated_at");
CREATE INDEX "creator_work_creator_id_publish_status_deleted_at_idx" ON "creator_work"("creator_id", "publish_status", "deleted_at");
CREATE INDEX "creator_work_creator_id_title_idx" ON "creator_work"("creator_id", "title");
CREATE UNIQUE INDEX "creator_work_tag_tag_code_key" ON "creator_work_tag"("tag_code");
CREATE INDEX "creator_work_tag_enabled_sort_order_idx" ON "creator_work_tag"("enabled", "sort_order");
CREATE UNIQUE INDEX "creator_work_tag_relation_work_id_tag_id_key" ON "creator_work_tag_relation"("work_id", "tag_id");
CREATE INDEX "creator_work_tag_relation_tag_id_idx" ON "creator_work_tag_relation"("tag_id");
CREATE UNIQUE INDEX "creator_work_submission_work_id_version_key" ON "creator_work_submission"("work_id", "version");
CREATE INDEX "creator_work_submission_work_id_status_submitted_at_idx" ON "creator_work_submission"("work_id", "status", "submitted_at");
CREATE INDEX "creator_work_submission_creator_id_status_submitted_at_idx" ON "creator_work_submission"("creator_id", "status", "submitted_at");

-- AddForeignKey
ALTER TABLE "creator_work" ADD CONSTRAINT "creator_work_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "creator_work_tag_relation" ADD CONSTRAINT "creator_work_tag_relation_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "creator_work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "creator_work_tag_relation" ADD CONSTRAINT "creator_work_tag_relation_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "creator_work_tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "creator_work_submission" ADD CONSTRAINT "creator_work_submission_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "creator_work"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "creator_work_submission" ADD CONSTRAINT "creator_work_submission_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
