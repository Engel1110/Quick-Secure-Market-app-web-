const prisma = require("../utils/prisma");

/*
|--------------------------------------------------------------------------
| QSM FASE 5.3B
|--------------------------------------------------------------------------
| Implementación funcional compatible con el modelo Warehouse actual.
| No depende todavía de WarehouseItem ni de modelos avanzados.
|--------------------------------------------------------------------------
*/

function parsePositiveInt(value) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : null;
}

function getWarehouseId(req) {
  return parsePositiveInt(
    req.params?.warehouseItemId ??
    req.params?.id
  );
}

function cleanText(value) {
  return String(value || "").trim();
}

const productInclude = {
  product: {
    include: {
      seller: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  }
};

async function findRelatedOrder(
  client,
  productId
) {
  return client.order.findFirst({
    where: {
      productId,
      status: {
        notIn: [
          "CANCELLED",
          "COMPLETED",
          "REFUNDED",
          "REJECTED"
        ]
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

function addTimelineEvent(
  timeline,
  status,
  description,
  createdBy
) {
  const events =
    Array.isArray(timeline)
      ? [...timeline]
      : [];

  events.push({
    status,
    description,
    createdBy: createdBy || null,
    metadata: {},
    createdAt:
      new Date().toISOString()
  });

  return events;
}

async function listWarehouseItems(
  req,
  res,
  next
) {
  try {
    const search =
      cleanText(req.query?.search);

    const data =
      await prisma.warehouse.findMany({
        where: search
          ? {
              product: {
                is: {
                  title: {
                    contains: search,
                    mode: "insensitive"
                  }
                }
              }
            }
          : {},
        include:
          productInclude,
        orderBy: {
          createdAt: "desc"
        }
      });

    const productIds =
      data.map((item) => item.productId);

    const orders =
      productIds.length
        ? await prisma.order.findMany({
            where: {
              productId: {
                in: productIds
              }
            },
            orderBy: {
              createdAt: "desc"
            }
          })
        : [];

    const latestOrderByProduct =
      new Map();

    for (const order of orders) {
      if (
        !latestOrderByProduct.has(
          order.productId
        )
      ) {
        latestOrderByProduct.set(
          order.productId,
          order
        );
      }
    }

    const items =
      data.map((item) => ({
        ...item,
        order:
          latestOrderByProduct.get(
            item.productId
          ) || null,
        status:
          item.shipped
            ? "READY_FOR_DELIVERY"
            : item.stored
            ? "STORED"
            : item.certified
            ? "APPROVED"
            : item.inspected
            ? "INSPECTED"
            : item.received
            ? "RECEIVED"
            : "AWAITING_WAREHOUSE"
      }));

    return res.status(200).json({
      success: true,
      count: items.length,
      total: items.length,
      data: items,
      items
    });
  } catch (error) {
    return next(error);
  }
}

async function getWarehouseItem(
  req,
  res,
  next
) {
  try {
    const id =
      getWarehouseId(req);

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de almacén no es válido."
      });
    }

    const data =
      await prisma.warehouse.findUnique({
        where: {
          id
        },
        include:
          productInclude
      });

    if (!data) {
      return res.status(404).json({
        success: false,
        message:
          "Producto de almacén no encontrado."
      });
    }

    const order =
      await findRelatedOrder(
        prisma,
        data.productId
      );

    return res.status(200).json({
      success: true,
      data: {
        ...data,
        order
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function getWarehouseStatistics(
  req,
  res,
  next
) {
  try {
    const [
      total,
      received,
      inspected,
      certified,
      stored,
      shipped
    ] = await Promise.all([
      prisma.warehouse.count(),
      prisma.warehouse.count({
        where: { received: true }
      }),
      prisma.warehouse.count({
        where: { inspected: true }
      }),
      prisma.warehouse.count({
        where: { certified: true }
      }),
      prisma.warehouse.count({
        where: { stored: true }
      }),
      prisma.warehouse.count({
        where: { shipped: true }
      })
    ]);

    return res.status(200).json({
      success: true,
      data: {
        total,
        awaiting:
          Math.max(
            total - received,
            0
          ),
        received,
        inspected,
        certified,
        stored,
        shipped,
        readyForDelivery:
          shipped
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function getWarehouseTimeline(
  req,
  res,
  next
) {
  try {
    const id =
      getWarehouseId(req);

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de almacén no es válido."
      });
    }

    const item =
      await prisma.warehouse.findUnique({
        where: {
          id
        }
      });

    if (!item) {
      return res.status(404).json({
        success: false,
        message:
          "Producto de almacén no encontrado."
      });
    }

    const order =
      await findRelatedOrder(
        prisma,
        item.productId
      );

    const timeline =
      Array.isArray(order?.timeline)
        ? order.timeline.filter(
            (event) =>
              String(
                event?.status || ""
              ).includes("WAREHOUSE") ||
              [
                "PRODUCT_SENT_TO_WAREHOUSE",
                "PRODUCT_RECEIVED_AT_WAREHOUSE",
                "WAREHOUSE_INSPECTION_COMPLETED",
                "WAREHOUSE_PRODUCT_STORED",
                "WAREHOUSE_READY_FOR_DELIVERY"
              ].includes(
                event?.status
              )
          )
        : [];

    return res.status(200).json({
      success: true,
      count: timeline.length,
      total: timeline.length,
      data: timeline,
      timeline
    });
  } catch (error) {
    return next(error);
  }
}

async function getRecentActivity(
  req,
  res,
  next
) {
  try {
    const data =
      await prisma.warehouse.findMany({
        take: 10,
        include: {
          product: {
            select: {
              id: true,
              title: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      });

    return res.status(200).json({
      success: true,
      count: data.length,
      total: data.length,
      data
    });
  } catch (error) {
    return next(error);
  }
}

async function getWarehouseKpis(
  req,
  res,
  next
) {
  return getWarehouseStatistics(
    req,
    res,
    next
  );
}

async function receiveWarehouseItem(
  req,
  res,
  next
) {
  try {
    const id =
      getWarehouseId(req);

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de almacén no es válido."
      });
    }

    const employeeId =
      parsePositiveInt(req.user?.id);

    const notes =
      cleanText(req.body?.notes);

    const result =
      await prisma.$transaction(
        async (tx) => {
          const item =
            await tx.warehouse.findUnique({
              where: {
                id
              }
            });

          if (!item) {
            throw Object.assign(
              new Error(
                "Producto de almacén no encontrado."
              ),
              { statusCode: 404 }
            );
          }

          const updated =
            await tx.warehouse.update({
              where: {
                id
              },
              data: {
                received: true,
                notes:
                  notes ||
                  item.notes
              }
            });

          const order =
            await findRelatedOrder(
              tx,
              item.productId
            );

          if (order) {
            const timeline =
              addTimelineEvent(
                order.timeline,
                "PRODUCT_RECEIVED_AT_WAREHOUSE",
                "El almacén QSM recibió físicamente el producto.",
                employeeId
              );

            await tx.order.update({
              where: {
                id: order.id
              },
              data: {
                status:
                  "IN_WAREHOUSE",
                warehouseStatus:
                  "RECEIVED",
                deliveryStatus:
                  "IN_WAREHOUSE",
                warehouseReceivedAt:
                  order.warehouseReceivedAt ||
                  new Date(),
                warehouseAgentId:
                  employeeId ||
                  order.warehouseAgentId,
                warehouseNotes:
                  notes ||
                  order.warehouseNotes,
                timeline
              }
            });
          }

          return updated;
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "Producto recibido correctamente en el almacén.",
      data: result
    });
  } catch (error) {
    return next(error);
  }
}

async function approveInspection(
  req,
  res,
  next
) {
  try {
    const id =
      getWarehouseId(req);

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de almacén no es válido."
      });
    }

    const employeeId =
      parsePositiveInt(req.user?.id);

    const notes =
      cleanText(req.body?.notes);

    const result =
      await prisma.$transaction(
        async (tx) => {
          const item =
            await tx.warehouse.findUnique({
              where: {
                id
              }
            });

          if (!item) {
            throw Object.assign(
              new Error(
                "Producto de almacén no encontrado."
              ),
              { statusCode: 404 }
            );
          }

          if (!item.received) {
            throw Object.assign(
              new Error(
                "El producto debe recibirse antes de aprobar la inspección."
              ),
              { statusCode: 409 }
            );
          }

          const updated =
            await tx.warehouse.update({
              where: {
                id
              },
              data: {
                inspected: true,
                certified: true,
                notes:
                  notes ||
                  item.notes
              }
            });

          const order =
            await findRelatedOrder(
              tx,
              item.productId
            );

          if (order) {
            const now =
              new Date();

            const timeline =
              addTimelineEvent(
                order.timeline,
                "WAREHOUSE_INSPECTION_COMPLETED",
                "El almacén aprobó y certificó el producto.",
                employeeId
              );

            await tx.order.update({
              where: {
                id: order.id
              },
              data: {
                status:
                  "UNDER_INSPECTION",
                warehouseStatus:
                  "APPROVED",
                warehouseApprovedAt:
                  order.warehouseApprovedAt ||
                  now,
                inspectionNotes:
                  notes ||
                  order.inspectionNotes,
                warehouseAgentId:
                  employeeId ||
                  order.warehouseAgentId,
                timeline
              }
            });
          }

          return updated;
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "Inspección aprobada y producto certificado.",
      data: result
    });
  } catch (error) {
    return next(error);
  }
}

async function assignLocation(
  req,
  res,
  next
) {
  try {
    const id =
      getWarehouseId(req);

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de almacén no es válido."
      });
    }

    const employeeId =
      parsePositiveInt(req.user?.id);

    const location =
      cleanText(
        req.body?.location ||
        req.body?.storageLocation
      );

    if (!location) {
      return res.status(400).json({
        success: false,
        message:
          "Debe indicar una ubicación de almacenamiento."
      });
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const item =
            await tx.warehouse.findUnique({
              where: {
                id
              }
            });

          if (!item) {
            throw Object.assign(
              new Error(
                "Producto de almacén no encontrado."
              ),
              { statusCode: 404 }
            );
          }

          if (!item.certified) {
            throw Object.assign(
              new Error(
                "El producto debe aprobar la inspección antes de almacenarse."
              ),
              { statusCode: 409 }
            );
          }

          const updated =
            await tx.warehouse.update({
              where: {
                id
              },
              data: {
                stored: true,
                notes:
                  [
                    item.notes,
                    "Ubicación: " + location
                  ]
                    .filter(Boolean)
                    .join(" | ")
              }
            });

          const order =
            await findRelatedOrder(
              tx,
              item.productId
            );

          if (order) {
            const timeline =
              addTimelineEvent(
                order.timeline,
                "WAREHOUSE_PRODUCT_STORED",
                "Producto almacenado en: " +
                  location,
                employeeId
              );

            await tx.order.update({
              where: {
                id: order.id
              },
              data: {
                status:
                  "READY_FOR_PICKUP",
                warehouseStatus:
                  "STORED",
                readyForPickupAt:
                  order.readyForPickupAt ||
                  new Date(),
                warehouseAgentId:
                  employeeId ||
                  order.warehouseAgentId,
                warehouseNotes:
                  [
                    order.warehouseNotes,
                    "Ubicación: " +
                      location
                  ]
                    .filter(Boolean)
                    .join(" | "),
                timeline
              }
            });
          }

          return updated;
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "Producto almacenado correctamente.",
      data: result
    });
  } catch (error) {
    return next(error);
  }
}

async function markReadyForDelivery(
  req,
  res,
  next
) {
  try {
    const id =
      getWarehouseId(req);

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de almacén no es válido."
      });
    }

    const employeeId =
      parsePositiveInt(req.user?.id);

    const result =
      await prisma.$transaction(
        async (tx) => {
          const item =
            await tx.warehouse.findUnique({
              where: {
                id
              }
            });

          if (!item) {
            throw Object.assign(
              new Error(
                "Producto de almacén no encontrado."
              ),
              { statusCode: 404 }
            );
          }

          if (!item.stored) {
            throw Object.assign(
              new Error(
                "El producto debe estar almacenado antes de prepararlo para Delivery."
              ),
              { statusCode: 409 }
            );
          }

          const updated =
            await tx.warehouse.update({
              where: {
                id
              },
              data: {
                shipped: true
              }
            });

          const order =
            await findRelatedOrder(
              tx,
              item.productId
            );

          if (order) {
            // QSM_5_3C_AUTO_DELIVERY
            const existingShipping =
              await tx.shipping.findUnique({
                where: {
                  orderId:
                    order.id
                }
              });

            let trackingCode =
              order.trackingNumber;

            if (!existingShipping) {
              trackingCode =
                "QSM-DLV-" +
                Date.now().toString().slice(-8) +
                "-" +
                Math.floor(
                  Math.random() * 90 + 10
                );

              await tx.shipping.create({
                data: {
                  orderId:
                    order.id,
                  buyerId:
                    order.buyerId,
                  sellerId:
                    order.sellerId,
                  productId:
                    order.productId,
                  trackingCode,
                  carrier:
                    "QSM Delivery",
                  originAddress:
                    order.pickupAddress ||
                    "Almacén QSM",
                  deliveryAddress:
                    order.deliveryAddress ||
                    "Dirección pendiente",
                  deliveryNotes:
                    "Creado automáticamente desde Warehouse.",
                  status:
                    "PENDING"
                }
              });
            } else {
              trackingCode =
                existingShipping.trackingCode;
            }

            let timeline =
              addTimelineEvent(
                order.timeline,
                "WAREHOUSE_READY_FOR_DELIVERY",
                "El almacén preparó el producto para Delivery.",
                employeeId
              );

            timeline =
              addTimelineEvent(
                timeline,
                "DELIVERY_CREATED",
                "Delivery creado automáticamente desde Warehouse.",
                employeeId
              );

            await tx.order.update({
              where: {
                id: order.id
              },
              data: {
                status:
                  "READY_FOR_PICKUP",
                warehouseStatus:
                  "READY_FOR_DELIVERY",
                deliveryStatus:
                  "READY_FOR_PICKUP",
                trackingNumber:
                  trackingCode,
                trackingCompany:
                  "QSM Delivery",
                readyForPickupAt:
                  order.readyForPickupAt ||
                  new Date(),
                warehouseAgentId:
                  employeeId ||
                  order.warehouseAgentId,
                timeline
              }
            });
          }

          return updated;
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "Producto listo para Delivery.",
      data: result
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listWarehouseItems,
  getWarehouseItem,
  getWarehouseStatistics,
  getWarehouseTimeline,
  getRecentActivity,
  getWarehouseKpis,
  receiveWarehouseItem,
  approveInspection,
  assignLocation,
  markReadyForDelivery
};
