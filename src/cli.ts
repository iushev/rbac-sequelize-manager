#!/usr/bin/env node
import path from "path";
import fs from "fs";
import { Umzug, SequelizeStorage, MigrationMeta } from "umzug";
import { Sequelize } from "sequelize";

import initModels from "./models";

const sequelize = new Sequelize(process.env.DATABASE_URL ?? "postgres://rbac:rbac%40rbac@localhost:5432/rbac", {
  dialect: "postgres",
  logging: false,
});

initModels(sequelize);

const findMigrations = (findPath: string, migrations: Map<string, string>) => {
  const files = fs.readdirSync(findPath);
  files.forEach((file) => {
    const filePath = path.join(findPath, file);
    const fileStat = fs.statSync(filePath);
    if (fileStat.isDirectory()) {
      findMigrations(filePath, migrations);
    } else {
      if (/^\d{14}[\w-]+\.(js|ts)$/.test(file)) {
        migrations.set(file, filePath);
      }
    }
  });
};

const allMigrations: Map<string, string> = new Map();
findMigrations(path.resolve(__dirname), allMigrations);

const migrations: any[] = [];
allMigrations.forEach((value, key) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const migration = require(value);
  migrations.push({
    name: key,
    up: migration.up,
    down: migration.down,
  });
});

migrations.sort((a, b) => {
  if (a.name === b.name) {
    return 0;
  } else if (a.name > b.name) {
    return 1;
  } else {
    return -1;
  }
});

const umzug = new Umzug({
  storage: new SequelizeStorage({
    sequelize,
    tableName: "rbac_migrations",
  }),
  migrations,
  context: sequelize.getQueryInterface(),
  logger: console,
});

interface IStatus {
  executed: string[];
  pending: string[];
}

const cmdStatus = async (): Promise<IStatus> => {
  const executed = (await umzug.executed()).map((m: MigrationMeta) => {
    return m.name;
  });

  const pending = (await umzug.pending()).map((m: MigrationMeta) => {
    return m.name;
  });

  const current = executed.length > 0 ? path.basename(executed[0], ".js") : "<NO_MIGRATIONS>";
  const status = {
    current: current,
    executed: executed,
    pending: pending,
  };

  console.log(JSON.stringify(status, null, 2));

  return { executed, pending };
};

const cmdMigrate = async (): Promise<MigrationMeta[]> => {
  const pending = (await umzug.pending()).map((m: MigrationMeta) => {
    return m.name;
  });

  console.log("pending:", JSON.stringify(pending, null, 2));
  return umzug.up();
};

const cmdMigrateNext = async (): Promise<MigrationMeta[]> => {
  const { pending } = await cmdStatus();
  if (pending.length === 0) {
    return Promise.reject(new Error("No pending migrations"));
  }
  const next = pending[0];
  return umzug.up({ to: next });
};

const cmdMigrateDown = async (): Promise<MigrationMeta[]> => {
  return umzug.down({ to: 0 });
};

const cmdMigratePrev = async (): Promise<MigrationMeta[]> => {
  const { executed } = await cmdStatus();
  if (executed.length === 0) {
    return Promise.reject(new Error("Already at initial state"));
  }
  const prev = executed[executed.length - 1];
  return umzug.down({ to: prev });
};

const cmd = process.argv[2].trim();
let cmdFunc: any;

console.log(`${cmd.toUpperCase()} BEGIN`);
switch (cmd) {
  case "status":
    cmdFunc = cmdStatus;
    break;

  case "migrate":
    cmdFunc = cmdMigrate;
    break;

  case "migrate-next":
    cmdFunc = cmdMigrateNext;
    break;

  case "migrate-down":
    cmdFunc = cmdMigrateDown;
    break;

  case "migrate-prev":
    cmdFunc = cmdMigratePrev;
    break;

  default:
    console.log(`invalid cmd: ${cmd}`);
    process.exit(1);
}

const execute = async () => {
  try {
    await cmdFunc();
  } catch (err: any) {
    console.error("ERROR:", err.message);
  }
};

execute().then(() => process.exit(0));
