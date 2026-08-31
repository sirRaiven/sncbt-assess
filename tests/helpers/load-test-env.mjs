import {
  existsSync,
  readFileSync,
} from "node:fs";
import {
  resolve,
} from "node:path";

function parseEnvFile(path) {
  if (!existsSync(path)) {
    return {};
  }

  const values = {};

  for (
    const rawLine
    of readFileSync(
      path,
      "utf8",
    ).split(/\r?\n/)
  ) {
    const line =
      rawLine.trim();

    if (
      !line
      || line.startsWith("#")
    ) {
      continue;
    }

    const separator =
      line.indexOf("=");

    if (separator <= 0) {
      continue;
    }

    const key =
      line
        .slice(0, separator)
        .trim();

    let value =
      line
        .slice(separator + 1)
        .trim();

    if (
      (
        value.startsWith('"')
        && value.endsWith('"')
      )
      || (
        value.startsWith("'")
        && value.endsWith("'")
      )
    ) {
      value =
        value.slice(1, -1);
    }

    values[key] =
      value;
  }

  return values;
}

export function loadLocalTestEnv() {
  const merged = {
    ...parseEnvFile(
      resolve(
        process.cwd(),
        ".env",
      ),
    ),
    ...parseEnvFile(
      resolve(
        process.cwd(),
        ".env.test",
      ),
    ),
  };

  for (
    const [key, value]
    of Object.entries(merged)
  ) {
    if (
      process.env[key]
      === undefined
    ) {
      process.env[key] =
        value;
    }
  }
}
