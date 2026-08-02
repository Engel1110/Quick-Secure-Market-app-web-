const crypto = require("crypto");
const prisma = require("../utils/prisma");

function parsePositiveInt(value) {
  const parsed = Number(value);

  return Number.isInteger(parsed) &&
    parsed > 0
    ? parsed
    : null;
}

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeUpper(value) {
  return cleanText(value).toUpperCase();
}

function generateTrackingCode() {
  return (
    "QSM-DLV-" +
    Date.now().toString().slice(-8) +
    "-" +
    crypto.randomInt(10, 100)
  );
}

function addTimelineEvent(
  timeline,
  status,
  description,
  createdBy,
  metadata = {}
) {
  const events =
    Array.isArray(timeline)
      ? [...timeline]
      : [];

  events.push({
    status,
    description,
    createdBy: createdBy || null,
    metadata,
    createdAt:
      new Date().toISOString()
  });

  return events;
}

async function createNotificationSafe(
  client,
  userId,
  type,
  title,
  message
) {
  if (!userId) {
    return;
  }

  try {
    await client.notification.create({
      data: {
        userId,
        title,
        message:
          "[" + type + "] " + message,
        read: false
      }
    });
  } catch (error) {
    console.error(
      "Delivery notification error:",
      error.message
    );
  }
}

const shippingInclude = {
  order: {
    include: {
      product: true,
      buyer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      seller: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  },
  product: true,
  buyer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true
    }
  },
  seller: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true
    }
  }
};

function serializeShipping(shipping) {
  if (!shipping) {
    return null;
  }

  return {
    ...shipping,
    _id: String(shipping.id),
    deliveryId: shipping.id,
    trackingNumber:
      shipping.trackingCode,
    status:
      normalizeUpper(
        shipping.status
      )
  };
}

async function listDeliveries(
  req,
  res
) {
  try {
    const status =
      normalizeUpper(
        req.query?.status
      );

    const search =
      cleanText(
        req.query?.search
      );

    const where = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        {
          trackingCode: {
            contains: search,
            mode: "insensitive"
          }
        },
        {
          deliveryAddress: {
            contains: search,
            mode: "insensitive"
          }
        },
        {
          product: {
            is: {
              title: {
                contains: search,
                mode: "insensitive"
              }
            }
          }
        }
      ];
    }

    const deliveries =
      await prisma.shipping.findMany({
        where,
        include:
          shippingInclude,
        orderBy: {
          createdAt: "desc"
        }
      });

    return res.status(200).json({
      success: true,
      count:
        deliveries.length,
      total:
        deliveries.length,
      data:
        deliveries.map(
          serializeShipping
        ),
      deliveries:
        deliveries.map(
          serializeShipping
        )
    });
  } catch (error) {
    console.error(
      "Error listando Delivery:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudieron cargar las entregas."
    });
  }
}

async function getDelivery(
  req,
  res
) {
  try {
    const deliveryId =
      parsePositiveInt(
        req.params.deliveryId
      );

    if (!deliveryId) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de Delivery no es válido."
      });
    }

    const delivery =
      await prisma.shipping.findUnique({
        where: {
          id: deliveryId
        },
        include:
          shippingInclude
      });

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message:
          "Delivery no encontrado."
      });
    }

    return res.status(200).json({
      success: true,
      data:
        serializeShipping(
          delivery
        )
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        "No se pudo consultar el Delivery."
    });
  }
}

