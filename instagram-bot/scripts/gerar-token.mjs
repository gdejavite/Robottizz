// Gera uma senha aleatória forte (use para VERIFY_TOKEN e ADMIN_PASSWORD).
import { randomBytes } from "node:crypto";
console.log(randomBytes(24).toString("hex"));
