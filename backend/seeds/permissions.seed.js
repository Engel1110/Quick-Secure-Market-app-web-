const mongoose = require("mongoose");
require("dotenv").config();

const Permission = require("../src/models/Permission");

const definitions = [
/*
|--------------------------------------------------------------------------
| Administración de usuarios internos
|--------------------------------------------------------------------------
*/

[
  "INTERNAL_USERS_VIEW",
  "Ver usuarios internos",
  "ADMIN",
  "Permite consultar empleados y cuentas administrativas."
],
[
  "INTERNAL_USERS_CREATE",
  "Crear usuarios internos",
  "ADMIN",
  "Permite crear empleados administrativos."
],
[
  "INTERNAL_USERS_UPDATE",
  "Editar usuarios internos",
  "ADMIN",
  "Permite modificar la información general de empleados internos."
],
[
  "INTERNAL_USERS_SUSPEND",
  "Suspender usuarios internos",
  "ADMIN",
  "Permite suspender temporalmente cuentas internas."
],
[
  "INTERNAL_USERS_ACTIVATE",
  "Activar usuarios internos",
  "ADMIN",
  "Permite activar o reactivar cuentas administrativas."
],
[
  "INTERNAL_USERS_RESET_PASSWORD",
  "Restablecer contraseñas internas",
  "ADMIN",
  "Permite generar una contraseña temporal para un empleado."
],
[
  "INTERNAL_USERS_CHANGE_ROLE",
  "Cambiar roles internos",
  "ADMIN",
  "Permite cambiar el rol y el departamento de un empleado interno."
],
[
  "INTERNAL_USERS_ASSIGN_PERMISSIONS",
  "Asignar permisos internos",
  "ADMIN",
  "Permite asignar o retirar permisos específicos a una cuenta interna."
],
[
  "INTERNAL_USERS_VIEW_ACTIVITY",
  "Ver actividad de usuarios internos",
  "ADMIN",
  "Permite consultar el historial y las acciones de empleados internos."
],


  /*
  |--------------------------------------------------------------------------
  | Dashboard
  |--------------------------------------------------------------------------
  */

  [
    "DASHBOARD_VIEW",
    "Ver dashboard administrativo",
    "ADMIN",
    "Permite acceder al resumen principal del BackOffice."
  ],

  /*
  |--------------------------------------------------------------------------
  | Almacén
  |--------------------------------------------------------------------------
  */

  [
    "WAREHOUSE_VIEW",
    "Ver almacén",
    "WAREHOUSE",
    "Permite consultar operaciones del almacén."
  ],
  [
    "WAREHOUSE_RECEIVE",
    "Recibir productos",
    "WAREHOUSE",
    "Permite registrar la recepción de productos."
  ],
  [
    "WAREHOUSE_INSPECT",
    "Inspeccionar productos",
    "WAREHOUSE",
    "Permite inspeccionar y documentar productos."
  ],
  [
    "WAREHOUSE_APPROVE",
    "Aprobar productos",
    "WAREHOUSE",
    "Permite aprobar productos inspeccionados."
  ],
  [
    "WAREHOUSE_REJECT",
    "Rechazar productos",
    "WAREHOUSE",
    "Permite rechazar productos inspeccionados."
  ],
  [
    "WAREHOUSE_MARK_DAMAGED",
    "Marcar productos dañados",
    "WAREHOUSE",
    "Permite registrar productos dañados."
  ],
  [
    "WAREHOUSE_DISPATCH",
    "Despachar productos",
    "WAREHOUSE",
    "Permite entregar productos al área de Delivery."
  ],

  /*
  |--------------------------------------------------------------------------
  | Delivery
  |--------------------------------------------------------------------------
  */

  [
    "DELIVERY_VIEW",
    "Ver delivery",
    "DELIVERY",
    "Permite consultar entregas y repartidores."
  ],
  [
    "DELIVERY_ASSIGN",
    "Asignar entregas",
    "DELIVERY",
    "Permite asignar pedidos a repartidores."
  ],
  [
    "DELIVERY_PICKUP",
    "Registrar recogida",
    "DELIVERY",
    "Permite marcar un pedido como recogido."
  ],
  [
    "DELIVERY_IN_TRANSIT",
    "Registrar pedido en camino",
    "DELIVERY",
    "Permite marcar un pedido como en camino."
  ],
  [
    "DELIVERY_CONFIRM",
    "Confirmar entregas",
    "DELIVERY",
    "Permite confirmar que un pedido fue entregado."
  ],
  [
    "DELIVERY_RESCHEDULE",
    "Reprogramar entregas",
    "DELIVERY",
    "Permite reprogramar una entrega."
  ],

  /*
  |--------------------------------------------------------------------------
  | Finanzas
  |--------------------------------------------------------------------------
  */

  [
    "FINANCE_VIEW",
    "Ver finanzas",
    "FINANCE",
    "Permite consultar transacciones financieras."
  ],
  [
    "FINANCE_CONFIRM_PAYMENT",
    "Confirmar pagos",
    "FINANCE",
    "Permite confirmar pagos recibidos."
  ],
  [
    "FINANCE_RELEASE_FUNDS",
    "Liberar fondos",
    "FINANCE",
    "Permite liberar dinero retenido en escrow."
  ],
  [
    "FINANCE_REFUND",
    "Procesar reembolsos",
    "FINANCE",
    "Permite procesar devoluciones de dinero."
  ],

  /*
  |--------------------------------------------------------------------------
  | Auditoría y disputas
  |--------------------------------------------------------------------------
  */

  [
    "AUDIT_VIEW",
    "Ver auditoría",
    "AUDIT",
    "Permite consultar registros y acciones administrativas."
  ],
  [
    "DISPUTE_VIEW",
    "Ver disputas",
    "DISPUTES",
    "Permite consultar disputas."
  ],
  [
    "DISPUTE_REVIEW",
    "Revisar disputas",
    "DISPUTES",
    "Permite investigar disputas."
  ],
  [
    "DISPUTE_RESOLVE",
    "Resolver disputas",
    "DISPUTES",
    "Permite emitir una decisión sobre una disputa."
  ],
  [
    "DISPUTE_ESCALATE",
    "Escalar disputas",
    "DISPUTES",
    "Permite elevar una disputa a un responsable superior."
  ],

  /*
  |--------------------------------------------------------------------------
  | Seguridad
  |--------------------------------------------------------------------------
  */

  [
    "SECURITY_VIEW",
    "Ver seguridad",
    "SECURITY",
    "Permite consultar alertas de seguridad."
  ],
  [
    "SECURITY_BLOCK_USER",
    "Bloquear usuarios",
    "SECURITY",
    "Permite bloquear temporalmente un usuario."
  ],
  [
    "SECURITY_VIEW_SESSIONS",
    "Ver sesiones activas",
    "SECURITY",
    "Permite consultar sesiones activas."
  ],
  [
    "SECURITY_REVOKE_SESSIONS",
    "Revocar sesiones",
    "SECURITY",
    "Permite cerrar sesiones de usuarios."
  ],

  /*
  |--------------------------------------------------------------------------
  | Soporte
  |--------------------------------------------------------------------------
  */

  [
    "SUPPORT_VIEW",
    "Ver tickets",
    "SUPPORT",
    "Permite consultar tickets de soporte."
  ],
  [
    "SUPPORT_UPDATE",
    "Actualizar tickets",
    "SUPPORT",
    "Permite responder y actualizar tickets."
  ],
  [
    "SUPPORT_ESCALATE",
    "Escalar tickets",
    "SUPPORT",
    "Permite escalar casos de soporte."
  ],

  /*
  |--------------------------------------------------------------------------
  | Moderación
  |--------------------------------------------------------------------------
  */

  [
    "MODERATION_VIEW",
    "Ver contenido reportado",
    "MODERATION",
    "Permite consultar reportes y publicaciones."
  ],
  [
    "MODERATION_HIDE_PRODUCT",
    "Ocultar productos",
    "MODERATION",
    "Permite ocultar productos reportados."
  ],
  [
    "MODERATION_SUSPEND_USER",
    "Suspender usuarios reportados",
    "MODERATION",
    "Permite suspender usuarios desde moderación."
  ],

  /*
  |--------------------------------------------------------------------------
  | Reportes
  |--------------------------------------------------------------------------
  */

  [
    "REPORTS_VIEW",
    "Ver reportes",
    "REPORTS",
    "Permite consultar reportes administrativos."
  ],
  [
    "REPORTS_EXPORT",
    "Exportar reportes",
    "REPORTS",
    "Permite exportar información del BackOffice."
  ]
];

async function seedPermissions() {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      "No se encontró MONGODB_URI en el archivo backend/.env."
    );
  }

  console.log("🔌 Conectando a MongoDB...");

  await mongoose.connect(process.env.MONGODB_URI);

  console.log("✅ MongoDB conectado.");

  for (const [code, name, module, description] of definitions) {
    await Permission.findOneAndUpdate(
      { code },
      {
        code,
        name,
        module,
        description,
        isActive: true
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true
      }
    );
  }

  console.log(
    `✅ ${definitions.length} permisos creados o actualizados.`
  );
}

async function run() {
  try {
    await seedPermissions();
  } catch (error) {
    console.error("");
    console.error("❌ Error creando permisos:");
    console.error(error);

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();

    console.log("🔌 Conexión MongoDB cerrada.");
  }
}

run();