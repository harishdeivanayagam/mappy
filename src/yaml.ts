import fs from "fs"
import yaml from "js-yaml"

// Helper to read YAML files
export const readYamlFile = (filename: string) => {
    const fileContents = fs.readFileSync(filename, "utf8")
    return yaml.load(fileContents) as any
}