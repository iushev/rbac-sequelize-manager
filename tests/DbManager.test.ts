import { Sequelize } from "sequelize";

import initModels from "../src/models";
import { DbManager } from "../src";

import { testAuthManager } from "@iushev/rbac";

describe("Testing DbManager", () => {
  let sequelize = new Sequelize(process.env.DATABASE_URL!, {
    dialect: "postgres",
    logging: false,
  });
  initModels(sequelize);

  const auth = new DbManager({
    sequelize,
    defaultRoles: ["myDefaultRole"],
    logging: false,
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    await auth.removeAll();
  });

  describe("AuthManager test", () => {
    testAuthManager(auth);
  });
});
