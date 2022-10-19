import { faker } from "@faker-js/faker";
import { Sequelize } from "sequelize";

import initModels, { PermissionModel } from "../../models";

describe("Permission model", () => {
  let sequelize: Sequelize;

  beforeAll(async () => {
    sequelize = new Sequelize(process.env.DATABASE_URL!, {
      dialect: "postgres",
      logging: false,
    });
    await sequelize.authenticate();
    initModels(sequelize);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test("Create new permission", async () => {
    const permission = await PermissionModel.create({
      name: faker.random.word(),
    });

    expect(permission).toBeTruthy();

    await permission.destroy();
  });
});
