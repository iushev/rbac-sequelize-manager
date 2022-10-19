import { faker } from "@faker-js/faker";
import { Sequelize } from "sequelize";

import { ItemType } from "@iushev/rbac";

import initModels, { ItemModel, ItemChildModel } from "../../models";

describe("ItemChild model", () => {
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

  const parentData = {
    name: faker.random.word(),
    type: ItemType.role,
  };

  const childData = {
    name: faker.random.word(),
    type: ItemType.role,
  };

  test("Create new item_child", async () => {
    const parentItem = await ItemModel.create(parentData);
    const childItem = await ItemModel.create(childData);
    const itemChild = await ItemChildModel.create({
      parentName: parentData.name,
      childName: childData.name,
    });

    expect(itemChild).toBeTruthy();
    expect(itemChild.getParent()).toBeTruthy();
    expect(itemChild.getChild()).toBeTruthy();

    await itemChild.destroy();
    await parentItem.destroy();
    await childItem.destroy();
  });
});
