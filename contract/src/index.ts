import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// __dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get .compact file name from current directory (in dist, the .compact file is copied here)
const [compactFile] = fs.readdirSync(__dirname).filter(f => f.endsWith(".compact"));

if (!compactFile) throw new Error("No .compact file found in current directory");

const contractBaseName = path.basename(compactFile, ".compact"); // e.g., zkvote
const contractNameCapitalized = contractBaseName[0].toUpperCase() + contractBaseName.slice(1);

// Import the contract module
const contractPath = `./managed/${contractBaseName}/contract/index.cjs`;
const contractModule = await import(contractPath);

// Export witnesses statically
export * from "./witnesses";

// Re-export contract under the name Zkvote for backward compatibility
export const Zkvote = contractModule;

// Also export a dynamic object with the capitalized contract name
export const contracts = {
  [contractNameCapitalized]: contractModule
};