async function getDeliveryStatistics(
  req,
  res
) {
  try {
    const [
      total,
      pending,
      pickedUp,
      inTransit,
      delivered,
      failed,
      returned
    ] = await Promise.all([
      prisma.shipping.count(),
      prisma.shipping.count({
        where: {
          status: "PENDING"
        }
      }),
      prisma.shipping.count({
        where: {
          status: "PICKED_UP"
        }
      }),
      prisma.shipping.count({
        where: {
          status: "IN_TRANSIT"
        }
      }),
      prisma.shipping.count({
        where: {
          status: "DELIVERED"
        }
      }),
      prisma.shipping.count({
        where: {
          status: "FAILED"
        }
      }),
      prisma.shipping.count({
        where: {
          status: "RETURNED"
        }
      })
    ]);

    return res.status(200).json({
      success: true,
      data: {
        total,
        pending,
        readyForAssignment:
          pending,
        pickedUp,
        inTransit,
        delivered,
        failed,
        returned,
        completionRate:
          total > 0
            ? Number(
                (
                  delivered /
                  total *
                  100
                ).toFixed(2)
              )
            : 0
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        "No se pudieron calcular las estadísticas de Delivery."
    });
  }
}

async function createDeliveryFromOrder(
  req,
  res
) {
  try {
    const orderId =
      parsePositiveInt(
        req.params.orderId ||
        req.body?.orderId
      );

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de la orden no es válido."
      });
    }

    const employeeId =
      parsePositiveInt(
        req.user?.id
      );

    const order =
      await prisma.order.findUnique({
        where: {
          id: orderId
        },
        include: {
          product: true,
          shipping: true
        }
      });

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Orden no encontrada."
      });
    }

    if (order.shipping) {
      return res.status(200).json({
        success: true,
        recovered: true,
        message:
          "La orden ya tenía un Delivery creado.",
        data:
          serializeShipping(
            await prisma.shipping.findUnique({
              where: {
                id:
                  order.shipping.id
              },
              include:
                shippingInclude
            })
          )
      });
    }

    if (
      ![
        "READY_FOR_PICKUP",
        "WAITING_SELLER",
        "WAITING_WAREHOUSE"
      ].includes(order.status)
    ) {
      return res.status(409).json({
        success: false,
        message:
          "La orden todavía no está lista para crear el Delivery."
      });
    }

    const deliveryAddress =
      cleanText(
        req.body?.deliveryAddress ||
        order.deliveryAddress
      );

    if (!deliveryAddress) {
      return res.status(400).json({
        success: false,
        message:
          "La orden necesita una dirección de entrega."
      });
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const trackingCode =
            generateTrackingCode();

          const shipping =
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
                  cleanText(
                    req.body?.carrier
                  ) ||
                  "QSM Delivery",
                originAddress:
                  cleanText(
                    req.body?.originAddress ||
                    order.pickupAddress
                  ),
                deliveryAddress,
                deliveryNotes:
                  cleanText(
                    req.body?.notes
                  ),
                status:
                  "PENDING"
              }
            });

          const timeline =
            addTimelineEvent(
              order.timeline,
              "DELIVERY_CREATED",
              "QSM creó el Delivery para la orden.",
              employeeId,
              {
                trackingCode
              }
            );

          await tx.order.update({
            where: {
              id: order.id
            },
            data: {
              status:
                "READY_FOR_PICKUP",
              deliveryStatus:
                "READY_FOR_PICKUP",
              trackingNumber:
                trackingCode,
              trackingCompany:
                "QSM Delivery",
              deliveryAddress,
              deliveryAgentId:
                employeeId ||
                order.deliveryAgentId,
              timeline
            }
          });

          await createNotificationSafe(
            tx,
            order.buyerId,
            "DELIVERY_CREATED",
            "Delivery creado",
            "QSM creó el Delivery de tu orden."
          );

          await createNotificationSafe(
            tx,
            order.sellerId,
            "DELIVERY_CREATED",
            "Producto listo para Delivery",
            "QSM creó el Delivery de la orden."
          );

          return shipping.id;
        },
        {
          maxWait: 20000,
          timeout: 60000
        }
      );

    const finalDelivery =
      await prisma.shipping.findUnique({
        where: {
          id: result
        },
        include:
          shippingInclude
      });

    return res.status(201).json({
      success: true,
      message:
        "Delivery creado correctamente.",
      data:
        serializeShipping(
          finalDelivery
        )
    });
  } catch (error) {
    console.error(
      "Error creando Delivery:",
      error
    );

    if (error?.code === "P2002") {
      return res.status(409).json({
        success: false,
        message:
          "Esta orden ya tiene un Delivery."
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "No se pudo crear el Delivery.",
      error:
        process.env.NODE_ENV ===
        "production"
          ? undefined
          : error.message
    });
  }
}

/*
|--------------------------------------------------------------------------
| QSM_5_3E_INSPECTION_FLOW
|--------------------------------------------------------------------------
*/

