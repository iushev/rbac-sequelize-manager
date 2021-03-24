import { QueryInterface, DataTypes } from "sequelize";
import { ItemType } from "@iushev/rbac";

export const up = async (query: QueryInterface) => {
  const transaction = await query.sequelize.transaction();
  try {
    await query.createTable(
      "rbac_rule",
      {
        name: {
          type: DataTypes.STRING(64),
          primaryKey: true,
          allowNull: false,
        },
        data: DataTypes.TEXT(),
        created_at: DataTypes.DATE(),
        updated_at: DataTypes.DATE(),
      },
      {
        transaction,
      }
    );

    await query.createTable(
      "rbac_item",
      {
        name: {
          type: DataTypes.STRING(64),
          primaryKey: true,
          allowNull: false,
        },
        type: {
          type: DataTypes.ENUM,
          allowNull: false,
          values: Object.keys(ItemType).map(
            (key) => ItemType[key as keyof (typeof ItemType)]
          ),
        },
        description: DataTypes.TEXT(),
        rule_name: DataTypes.STRING(64),
        data: DataTypes.TEXT(),
        created_at: DataTypes.DATE(),
        updated_at: DataTypes.DATE(),
      },
      {
        transaction,
      }
    );

    await query.addConstraint("rbac_item", {
      type: "foreign key",
      fields: ["rule_name"],
      references: {
        table: "rbac_rule",
        field: "name",
      },
      onDelete: "set null",
      onUpdate: "cascade",
      transaction,
    });

    await query.addIndex("rbac_item", {
      fields: ["type"],
      transaction,
    });

    await query.createTable(
      "rbac_item_child",
      {
        parent_name: {
          type: DataTypes.STRING(64),
          primaryKey: true,
          allowNull: false,
        },
        child_name: {
          type: DataTypes.STRING(64),
          primaryKey: true,
          allowNull: false,
        },
      },
      {
        transaction,
      }
    );

    await query.addConstraint("rbac_item_child", {
      type: "foreign key",
      fields: ["parent_name"],
      references: {
        table: "rbac_item",
        field: "name",
      },
      onDelete: "cascade",
      onUpdate: "cascade",
      transaction,
    });

    await query.addConstraint("rbac_item_child", {
      type: "foreign key",
      fields: ["child_name"],
      references: {
        table: "rbac_item",
        field: "name",
      },
      onDelete: "cascade",
      onUpdate: "cascade",
      transaction,
    });

    await query.createTable(
      "rbac_assignment",
      {
        item_name: {
          type: DataTypes.STRING(64),
          primaryKey: true,
          allowNull: false,
        },
        username: {
          type: DataTypes.STRING(256),
          primaryKey: true,
          allowNull: false,
          unique: "assignment",
        },
        created_at: DataTypes.DATE(),
      },
      {
        transaction,
      }
    );

    await query.addConstraint("rbac_assignment", {
      type: "foreign key",
      fields: ["item_name"],
      references: {
        table: "rbac_item",
        field: "name",
      },
      onDelete: "cascade",
      onUpdate: "cascade",
      transaction,
    });

    await query.addIndex("rbac_assignment", {
      fields: ["username"],
      transaction,
    });

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export const down = async (query: QueryInterface) => {
  const transaction = await query.sequelize.transaction();
  try {
    await query.dropTable("rbac_assignment", { transaction });
    await query.dropTable("rbac_item_child", { transaction });
    await query.dropTable("rbac_item", { transaction });
    await query.dropTable("rbac_rule", { transaction });

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
