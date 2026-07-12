const mongoose = require("mongoose");
require("dotenv").config();

const Role = require("../src/models/Role");
const Permission = require("../src/models/Permission");

const ROLE_DEFINITIONS = [
  {
    name: "SUPER_ADMIN",
    description:
      "Propietario principal de QSM con acceso total al BackOffice.",
    all: true
  },

  {
    name: "SENIOR_ADMIN",
    description:
      "Administrador operativo con acceso amplio, excepto configuraciones críticas.",
    modules: [
      "ADMIN",
      "WAREHOUSE",
      "DELIVERY",
      "DISPUTES",
      "SUPPORT",
      "MODERATION",
      "REPORTS"
    ]
  },

  {
    name: "WAREHOUSE_MANAGER",
    description:
      "Responsable de todas las operaciones del almacén.",
    modules: ["WAREHOUSE"]
  },

  {
    name: "WAREHOUSE_STAFF",
    description:
      "Empleado operativo del almacén.",
    modules: ["WAREHOUSE"]
  },

  {
    name: "DELIVERY_MANAGER",
    description:
      "Responsable de repartidores, asignaciones y entregas.",
    modules: ["DELIVERY"]
  },

  {
    name: "DELIVERY_AGENT",
    description:
      "Repartidor autorizado para gestionar sus entregas asignadas.",
    modules: ["DELIVERY"]
  },

  {
    name: "FINANCE_MANAGER",
    description:
      "Responsable de pagos, escrow, comisiones y reembolsos.",
    modules: ["FINANCE"]
  },

  {
    name: "FINANCE_AGENT",
    description:
      "Empleado operativo del departamento financiero.",
    modules: ["FINANCE"]
  },

  {
    name: "AUDITOR",
    description:
      "Usuario de solo lectura para auditoría y trazabilidad.",
    modules: ["AUDIT"]
  },

  {
    name: "SECURITY_MANAGER",
    description:
      "Responsable de seguridad, sesiones y alertas.",
    modules: ["SECURITY"]
  },

  {
    name: "SECURITY_ANALYST",
    description:
      "Analista de alertas y actividad sospechosa.",
    modules: ["SECURITY"]
  },

  {
    name: "SUPPORT_MANAGER",
    description:
      "Responsable del equipo de soporte.",
    modules: ["SUPPORT"]
  },

  {
    name: "SUPPORT_AGENT",
    description:
      "Agente autorizado para administrar tickets.",
    modules: ["SUPPORT"]
  },

  {
    name: "DISPUTE_MANAGER",
    description:
      "Responsable de investigación y resolución de disputas.",
    modules: ["DISPUTES"]
  },

  {
    name: "DISPUTE_AGENT",
    description:
      "Agente autorizado para investigar disputas.",
    modules: ["DISPUTES"]
  },

  {
    name: "MODERATION_MANAGER",
    description:
      "Responsable de moderación de productos y usuarios.",
    modules: ["MODERATION"]
  },

  {
    name: "MODERATOR",
    description:
      "Empleado autorizado para revisar contenido reportado.",
    modules: ["MODERATION"]
  }
];

async function seedRoles() {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      "No se encontró MONGODB_URI en el archivo backend/.env."
    );
  }

  console.log("🔌 Conectando a MongoDB...");

  await mongoose.connect(process.env.MONGODB_URI);

  console.log("✅ MongoDB conectado.");

  const permissions = await Permission.find({
    isActive: true
  });

  console.log(
    `🔑 Permisos activos encontrados: ${permissions.length}`
  );

  for (const roleDefinition of ROLE_DEFINITIONS) {
    const permissionIds = roleDefinition.all
      ? permissions.map((permission) => permission._id)
      : permissions
          .filter((permission) =>
            roleDefinition.modules.includes(
              String(permission.module || "")
                .trim()
                .toUpperCase()
            )
          )
          .map((permission) => permission._id);

    const role = await Role.findOneAndUpdate(
      {
        name: roleDefinition.name
      },
      {
        name: roleDefinition.name,
        description: roleDefinition.description,
        permissions: permissionIds,
        isSystem: true,
        isActive: true
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true
      }
    );

    console.log(
      `✅ ${role.name}: ${permissionIds.length} permisos`
    );
  }

  console.log("");
  console.log(
    "✅ Roles creados o actualizados correctamente."
  );
}

async function run() {
  try {
    await seedRoles();
  } catch (error) {
    console.error("");
    console.error("❌ Error creando roles:");
    console.error(error);

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();

    console.log("🔌 Conexión MongoDB cerrada.");
  }
}

run();