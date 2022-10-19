import { faker } from "@faker-js/faker";
import { Sequelize } from "sequelize";

import { ItemType } from "@iushev/rbac";

import initModels, { ItemModel } from "../../models";

describe("Item model", () => {
  let sequelize: Sequelize;

  beforeAll(async () => {
    sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: "postgres",
      logging: false,
    });
    await sequelize.authenticate();
    initModels(sequelize);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  const itemData = {
    name: faker.random.word(),
    type: ItemType.role,
  };
  const ruleData = {
    name: faker.random.word(),
  };

  test("Create new item", async () => {
    const item = await ItemModel.create(itemData);

    expect(item).toBeTruthy();
    expect(item.name).toEqual(itemData.name);

    await item.destroy();
  });

  test("Create new item with rule", async () => {
    const item = await ItemModel.create(
      {
        ...itemData,
        rule: ruleData,
      },
      {
        include: "rule",
      }
    );

    expect(item).toBeTruthy();
    expect(item.rule).toBeTruthy();
    expect(item.ruleName).toEqual(item.rule.name);

    await item.rule.destroy();
    await item.destroy();
  });
});
