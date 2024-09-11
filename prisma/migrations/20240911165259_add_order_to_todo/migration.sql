PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Create a new table with the 'order' column and a default value of 0
CREATE TABLE "new_Todo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "order" INTEGER NOT NULL DEFAULT 0  -- Default value of 0
);

-- Copy data from the old table to the new table
INSERT INTO "new_Todo" ("completed", "createdAt", "id", "title", "order")
SELECT "completed", "createdAt", "id", "title", 0  -- Set default value for 'order'
FROM "Todo";

-- Drop the old table
DROP TABLE "Todo";

-- Rename the new table to the old table's name
ALTER TABLE "new_Todo" RENAME TO "Todo";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

