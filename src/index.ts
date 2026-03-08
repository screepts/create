import { intro, text, isCancel, spinner, log, outro } from "@clack/prompts"
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { join } from "node:path"
import AdmZip from "adm-zip"

const execFileAsync = promisify(execFile)

export async function create(template: string, path: string, npm_config_user_agent?: string) {
  await assertEmpty(path)

  intro(`Creating a Screeps project...`)

  const name = await text({
    message: "What's your project name?",
    initialValue: path.includes("/") ? undefined : path,
    placeholder: "my-screeps-bot",
  })
  if (isCancel(name)) return

  const spin = spinner()
  spin.start(`Cloning template ${template}...`)

  try {
    await execFileAsync("git", [
      ..."clone --depth 1 -o upsteam --no-tags".split(" "),
      `https://github.com/${template}.git`,
      path,
    ])
  } catch (e) {
    log.warn("Failed to clone template with git " + e)
    log.info("Falling back to downloading zip file")
    await unpackZip(template, path)
  }
  spin.stop("Template downloaded")

  const pkgManager = npm_config_user_agent?.split("/", 2)[0] || "npm"
  spin.start("Installing dependencies...")
  const { stderr } = await execFileAsync(pkgManager, ["install"], { cwd: path })
  if (stderr.trim()) log.warn(stderr)
  spin.stop("Dependencies installed")

  if (name) {
    // replace package.json name field
    const pkgPath = join(path, "package.json")
    const pkgData = JSON.parse(await readFile(pkgPath, "utf-8"))
    if (pkgData.name != name) {
      pkgData.name = name
      await writeFile(pkgPath, JSON.stringify(pkgData, null, 2))
    }
  }

  outro("Screeps dev gotta go fast 🏎️")
}

async function assertEmpty(path: string) {
  const files = await readdir(path).catch(() => [])
  if (files.length > 0) throw new Error(`Directory "${path}" is not empty. Aborting`)
}

async function unpackZip(template: string, path: string, branches = ["main", "master"]) {
  let branch: string | undefined
  let data: Response | undefined
  for (const b of branches) {
    branch = b
    data = await fetch(`https://github.com/${template}/archive/refs/heads/${branch}.zip`)
    if (data.status == 200) break
  }
  if (!data || data.status != 200 || !branch)
    throw new Error(`Failed to download template zip file`)

  const zip = new AdmZip(Buffer.from(await data.arrayBuffer()))
  await mkdir(path, { recursive: true })

  const folder = template.split("/", 2)[1] + "-" + branch + "/"

  const fileEntries: AdmZip.IZipEntry[] = []
  for (const entry of zip.getEntries()) {
    if (!entry.entryName.startsWith(folder)) continue
    if (!entry.isDirectory) {
      fileEntries.push(entry)
      continue
    }

    // Create directory entries first synchronously to avoid race conditions
    const dirPath = join(path, entry.entryName.slice(folder.length))
    await mkdir(dirPath, { recursive: true })
  }

  await Promise.all(
    fileEntries.reverse().map(async (entry) => {
      const content = await new Promise<Buffer>((resolve, reject) =>
        entry.getDataAsync((data, err) => (err ? reject(err) : resolve(data))),
      )
      const filePath = join(path, entry.entryName.slice(folder.length))
      await writeFile(filePath, content)
    }),
  )
}
