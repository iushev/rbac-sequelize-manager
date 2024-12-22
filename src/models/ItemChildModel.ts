import { Model, Sequelize, DataTypes, BelongsToGetAssociationMixin, BelongsToSetAssociationMixin } from "sequelize";

import { ItemModel } from "./ItemModel";

export class ItemChildModel extends Model {
  declare public parentName: string;
  declare public childName: string;

  declare public getParent: BelongsToGetAssociationMixin<ItemModel>;
  declare public setParent: BelongsToSetAssociationMixin<ItemModel, string>;
  declare public readonly parent: ItemModel;

  declare public getChild: BelongsToGetAssociationMixin<ItemModel>;
  declare public setChild: BelongsToSetAssociationMixin<ItemModel, string>;
  declare public readonly child: ItemModel;

  public static associate() {
    ItemChildModel.belongsTo(ItemModel, {
      as: "parent",
      foreignKey: "parentName",
    });
    ItemChildModel.belongsTo(ItemModel, {
      as: "child",
      foreignKey: "childName",
    });
  }
}

export default (sequelize: Sequelize): typeof ItemChildModel => {
  ItemChildModel.init(
    {
      parentName: {
        type: DataTypes.STRING(64),
        primaryKey: true,
        allowNull: false,
        references: {
          model: ItemModel,
          key: "name",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      childName: {
        type: DataTypes.STRING(64),
        primaryKey: true,
        allowNull: false,
        references: {
          model: ItemModel,
          key: "name",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
    },
    {
      sequelize,
      tableName: "rbac_item_child",
      underscored: true,
      timestamps: false,
    },
  );

  return ItemChildModel;
};
