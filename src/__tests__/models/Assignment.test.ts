import { faker } from "@faker-js/faker";
import { Sequelize } from "sequelize";

import { ItemType, Identity } from "@iushev/rbac";

import initModels, { ItemModel, AssignmentModel } from "../../models";

describe("Assignment model", () => {
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

  const userData = {
    username: faker.internet.userName(),
    isActive: true,
    isSuperuser: false,
  } as Identity;

  const itemData = {
    name: faker.random.word(),
    type: ItemType.role,
  };

  test("Create new assignment", async () => {
    const item = await ItemModel.create(itemData);
    const assignment = await AssignmentModel.create({
      itemName: item.name,
      username: userData.username,
    });

    expect(assignment).toBeTruthy();
    expect(assignment.getItem()).toBeTruthy();

    await assignment.destroy();
    await item.destroy();
  });
});
