#!/usr/bin/env node
import path from "path";
import Umzug from "umzug";
import { Sequelize } from "sequelize";

const sequelize = new Sequelize(process.env.DATABASE_URL!, {
  dialect: "postgres",
  logging: false,
});

const umzug = new Umzug({
  storage: "sequelize",
  storageOptions: {
    sequelize: sequelize,
    tableName: "rbac_migrations",
  },

  // see: https://github.com/sequelize/umzug/issues/17
  migrations: {
    params: [
      sequelize.getQueryInterface(), // queryInterface
      sequelize.constructor, // DataTypes
      function () {
        throw new Error(
          'Migration tried to use old style "done" callback. Please upgrade to "umzug" and return a promise instead.'
        );
      },
    ],
    path: path.resolve(__dirname, "migrations"),
    pattern: /^\d{14}[\w-]+\.js$/,
  },
});

function logUmzugEvent(eventName: string) {
  return function (name: string, _migration: Umzug.Migration) {
    console.log(`${name} ${eventName}`);
  };
}

umzug.on("migrating", logUmzugEvent("migrating"));
umzug.on("migrated", logUmzugEvent("migrated"));
umzug.on("reverting", logUmzugEvent("reverting"));
umzug.on("reverted", logUmzugEvent("reverted"));

interface IStatus {
  executed: string[];
  pending: string[];
}

const cmdStatus = async (): Promise<IStatus> => {
  const executed = (await umzug.executed()).map((m: Umzug.Migration) => {
    return m.file;
  });

  const pending = (await umzug.pending()).map((m: Umzug.Migration) => {
    return m.file;
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

const cmdMigrate = async (): Promise<Umzug.Migration[]> => {
  const pending = (await umzug.pending()).map((m: Umzug.Migration) => {
    return m.file;
  });

  console.log("pending:", JSON.stringify(pending, null, 2));
  return await umzug.up();
};

const cmdMigrateNext = async (): Promise<Umzug.Migration[]> => {
  const { pending } = await cmdStatus();
  if (pending.length === 0) {
    return Promise.reject(new Error("No pending migrations"));
  }
  const next = pending[0];
  return umzug.up({ to: next });
};

const cmdMigrateDown = async (): Promise<Umzug.Migration[]> => {
  return umzug.down({ to: 0 });
};

const cmdMigratePrev = async (): Promise<Umzug.Migration[]> => {
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
