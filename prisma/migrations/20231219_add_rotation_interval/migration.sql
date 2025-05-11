-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "rotationInterval" INTEGER NOT NULL DEFAULT 360;

-- Insert initial rotation interval setting
INSERT INTO "Settings" ("id", "rotationInterval")
VALUES ('1', 360)
ON CONFLICT ("id") DO NOTHING;
