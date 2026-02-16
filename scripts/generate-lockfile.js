import { execSync } from "child_process";

console.log("Generating package-lock.json...");
try {
  execSync("npm install --package-lock-only", {
    cwd: "/vercel/share/v0-project",
    stdio: "inherit",
  });
  console.log("package-lock.json generated successfully.");
} catch (err) {
  console.error("Failed to generate lockfile:", err.message);
  // Fallback: run full npm install
  console.log("Trying full npm install...");
  execSync("npm install", {
    cwd: "/vercel/share/v0-project",
    stdio: "inherit",
  });
  console.log("npm install completed.");
}
