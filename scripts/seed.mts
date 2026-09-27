import { db } from "@/db";
import { runSeed } from "@/db/seed";

const r = await runSeed(db);
console.log("Seeded", r);
process.exit(0);
