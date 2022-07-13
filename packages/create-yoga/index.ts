#!/usr/bin/env node
import { Command } from "commander";
// import packageJson from "./package.json";
import chalk from "chalk";
import prompts from "prompts";
import { validateNpmName } from "./utils/validatePkgName.js";
import path from "path";
import { getPackageManager } from "./utils/getPackageManager.js";
import { createYogaApp } from "./create-yoga.js";

const packageJson = { name: "", version: "1.0" };

let projectOutputPath = "";

const program = new Command(packageJson.name)
  .version(packageJson.version)
  .configureOutput({
    writeErr: (error: string) => console.log(chalk.bgRed.red.bold(error)),
  })
  .argument("<project-directory>")
  .usage("<project-directory> [options]")
  .action((name: string) => {
    if (!name) {
      console.log("Error");
    }
    projectOutputPath = name;
  })
  .option("--ts, --typescript", "Create Project using Typescript")
  .option(
    "--use-npm ",
    `
  
  Use NPM instaed of Yarn`
  )
  .option(
    "--use-pnpm",
    `
  
  Use PNPM instead of Yarn/NPM`
  )
  .option(
    "-t, --template [name]|[github-url]",
    `An example to bootstrap the app with. You can use an example name
  from the official GraphQL-yoga repo or a GitHub URL. The URL can use
  any branch and/or subdirectory
`
  )
  .option(
    "-p,--path <path-to-example>",
    `
  
  In a rare case, your GitHub URL might contain a branch name with
  a slash (e.g. bug/fix-1) and the path to the example (e.g. foo/bar).
  In this case, you must specify the path to the example separately:
  --path foo/bar
  `
  )
  .allowUnknownOption()
  .parse(process.argv);

async function start() {
  if (!projectOutputPath || projectOutputPath.length < 1) {
    const response = await prompts({
      type: "text",
      name: "path",
      message: "Please enter your project folder name",
      validate: (val: string) => val.length > 1,
    });

    if (!response.path) {
      console.log(chalk.bgRed.red.bold("Please enter Project path"));
      process.exit(1);
    }
    projectOutputPath = response?.path.trim();
  }
  const resolvedProjectPath = path.resolve(projectOutputPath);
  const projectName = path.basename(resolvedProjectPath);

  const { valid, problems } = validateNpmName(projectName);
  // console.log(valid, problems);

  if (!valid) {
    console.log(
      chalk.red.bold(`\n❌ Couldn't able to create Project because: \n\n`)
    );

    problems?.forEach((p) => console.log(chalk.red.bold(`  ${p}\n`)));
    process.exit(1);
  }

  const template = program.getOptionValue("template");
  if (typeof template === "boolean" || template === true) {
    console.log(
      chalk.cyan.italic(
        `[EXIT]: Please provide the template name or URL or remove the example options`
      )
    );
    process.exit(1);
  }
  const useNpm = program.getOptionValue("UseNpm");
  const usePnpm = program.getOptionValue("usePnpm");
  const packageManager: any = getPackageManager(useNpm, usePnpm);

  const project = typeof template === "string" && template.trim();

  const typescript = program.getOptionValue("typescript");
  const templatePath = program.getOptionValue("path");
  try {
    await createYogaApp({
      appPath: resolvedProjectPath,
      packageManager,
      template: project || undefined,
      templatePath,
      typescript,
    });
  } catch (error) {
    console.error(error);
  }
}

start();
