import { Model, Sequelize, DataTypes, BelongsToGetAssociationMixin, BelongsToSetAssociationMixin } from "sequelize";

import { ItemModel } from "./ItemModel";

export class ItemChildModel extends Model {
  public declare parentName: string;
  public declare childName: string;

  public declare getParent: BelongsToGetAssociationMixin<ItemModel>;
  public declare setParent: BelongsToSetAssociationMixin<ItemModel, string>;
  public declare readonly parent: ItemModel;

  public declare getChild: BelongsToGetAssociationMixin<ItemModel>;
  public declare setChild: BelongsToSetAssociationMixin<ItemModel, string>;
  public declare readonly child: ItemModel;

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
    }
  );

  return ItemChildModel;
};
