-- CreateTable
CREATE TABLE "DialysisUnitConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "active_shift_count" INTEGER NOT NULL DEFAULT 4,

    CONSTRAINT "DialysisUnitConfig_pkey" PRIMARY KEY ("id")
);
