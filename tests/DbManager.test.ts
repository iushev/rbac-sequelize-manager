import path from "path";
import fs from "fs";
import { Sequelize } from "sequelize";

import initModels from "@iushev/rbac-sequelize-manager/models";
import { DbManager } from "@iushev/rbac-sequelize-manager";

import authManagerTest from "../../rbac/tests/AuthManager";

describe("Testing DbManager", () => {
  let sequelize = new Sequelize(process.env.DATABASE_URL!, {
    dialect: "postgres",
    logging: false,
  });
  initModels(sequelize);

  const auth = new DbManager({
    sequelize,
    defaultRoles: ["myDefaultRole"],
    // logging: logger.info,
    logging: false,
  });

  afterAll(async () => {
    await sequelize.close();
  });

  authManagerTest(auth);
});