import { faker } from "@faker-js/faker";
import { Sequelize } from "sequelize";

import initModels, { RoleModel } from "../../models";

describe("Role model", () => {
  let sequelize: Sequelize;

  beforeAll(async () => {
    sequelize = new Sequelize(process.env.DATABASE_URL ?? "", {
      dialect: "postgres",
      logging: false,
    });
    await sequelize.authenticate();
    initModels(sequelize);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test("Create new role", async () => {
    const role = RoleModel.build({
      name: faker.random.word(),
    });
    await role.save();

    expect(role).toBeTruthy();

    await role.destroy();
  });
});
