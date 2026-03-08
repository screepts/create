#!/usr/bin/env node

import process from "node:process"
import { log } from "@clack/prompts"
import { cac } from "cac"
import pkg from "../package.json" with { type: "json" }
import { create } from "./index"

const TEMPLATE_REPO = "screepts/screeps-typescript-starter"

const cli = cac(pkg.name).version(pkg.version).help()

cli
  .command("[path]", "Create a Screept project")
  .action((path: string | undefined, ..._: any[]) =>
    create(TEMPLATE_REPO, path ?? process.cwd(), process.env.npm_config_user_agent),
  )

cli.parse(process.argv, { run: false })

try {
  await cli.runMatchedCommand()
} catch (error) {
  log.error(String(error))
  process.exit(1)
}
