import { faker } from "@faker-js/faker";
import { Sequelize } from "sequelize";

import initModels, { RuleModel } from "../../models";

describe("Rule model", () => {
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

  const ruleData = {
    name: faker.random.word(),
  };

  test("Create new rule", async () => {
    const rule = await RuleModel.create(ruleData);
    expect(rule).toBeTruthy();
    expect(rule.name).toEqual(ruleData.name);
  });

  test("Destroy rule", async () => {
    const countDestroyed = await RuleModel.destroy({
      where: {
        name: ruleData.name,
      },
    });
    expect(countDestroyed).toEqual(1);
  });
});
