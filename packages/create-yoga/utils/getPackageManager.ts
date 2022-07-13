import { execaSync } from "execa";
export function getPackageManager(npm: boolean, pnpm: boolean) {
  if (!npm && !pnpm) {
    try {
      execaSync("yarn", ["--version"], { stdio: "ignore" });
      return "yarn";
    } catch {
      try {
        execaSync("pnpm", ["--version"], { stdio: "ignore" });
        return "pnpm";
      } catch {
        return "npm";
      }
    }
  }
  if (pnpm) {
    try {
      execaSync("pnpm", ["--version"], { stdio: "ignore" });
      return "pnpm";
    } catch {
      return "npm";
    }
  }
  return "npm";
}
