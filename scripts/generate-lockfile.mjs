import { execSync } from "child_process";

try {
  console.log("Generating fresh package-lock.json...");
  execSync("npm install --package-lock-only", {
    cwd: "/vercel/share/v0-project",
    stdio: "inherit",
  });
  console.log("Done! package-lock.json generated successfully.");
} catch (e) {
  console.error("Failed to generate lockfile:", e.message);
  process.exit(1);
}