async function pickupProduct(req,res) {
  try {
    const deliveryId=parsePositiveInt(req.params.deliveryId);
    if(!deliveryId){
      return res.status(400).json({success:false,message:"El identificador de Delivery no es válido."});
    }

    const employeeId=parsePositiveInt(req.user?.id);
    const notes=cleanText(req.body?.notes);

    const current=await prisma.shipping.findUnique({
      where:{id:deliveryId},
      include:{order:true}
    });

    if(!current){
      return res.status(404).json({success:false,message:"Delivery no encontrado."});
    }

    if(!["PENDING","ASSIGNED"].includes(current.status)){
      return res.status(409).json({success:false,message:"El producto no puede recogerse en el estado actual."});
    }

    await prisma.$transaction(async(tx)=>{
      await tx.shipping.update({
        where:{id:current.id},
        data:{status:"PICKED_UP",deliveryNotes:notes||current.deliveryNotes}
      });

      const timeline=addTimelineEvent(
        current.order.timeline,
        "DELIVERY_PRODUCT_PICKED_UP",
        "El agente recogió el producto donde el vendedor.",
        employeeId
      );

      await tx.order.update({
        where:{id:current.orderId},
        data:{
          status:"UNDER_INSPECTION",
          deliveryStatus:"PICKED_UP",
          deliveryAgentId:employeeId||current.order.deliveryAgentId,
          deliveryNotes:notes||current.order.deliveryNotes,
          timeline
        }
      });
    });

    return res.status(200).json({
      success:true,
      message:"Producto recogido. Debe inspeccionarse antes de iniciar el recorrido al comprador."
    });
  } catch(error) {
    return res.status(500).json({success:false,message:"No se pudo registrar la recogida."});
  }
}

async function startDeliveryInspection(req,res) {
  try {
    const deliveryId=parsePositiveInt(req.params.deliveryId);
    if(!deliveryId){
      return res.status(400).json({success:false,message:"El identificador de Delivery no es válido."});
    }

    const employeeId=parsePositiveInt(req.user?.id);

    const current=await prisma.shipping.findUnique({
      where:{id:deliveryId},
      include:{order:true}
    });

    if(!current){
      return res.status(404).json({success:false,message:"Delivery no encontrado."});
    }

    if(current.status!=="PICKED_UP"){
      return res.status(409).json({success:false,message:"Primero debe confirmarse la recogida del producto."});
    }

    await prisma.$transaction(async(tx)=>{
      await tx.shipping.update({
        where:{id:current.id},
        data:{status:"INSPECTION"}
      });

      const timeline=addTimelineEvent(
        current.order.timeline,
        "DELIVERY_INSPECTION_STARTED",
        "El agente de Delivery inició la inspección móvil.",
        employeeId
      );

      await tx.order.update({
        where:{id:current.orderId},
        data:{
          status:"UNDER_INSPECTION",
          deliveryStatus:"INSPECTION",
          timeline
        }
      });
    });

    return res.status(200).json({success:true,message:"Inspección de Delivery iniciada."});
  } catch(error) {
    return res.status(500).json({success:false,message:"No se pudo iniciar la inspección."});
  }
}

async function approveDeliveryInspection(req,res) {
  try {
    const deliveryId=parsePositiveInt(req.params.deliveryId);
    const notes=cleanText(req.body?.notes);

    if(!deliveryId){
      return res.status(400).json({success:false,message:"El identificador de Delivery no es válido."});
    }

    const employeeId=parsePositiveInt(req.user?.id);

    const current=await prisma.shipping.findUnique({
      where:{id:deliveryId},
      include:{order:true}
    });

    if(!current){
      return res.status(404).json({success:false,message:"Delivery no encontrado."});
    }

    if(current.status!=="INSPECTION"){
      return res.status(409).json({success:false,message:"La inspección debe estar iniciada antes de aprobarse."});
    }

    if(notes.length<5){
      return res.status(400).json({
        success:false,
        message:"Agrega una observación breve sobre el resultado de la inspección."
      });
    }

    await prisma.$transaction(async(tx)=>{
      await tx.shipping.update({
        where:{id:current.id},
        data:{status:"INSPECTION_APPROVED",deliveryNotes:notes}
      });

      const timeline=addTimelineEvent(
        current.order.timeline,
        "DELIVERY_INSPECTION_APPROVED",
        "El agente aprobó la inspección móvil. Observación: "+notes,
        employeeId
      );

      await tx.order.update({
        where:{id:current.orderId},
        data:{
          status:"READY_FOR_PICKUP",
          deliveryStatus:"INSPECTION_APPROVED",
          inspectionNotes:notes,
          timeline
        }
      });

      await createNotificationSafe(
        tx,
        current.order.buyerId,
        "DELIVERY_INSPECTION_APPROVED",
        "Producto inspeccionado",
        "El agente de Delivery inspeccionó y aprobó el producto. Ahora continuará hacia tu dirección."
      );
    });

    return res.status(200).json({
      success:true,
      message:"Inspección aprobada. El agente ya puede iniciar el recorrido hacia el comprador."
    });
  } catch(error) {
    return res.status(500).json({success:false,message:"No se pudo aprobar la inspección."});
  }
}

