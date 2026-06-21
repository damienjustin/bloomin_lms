import fs from "fs";
import path from "path";

const ENV_PATH = path.join(process.cwd(), ".env");

export function readEnvFile(): string {
  try {
    return fs.readFileSync(ENV_PATH, "utf-8");
  } catch {
    return "";
  }
}

export function writeEnvValue(key: string, value: string) {
  const current = readEnvFile();
  const escaped = value.replace(/"/g, '\\"');
  const line = `${key}="${escaped}"`;
  const lines = current.split("\n").filter((l) => l.trim().length > 0);
  const index = lines.findIndex((l) => l.startsWith(`${key}=`));

  if (index >= 0) {
    lines[index] = line;
  } else {
    lines.push(line);
  }

  fs.writeFileSync(ENV_PATH, lines.join("\n") + "\n");
}

export function buildMysqlUrl(params: {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}) {
  const { host, port, user, password, database } = params;
  return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}
