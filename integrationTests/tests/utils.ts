import { readdirSync } from "fs";
import { join } from "path"

export function getDirectories(source = ".") {
  return readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => join(source, dirent.name));
}