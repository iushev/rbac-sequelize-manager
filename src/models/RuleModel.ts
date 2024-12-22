import { Model, Sequelize, DataTypes } from "sequelize";

import { RuleExecuteFunction } from "@iushev/rbac";

export class RuleModel extends Model {
  declare public name: string;
  declare public data: string;

  public execute: RuleExecuteFunction = async () => true;
}

export default (sequelize: Sequelize): typeof RuleModel => {
  RuleModel.init(
    {
      name: {
        type: DataTypes.STRING(64),
        primaryKey: true,
      },
      data: DataTypes.TEXT(),
    },
    {
      sequelize,
      tableName: "rbac_rule",
      underscored: true,
    },
  );

  return RuleModel;
};
