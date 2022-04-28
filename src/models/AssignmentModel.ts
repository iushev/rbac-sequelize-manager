import {
  Model,
  Sequelize,
  DataTypes,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  Association,
} from "sequelize";

import { ItemModel } from "./ItemModel";

export class AssignmentModel extends Model {
  public declare itemName: string;
  public declare username: string;

  public declare getItem: BelongsToGetAssociationMixin<ItemModel>;
  public declare setItem: BelongsToSetAssociationMixin<ItemModel, string>;
  public declare readonly item: ItemModel;

  public static associations: {
    item: Association<AssignmentModel, ItemModel>;
  };

  public static associate() {
    AssignmentModel.belongsTo(ItemModel, {
      as: "item",
      foreignKey: "itemName",
      targetKey: "name",
    });
  }
}

export default (sequelize: Sequelize): typeof AssignmentModel => {
  AssignmentModel.init(
    {
      itemName: {
        type: DataTypes.STRING(64),
        primaryKey: true,
        allowNull: false,
        unique: "assignment",
        references: {
          model: ItemModel,
          key: "name",
        },
        onDelete: "CASCADE",
      },
      username: {
        type: DataTypes.STRING(256),
        primaryKey: true,
        allowNull: false,
        unique: "assignment",
      },
    },
    {
      sequelize,
      tableName: "rbac_assignment",
      underscored: true,
      updatedAt: false,
    }
  );
  return AssignmentModel;
};
