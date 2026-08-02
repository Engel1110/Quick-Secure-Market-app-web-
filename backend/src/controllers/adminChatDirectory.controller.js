"use strict";

const prisma = require("../utils/prisma");

const normalize = (value) =>
  String(value || "").trim();

const normalizeUpper = (value) =>
  normalize(value).toUpperCase();

const isInternalUser = (user) =>
  normalizeUpper(user?.accountType) !== "CUSTOMER" ||
  normalizeUpper(user?.role) !== "USER" ||
  normalizeUpper(user?.department) !== "CUSTOMER" ||
  normalize(user?.employeeCode) !== "";

const serializeUser = (user) => {
  const internal = isInternalUser(user);

  return {
    id: user.id,
    _id: String(user.id),
    userId: user.id,
    prismaId: user.id,
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    name: [user.firstName, user.lastName]
      .filter(Boolean)
      .join(" ")
      .trim(),
    email: user.email || "",
    role: user.role || "USER",
    accountType: user.accountType || "CUSTOMER",
    department: user.department || "CUSTOMER",
    departments: Array.isArray(user.departments)
      ? user.departments
      : [],
    employeeCode: user.employeeCode || "",
    status: user.status || "PENDING",
    isVerified: Boolean(user.isVerified),
    profilePhoto: user.profilePhoto || "",
    destinationType: internal
      ? "INTERNAL"
      : "CUSTOMER"
  };
};

async function searchChatDirectory(req, res) {
  try {
    const requester = req.prismaUser;

    if (!requester || !isInternalUser(requester)) {
      return res.status(403).json({
        success: false,
        message:
          "El directorio administrativo es exclusivo para personal interno."
      });
    }

    const type = normalizeUpper(
      req.query.type || "CUSTOMER"
    );

    const q = normalize(req.query.q).slice(
      0,
      100
    );

    const department = normalizeUpper(
      req.query.department
    );

    const requestedLimit = Number(
      req.query.limit || 25
    );

    const limit = Math.min(
      Math.max(
        Number.isFinite(requestedLimit)
          ? Math.floor(requestedLimit)
          : 25,
        1
      ),
      50
    );

    if (!["CUSTOMER", "INTERNAL"].includes(type)) {
      return res.status(400).json({
        success: false,
        message:
          "Tipo de destinatario no válido."
      });
    }

    const internalFilter = {
      OR: [
        {
          accountType: {
            not: "CUSTOMER"
          }
        },
        {
          role: {
            not: "USER"
          }
        },
        {
          department: {
            not: "CUSTOMER"
          }
        },
        {
          employeeCode: {
            not: ""
          }
        }
      ]
    };

    const conditions = [
      type === "INTERNAL"
        ? internalFilter
        : {
            accountType: "CUSTOMER",
            role: "USER",
            department: "CUSTOMER"
          }
    ];

    if (
      type === "INTERNAL" &&
      department
    ) {
      conditions.push({
        OR: [
          {
            department
          },
          {
            departments: {
              has: department
            }
          }
        ]
      });
    }

    if (q) {
      conditions.push({
        OR: [
          {
            firstName: {
              contains: q,
              mode: "insensitive"
            }
          },
          {
            lastName: {
              contains: q,
              mode: "insensitive"
            }
          },
          {
            email: {
              contains: q,
              mode: "insensitive"
            }
          },
          {
            employeeCode: {
              contains: q,
              mode: "insensitive"
            }
          }
        ]
      });
    }

    const users = await prisma.user.findMany({
      where: {
        id: {
          not: requester.id
        },
        status: {
          in: [
            "ACTIVE",
            "PENDING"
          ]
        },
        AND: conditions
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        accountType: true,
        department: true,
        departments: true,
        employeeCode: true,
        status: true,
        isVerified: true,
        profilePhoto: true
      },
      orderBy: [
        {
          department: "asc"
        },
        {
          firstName: "asc"
        },
        {
          lastName: "asc"
        }
      ],
      take: limit
    });

    return res.status(200).json({
      success: true,
      type,
      count: users.length,
      users: users.map(
        serializeUser
      )
    });
  } catch (error) {
    console.error(
      "Error consultando directorio del Chat Admin:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo consultar el directorio del Chat Admin."
    });
  }
}

module.exports = {
  searchChatDirectory
};