async function startDelivery(
  req,
  res
) {
  try {
    const deliveryId =
      parsePositiveInt(
        req.params.deliveryId
      );

    if (!deliveryId) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de Delivery no es válido."
      });
    }

    const employeeId =
      parsePositiveInt(
        req.user?.id
      );

    const current =
      await prisma.shipping.findUnique({
        where: {
          id: deliveryId
        },
        include: {
          order: true
        }
      });

    if (!current) {
      return res.status(404).json({
        success: false,
        message:
          "Delivery no encontrado."
      });
    }

    if (
      current.status ===
      "DELIVERED"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "El Delivery ya fue completado."
      });
    }

    if (
      current.status !==
      "INSPECTION_APPROVED"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "La inspección debe estar aprobada antes de iniciar el recorrido."
      });
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          await tx.shipping.update({
            where: {
              id: current.id
            },
            data: {
              status:
                "IN_TRANSIT"
            }
          });

          const timeline =
            addTimelineEvent(
              current.order.timeline,
              "DELIVERY_IN_TRANSIT",
              "El producto salió para entrega.",
              employeeId
            );

          await tx.order.update({
            where: {
              id:
                current.orderId
            },
            data: {
              status:
                "OUT_FOR_DELIVERY",
              deliveryStatus:
                "IN_TRANSIT",
              outForDeliveryAt:
                current.order.outForDeliveryAt ||
                new Date(),
              deliveryAgentId:
                employeeId ||
                current.order.deliveryAgentId,
              timeline
            }
          });
        }
      );

    void result;

    const updated =
      await prisma.shipping.findUnique({
        where: {
          id: current.id
        },
        include:
          shippingInclude
      });

    return res.status(200).json({
      success: true,
      message:
        "Delivery iniciado correctamente.",
      data:
        serializeShipping(
          updated
        )
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        "No se pudo iniciar el Delivery."
    });
  }
}

