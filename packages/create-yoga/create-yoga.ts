import chalk from "chalk";
import { mkdir } from "fs/promises";
import path from "path";
import retry from "async-retry";
import { isWriteAccess } from "./utils/checkFileAccess.js";
import {
  getRepoInfo,
  hasRepo,
  existsInRepo,
  downloadAndExtractRepo,
  downloadAndExtractExample,
} from "./utils/example.js";
import { isFolderEmpty } from "./utils/isFolderEmpty.js";
import { existsSync, writeFileSync } from "fs";
import { install } from "./utils/install.js";
import os from "os";

interface YogaProps {
  appPath: string;
  packageManager: any;
  template?: string;
  templatePath: string;
  typescript: string;
}

export class DownloadError extends Error {}

export const createYogaApp = async ({
  appPath,
  packageManager,
  template,
  templatePath,
  typescript,
}: YogaProps) => {
  const isTypescript = typescript ? "typescript" : "default";
  const example = template;
  let repoInfo;

  if (example) {
    let repoUrl: URL | undefined;

    try {
      repoUrl = new URL(example);
    } catch (error: any) {
      if (error.code !== "ERR_INVALID_URL") {
        console.error(error);
        process.exit(1);
      }
    }

    if (repoUrl) {
      if (repoUrl.origin !== "https://github.com") {
        console.error(
          `Invalid URL: ${chalk.red(
            `"${example}"`
          )}. Only GitHub repositories are supported. Please use a GitHub URL and try again.`
        );
        process.exit(1);
      }

      repoInfo = await getRepoInfo(repoUrl, templatePath);

      if (!repoInfo) {
        console.error(
          `Found invalid GitHub URL: ${chalk.red(
            `"${example}"`
          )}. Please fix the URL and try again.`
        );
        process.exit(1);
      }

      const found = await hasRepo(repoInfo);

      if (!found) {
        console.error(
          `Could not locate the repository for ${chalk.red(
            `"${example}"`
          )}. Please check that the repository exists and try again.`
        );
        process.exit(1);
      }
    } else if (example !== "test") {
      const found = await existsInRepo(example);

      if (!found) {
        console.error(
          `Could not locate an example named ${chalk.red(
            `"${example}"`
          )}. It could be due to the following:\n`,
          `1. Your spelling of example ${chalk.red(
            `"${example}"`
          )} might be incorrect.\n`,
          `2. You might not be connected to the internet or you are behind a proxy.`
        );
        process.exit(1);
      }
    }
  }
  const root = path.resolve(appPath);

  if (!(await isWriteAccess(path.dirname(root)))) {
    console.log(
      chalk.red.bold(
        "❌ Path provided is not writable, please check the access or change the Path"
      )
    );
    process.exit(1);
  }
  const appName = path.basename(root);

  if (!existsSync(appName)) {
    await mkdir(appName);
  }

  if (!isFolderEmpty(root, appName)) {
    process.exit(1);
  }

  console.log(
    chalk.bgGreen.white.italic(
      `Creating your Yoga Application in ${chalk.cyan(root)}`
    )
  );
  console.log();

  process.chdir(root);

  const packageJsonPath = path.join(root, "package.json");
  let hasPackageJson = false;

  if (example) {
    try {
      if (repoInfo) {
        const repoInfo2 = repoInfo;
        console.log(
          `Downloading files from repo ${chalk.cyan(
            example
          )}. This might take a moment.`
        );
        console.log();
        await retry(() => downloadAndExtractRepo(root, repoInfo2), {
          retries: 3,
        });
      } else {
        console.log(
          `Downloading files form examples of ${chalk.cyan(
            example
          )} yoga Project. This might take a few moments.`
        );
        console.log();
        await retry(() => downloadAndExtractExample(root, example), {
          retries: 3,
        });
      }
    } catch (reason) {
      function isErrorLike(err: unknown): err is { message: string } {
        return (
          typeof err === "object" &&
          err !== null &&
          typeof (err as { message?: unknown }).message === "string"
        );
      }
      throw new DownloadError(
        isErrorLike(reason) ? reason.message : reason + ""
      );
    }

    const gitignore = `
/node_modules
/.pnp
.pnp.js

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# local env files
.env*.local
    `;

    const ignorePath = path.join(root, ".gitignore");
    if (!existsSync(ignorePath)) {
      writeFileSync(
        path.join(root, ".gitignore"),
        JSON.stringify(gitignore, null, 2) + os.EOL
      );
    }

    hasPackageJson = existsSync(packageJsonPath);
    if (hasPackageJson) {
      console.log("Installing packages. This might take a couple of minutes.");
      console.log();

      await install(root, null, { packageManager, isOnline: true });
      console.log();
    } else {
      console.error(
        "There is no package.json file in the example you've download, skipping Package Installation."
      );
    }
  }

  console.log(chalk.cyanBright("Bye, bye!✌🏻"));
};
