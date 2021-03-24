import {
  Model,
  Sequelize,
  DataTypes,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  Association,
} from "sequelize";

import { ItemModel } from "./ItemModel";

export class AssignmentModel extends Model  {
  public itemName!: string;
  public username!: string;

  public getItem!: BelongsToGetAssociationMixin<ItemModel>;
  public setItem!: BelongsToSetAssociationMixin<ItemModel, string>;
  public readonly item!: ItemModel;

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
      // indexes: [
      //   {
      //     unique: true,
      //     fields: ["item_id", "user_id"],
      //   },
      //   {
      //     fields: ["user_id"],
      //   },
      // ],
    }
  );
  return AssignmentModel;
};