async function confirmDeliveryWithPin(
  req,
  res
) {
  try {
    const deliveryId =
      parsePositiveInt(
        req.params.deliveryId
      );

    const pin =
      cleanText(
        req.body?.pin ||
        req.body?.deliveryPin ||
        req.body?.otpCode
      );

    if (!deliveryId) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de Delivery no es válido."
      });
    }

    if (!/^\d{6}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message:
          "El PIN debe contener 6 números."
      });
    }

    const employeeId =
      parsePositiveInt(
        req.user?.id
      );

    const current =
      await prisma.shipping.findUnique({
        where: {
          id: deliveryId
        },
        include: {
          order: true
        }
      });

    if (!current) {
      return res.status(404).json({
        success: false,
        message:
          "Delivery no encontrado."
      });
    }

    if (
      current.status ===
      "DELIVERED" &&
      current.order
        ?.deliveryPinVerified
    ) {
      return res.status(200).json({
        success: true,
        recovered: true,
        message:
          "La entrega ya había sido confirmada.",
        data:
          serializeShipping(
            await prisma.shipping.findUnique({
              where: {
                id: current.id
              },
              include:
                shippingInclude
            })
          )
      });
    }

    if (
      current.status !==
      "IN_TRANSIT"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "El Delivery debe estar en tránsito antes de confirmar la entrega."
      });
    }

    if (
      current.order.deliveryPin !==
      pin
    ) {
      return res.status(422).json({
        success: false,
        message:
          "El PIN de entrega no es correcto."
      });
    }

    const now =
      new Date();

    await prisma.$transaction(
      async (tx) => {
        await tx.shipping.update({
          where: {
            id:
              current.id
          },
          data: {
            status:
              "DELIVERED",
            deliveredAt:
              now,
            deliveryNotes:
              cleanText(
                req.body?.notes
              ) ||
              current.deliveryNotes
          }
        });

        let timeline =
          addTimelineEvent(
            current.order.timeline,
            "DELIVERY_PIN_VERIFIED",
            "El agente verificó correctamente el PIN de entrega.",
            employeeId
          );

        timeline =
          addTimelineEvent(
            timeline,
            "DELIVERY_CONFIRMED_BY_AGENT",
            "El agente confirmó la entrega. El comprador debe confirmar la recepción.",
            employeeId
          );

        await tx.order.update({
          where: {
            id:
              current.orderId
          },
          data: {
            status:
              "DELIVERED",
            deliveryStatus:
              "DELIVERED",
            deliveredAt:
              current.order.deliveredAt ||
              now,
            deliveryPinVerified:
              true,
            deliveryPinVerifiedAt:
              now,
            deliveryPinVerifiedById:
              employeeId,
            deliveryConfirmedByAgent:
              true,
            deliveryConfirmedByAgentAt:
              now,
            deliveryAgentId:
              employeeId ||
              current.order.deliveryAgentId,
            deliveryNotes:
              cleanText(
                req.body?.notes
              ) ||
              current.order.deliveryNotes,
            timeline
          }
        });

        await createNotificationSafe(
          tx,
          current.order.buyerId,
          "ORDER_DELIVERED",
          "Producto entregado",
          "El agente verificó el PIN. Confirma la recepción desde Mis compras."
        );

        await createNotificationSafe(
          tx,
          current.order.sellerId,
          "ORDER_DELIVERED",
          "Producto entregado",
          "El producto fue entregado. El desembolso demo continúa pendiente de Finanzas."
        );
      },
      {
        maxWait: 20000,
        timeout: 60000
      }
    );

    const updated =
      await prisma.shipping.findUnique({
        where: {
          id:
            current.id
        },
        include:
          shippingInclude
      });

    return res.status(200).json({
      success: true,
      message:
        "Entrega confirmada con PIN correctamente.",
      data:
        serializeShipping(
          updated
        )
    });
  } catch (error) {
    console.error(
      "Error confirmando Delivery:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo confirmar la entrega.",
      error:
        process.env.NODE_ENV ===
        "production"
          ? undefined
          : error.message
    });
  }
}

async function markDeliveryFailed(
  req,
  res
) {
  try {
    const deliveryId =
      parsePositiveInt(
        req.params.deliveryId
      );

    const reason =
      cleanText(
        req.body?.reason
      );

    if (!deliveryId) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de Delivery no es válido."
      });
    }

    if (reason.length < 5) {
      return res.status(400).json({
        success: false,
        message:
          "Debe indicar el motivo del fallo."
      });
    }

    const employeeId =
      parsePositiveInt(
        req.user?.id
      );

    const current =
      await prisma.shipping.findUnique({
        where: {
          id: deliveryId
        },
        include: {
          order: true
        }
      });

    if (!current) {
      return res.status(404).json({
        success: false,
        message:
          "Delivery no encontrado."
      });
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.shipping.update({
          where: {
            id: current.id
          },
          data: {
            status:
              "FAILED",
            deliveryNotes:
              reason
          }
        });

        const timeline =
          addTimelineEvent(
            current.order.timeline,
            "DELIVERY_FAILED",
            reason,
            employeeId
          );

        await tx.order.update({
          where: {
            id:
              current.orderId
          },
          data: {
            deliveryStatus:
              "FAILED",
            deliveryNotes:
              reason,
            timeline
          }
        });
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "Fallo de entrega registrado."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        "No se pudo registrar el fallo de entrega."
    });
  }
}

module.exports = {
  listDeliveries,
  getDelivery,
  getDeliveryStatistics,
  createDeliveryFromOrder,
  pickupProduct,
  startDeliveryInspection,
  approveDeliveryInspection,
  startDelivery,
  confirmDeliveryWithPin,
  markDeliveryFailed
};
