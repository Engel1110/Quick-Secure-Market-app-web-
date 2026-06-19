const photoHash = imageUrl ? generatePhotoHash(imageUrl) : null;

if (photoHash) {
  const existingImage = await prisma.product.findUnique({
    where: { photoHash }
  });

  if (existingImage) {
    await prisma.fraudAlert.create({
      data: {
        productId: existingImage.id,
        type: "REUSED_IMAGE",
        level: "HIGH",
        message: "Intento de reutilizar una imagen ya registrada en QSM."
      }
    });

    return res.status(400).json({
      message: "Esta imagen ya fue utilizada en otro producto. Debes tomar una foto real nueva desde la app."
    });
  }
}

const product = await prisma.product.create({
  data: {
    title,
    description,
    price: Number(price),
    category,
    condition,
    imageUrl,
    qsmCode: generateQsmCode(category, title),
    photoHash,
    verificationStatus: "PENDING",
    cameraRequired: true,
    certified: false,
    status: "PENDING",
    sellerId: req.user.id
  },
  include: {
    seller: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isVerified: true,
        trustScore: true,
        status: true
      }
    }
  }
});