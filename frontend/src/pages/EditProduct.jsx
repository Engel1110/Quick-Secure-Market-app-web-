import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import api from "../api/axios";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AiAssistant from "../components/AiAssistant";

const API_ORIGIN = String(
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "");

const MAX_IMAGES = 8;
const MAX_IMAGE_SIZE = 6 * 1024 * 1024;
const MAX_VIDEO_SIZE = 80 * 1024 * 1024;

const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

const CATEGORIES = [
  "Gaming",
  "Tecnología",
  "Celulares",
  "Laptops",
  "Vehículos",
  "Hogar",
  "Moda",
  "Otros"
];

const DEFAULT_FORM = {
  title: "",
  description: "",
  price: "",
  category: "",
  condition: "USED_GOOD",
  quality: "UNKNOWN",
  brand: "",
  model: "",
  serialNumber: "",
  imei: "",
  storageCapacity: "",
  ramMemory: "",
  batteryHealth: "",
  dimensions: "",
  accessoriesIncluded: "",
  vehicleYear: "",
  vehicleVin: "",
  vehicleMileage: "",
  vehicleTransmission: "",
  vehicleFuelType: "",
  clothingSize: "",
  clothingMaterial: "",
  clothingAuthenticityStatus: "NOT_SPECIFIED",
  hasInvoice: false,
  hasOriginalBox: false,
  acceptsPhysicalInspection: false,
  location: "",
  warranty: "",
  deliveryMethod: "",
  specialPriceReason: "NONE",
  specialPriceExplanation: ""
};

const DEFAULT_VISUALS = {
  appearance: "dark",
  accentColor: "#35d0c3",
  density: "comfortable",
  animations: true,
  glassEffect: true,
  reducedMotion: false
};

function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [product, setProduct] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [existingImages, setExistingImages] = useState([]);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [newImagePreviews, setNewImagePreviews] = useState([]);
  const [existingVideo, setExistingVideo] = useState(null);
  const [newVideoFile, setNewVideoFile] = useState(null);
  const [newVideoPreview, setNewVideoPreview] = useState("");
  const [removeExistingVideo, setRemoveExistingVideo] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);
  const [visuals, setVisuals] = useState(readVisualSettings);

  const currentUser = useMemo(() => readCurrentUser(), []);
  const currentUserId = currentUser?._id || currentUser?.id || currentUser?.userId || "";
  const sellerId = product?.seller?._id || product?.seller?.id || product?.seller || "";
  const role = String(currentUser?.role || "").toUpperCase();
  const isOwner = Boolean(currentUserId && sellerId) && String(currentUserId) === String(sellerId);
  const isAdmin = ["ADMIN", "SENIOR_ADMIN", "SUPER_ADMIN"].includes(role) || currentUser?.isAdmin === true;
  const canEdit = isOwner || isAdmin;

  const totalImages = existingImages.length + newImageFiles.length;
  const lightMode = visuals.appearance === "light";
  const accent = normalizeAccent(visuals.accentColor);

  const loadProduct = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(`/products/${id}`);
      const loaded =
        response?.data?.product ||
        response?.data?.data?.product ||
        response?.data?.data ||
        response?.data;

      if (!loaded || typeof loaded !== "object" || Array.isArray(loaded)) {
        throw new Error("El backend no devolvió el producto.");
      }

      setProduct(loaded);
      setForm(productToForm(loaded));

      setExistingImages(
        Array.isArray(loaded.images)
          ? loaded.images
              .map((image) => ({
                original: normalizeRawMedia(image),
                preview: resolveMediaUrl(image)
              }))
              .filter((image) => image.original && image.preview)
          : []
      );

      setExistingVideo(normalizeExistingVideo(loaded.video));
      setRemoveExistingVideo(false);
    } catch (requestError) {
      console.error("Error cargando producto:", requestError);
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "No se pudo cargar el producto."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  useEffect(() => {
    const onSidebar = (event) => {
      const value = event?.detail?.collapsed;
      setSidebarCollapsed(typeof value === "boolean" ? value : readSidebarCollapsed());
    };

    const onSettings = () => setVisuals(readVisualSettings());

    const onStorage = (event) => {
      if (event?.key === "qsm_sidebar_collapsed") {
        setSidebarCollapsed(readSidebarCollapsed());
      }
      if (isVisualSettingsKey(event?.key)) onSettings();
    };

    window.addEventListener("qsm-sidebar-changed", onSidebar);
    window.addEventListener("qsm-settings-changed", onSettings);
    window.addEventListener("qsm-theme-changed", onSettings);
    window.addEventListener("qsm-appearance-changed", onSettings);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("qsm-sidebar-changed", onSidebar);
      window.removeEventListener("qsm-settings-changed", onSettings);
      window.removeEventListener("qsm-theme-changed", onSettings);
      window.removeEventListener("qsm-appearance-changed", onSettings);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    return () => {
      newImagePreviews.forEach(revokeBlobUrl);
      revokeBlobUrl(newVideoPreview);
    };
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value
    }));

    setFieldErrors((current) => ({ ...current, [name]: "" }));
    setError("");
    setSuccess("");
  };

  const validate = () => {
    const errors = {};
    const price = Number(form.price);

    if (form.title.trim().length < 5) errors.title = "El título debe tener al menos 5 caracteres.";
    if (form.description.trim().length < 40) errors.description = "La descripción debe tener al menos 40 caracteres.";
    if (!Number.isFinite(price) || price <= 0) errors.price = "Introduce un precio válido mayor que cero.";
    if (!CATEGORIES.includes(form.category)) errors.category = "Selecciona una categoría válida.";
    if (!form.location.trim()) errors.location = "Indica la ubicación del producto.";
    if (totalImages < 1) errors.images = "El producto debe conservar al menos una imagen.";
    if (totalImages > MAX_IMAGES) errors.images = `No puedes guardar más de ${MAX_IMAGES} imágenes.`;

    if (["Celulares", "Laptops", "Gaming", "Tecnología", "Vehículos"].includes(form.category)) {
      if (!form.brand.trim()) errors.brand = "La marca es obligatoria para esta categoría.";
      if (!form.model.trim()) errors.model = "El modelo es obligatorio para esta categoría.";
    }

    const imei = form.imei.replace(/\s+/g, "");
    if (imei && !/^[0-9]{14,17}$/.test(imei)) errors.imei = "El IMEI debe contener entre 14 y 17 dígitos.";

    if (form.category === "Vehículos") {
      const year = Number(form.vehicleYear);
      const maxYear = new Date().getFullYear() + 1;
      if (!Number.isFinite(year) || year < 1950 || year > maxYear) errors.vehicleYear = "El año no es válido.";
      if (!form.vehicleMileage.trim()) errors.vehicleMileage = "El kilometraje es obligatorio.";
      if (form.vehicleVin && !/^[A-HJ-NPR-Z0-9]{17}$/i.test(form.vehicleVin.trim())) {
        errors.vehicleVin = "El VIN debe contener 17 caracteres válidos.";
      }
    }

    if (form.category === "Moda" && !form.clothingSize.trim()) {
      errors.clothingSize = "La talla es obligatoria para productos de moda.";
    }

    if (
      form.specialPriceReason !== "NONE" &&
      form.specialPriceExplanation.trim().length < 20
    ) {
      errors.specialPriceExplanation = "Explica el motivo con al menos 20 caracteres.";
    }

    setFieldErrors(errors);
    return { valid: Object.keys(errors).length === 0, errors };
  };

  const handleNewImages = (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selected.length) return;

    const remaining = MAX_IMAGES - totalImages;
    if (remaining <= 0) {
      setError(`Ya alcanzaste el máximo de ${MAX_IMAGES} imágenes.`);
      return;
    }

    const signatures = new Set(newImageFiles.map(fileSignature));
    const accepted = [];
    const rejected = [];

    selected.forEach((file) => {
      if (accepted.length >= remaining) {
        rejected.push(`${file.name}: se superó el máximo.`);
        return;
      }

      if (signatures.has(fileSignature(file))) {
        rejected.push(`${file.name}: ya fue agregada.`);
        return;
      }

      const validation = validateImageFile(file);
      if (!validation.valid) {
        rejected.push(validation.message);
        return;
      }

      signatures.add(fileSignature(file));
      accepted.push(file);
    });

    if (accepted.length) {
      setNewImageFiles((current) => [...current, ...accepted]);
      setNewImagePreviews((current) => [
        ...current,
        ...accepted.map((file) => URL.createObjectURL(file))
      ]);
      setFieldErrors((current) => ({ ...current, images: "" }));
      setSuccess(accepted.length === 1 ? "Imagen agregada." : `${accepted.length} imágenes agregadas.`);
    }

    if (rejected.length) setError(rejected.join(" "));
  };

  const removeExistingImage = (index) => {
    if (totalImages <= 1) {
      setError("El producto debe conservar al menos una imagen.");
      return;
    }
    setExistingImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setSuccess("Imagen existente marcada para eliminar.");
  };

  const removeNewImage = (index) => {
    revokeBlobUrl(newImagePreviews[index]);
    setNewImageFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setNewImagePreviews((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const moveExistingImage = (index, direction) => {
    setExistingImages((current) => moveArrayItem(current, index, index + direction));
  };

  const moveNewImage = (index, direction) => {
    setNewImageFiles((current) => moveArrayItem(current, index, index + direction));
    setNewImagePreviews((current) => moveArrayItem(current, index, index + direction));
  };

  const handleNewVideo = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validation = validateVideoFile(file);
    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    revokeBlobUrl(newVideoPreview);
    setNewVideoFile(file);
    setNewVideoPreview(URL.createObjectURL(file));
    setRemoveExistingVideo(false);
    setSuccess("Nuevo video agregado.");
  };

  const removeNewVideo = () => {
    revokeBlobUrl(newVideoPreview);
    setNewVideoFile(null);
    setNewVideoPreview("");
  };

  const removeCurrentVideo = () => {
    setExistingVideo(null);
    setRemoveExistingVideo(true);
    setSuccess("El video actual será eliminado al guardar.");
  };

  const uploadImages = async () => {
    if (!newImageFiles.length) return [];

    setProgress("Subiendo nuevas imágenes...");
    const formData = new FormData();
    newImageFiles.forEach((file) => formData.append("images", file, file.name));

    const response = await api.post("/upload", formData);
    const uploaded = extractUploadedImages(response?.data);

    if (uploaded.length !== newImageFiles.length) {
      throw new Error(`Se subieron ${uploaded.length} de ${newImageFiles.length} imágenes.`);
    }

    return uploaded;
  };

  const uploadVideo = async () => {
    if (!newVideoFile) return null;

    setProgress("Subiendo nuevo video...");
    const formData = new FormData();
    formData.append("video", newVideoFile, newVideoFile.name);

    const response = await api.post("/upload", formData);
    const uploaded = extractUploadedVideo(response?.data);

    if (!uploaded) throw new Error("El backend no devolvió el video subido.");
    return uploaded;
  };

  const buildPayload = ({ uploadedImages, uploadedVideo }) => {
    const images = [
      ...existingImages.map((image) => image.original),
      ...uploadedImages
    ];

    let video = { url: "", thumbnail: "", duration: 0 };

    if (uploadedVideo) {
      video = uploadedVideo;
    } else if (existingVideo && !removeExistingVideo) {
      video = {
        url: existingVideo.originalUrl,
        thumbnail: existingVideo.originalThumbnail,
        duration: Number(existingVideo.duration || 0)
      };
    }

    return {
      title: form.title.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      category: form.category,
      condition: form.condition,
      quality: form.quality,
      brand: form.brand.trim(),
      model: form.model.trim(),
      serialNumber: form.serialNumber.trim(),
      imei: form.imei.replace(/\s+/g, "").trim(),
      storageCapacity: form.storageCapacity.trim(),
      ramMemory: form.ramMemory.trim(),
      batteryHealth: form.batteryHealth.trim(),
      dimensions: form.dimensions.trim(),
      accessoriesIncluded: form.accessoriesIncluded.trim(),
      vehicleDetails: {
        year: form.vehicleYear ? Number(form.vehicleYear) : null,
        vin: form.vehicleVin.trim().toUpperCase(),
        mileage: form.vehicleMileage.trim(),
        transmission: form.vehicleTransmission,
        fuelType: form.vehicleFuelType
      },
      clothingDetails: {
        size: form.clothingSize.trim(),
        material: form.clothingMaterial.trim(),
        authenticityStatus: form.clothingAuthenticityStatus
      },
      evidence: {
        hasInvoice: form.hasInvoice,
        hasOriginalBox: form.hasOriginalBox,
        acceptsPhysicalInspection: form.acceptsPhysicalInspection
      },
      location: form.location.trim(),
      warranty: form.warranty.trim(),
      deliveryMethod: form.deliveryMethod,
      specialPriceReason: form.specialPriceReason,
      specialPriceExplanation: form.specialPriceExplanation.trim(),
      images,
      video
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    setError("");
    setSuccess("");
    setProgress("");

    const validation = validate();
    if (!validation.valid) {
      setError(Object.values(validation.errors)[0] || "Revisa los campos obligatorios.");
      return;
    }

    try {
      setSaving(true);

      const uploadedImages = await uploadImages();
      const uploadedVideo = await uploadVideo();
      const payload = buildPayload({ uploadedImages, uploadedVideo });

      setProgress("Guardando cambios y recalculando QSM Score...");
      const response = await api.put(`/products/${id}`, payload);

      const updated =
        response?.data?.product ||
        response?.data?.data?.product ||
        response?.data?.data ||
        response?.data;

      if (!updated) throw new Error("El backend no devolvió el producto actualizado.");

      newImagePreviews.forEach(revokeBlobUrl);
      revokeBlobUrl(newVideoPreview);
      setSuccess("Producto actualizado correctamente. Redirigiendo...");

      window.setTimeout(() => {
        navigate(`/product/${id}`, { replace: true });
      }, 650);
    } catch (requestError) {
      console.error("Error actualizando producto:", requestError);
      setError(
        requestError?.response?.data?.message ||
          requestError?.response?.data?.error ||
          requestError?.message ||
          "No se pudo actualizar el producto."
      );
    } finally {
      setSaving(false);
      setProgress("");
    }
  };

  if (loading) {
    return (
      <Shell sidebarCollapsed={sidebarCollapsed} visuals={visuals}>
        <EditSkeleton />
      </Shell>
    );
  }

  if (error && !product) {
    return (
      <Shell sidebarCollapsed={sidebarCollapsed} visuals={visuals}>
        <div style={styles.centerCard}>
          <div style={styles.centerIcon}>📦</div>
          <h2>{error}</h2>
          <button type="button" onClick={() => navigate("/marketplace")} style={styles.primaryButton}>
            Volver al Marketplace
          </button>
        </div>
      </Shell>
    );
  }

  if (!canEdit) {
    return (
      <Shell sidebarCollapsed={sidebarCollapsed} visuals={visuals}>
        <div style={styles.centerCard}>
          <div style={styles.centerIcon}>🔒</div>
          <h2>No tienes permiso para editar este producto.</h2>
          <p>Solo el propietario o un administrador puede modificar esta publicación.</p>
          <Link to={`/product/${id}`} style={styles.primaryButton}>Volver al producto</Link>
        </div>
      </Shell>
    );
  }

  const cssVariables = {
    "--edit-accent": accent,
    "--edit-accent-soft": hexToRgba(accent, 0.14),
    "--edit-accent-border": hexToRgba(accent, 0.38),
    "--edit-card": lightMode ? "rgba(255,255,255,.90)" : "rgba(15,23,42,.76)",
    "--edit-text": lightMode ? "#0f172a" : "#f8fafc",
    "--edit-muted": lightMode ? "#64748b" : "#94a3b8",
    "--edit-border": lightMode ? "rgba(15,23,42,.12)" : "rgba(148,163,184,.15)"
  };

  return (
    <div style={{ ...styles.page(lightMode, accent), ...cssVariables }}>
      <style>{buildCss(visuals)}</style>

      <div className="edit-product-layout" style={styles.layout(sidebarCollapsed)}>
        <div className="edit-product-sidebar"><Sidebar /></div>

        <main className="edit-product-main" style={styles.main(visuals)}>
          <Topbar />

          <nav style={styles.breadcrumb}>
            <Link to="/marketplace" style={styles.breadcrumbLink}>Marketplace</Link>
            <span>›</span>
            <Link to={`/product/${id}`} style={styles.breadcrumbLink}>Producto</Link>
            <span>›</span>
            <span>Editar</span>
          </nav>

          <section className="edit-product-header" style={styles.header}>
            <div>
              <p style={styles.eyebrow}>EDICIÓN SEGURA QSM</p>
              <h1 style={styles.title}>
                Editar <span style={styles.gradientText}>publicación</span>
              </h1>
              <p style={styles.subtitle}>
                Actualiza datos y evidencia. QSM recalculará automáticamente el riesgo y la confianza.
              </p>
            </div>

            <div style={styles.headerActions}>
              <Link to={`/product/${id}`} style={styles.outlineButton}>Cancelar</Link>
              <button type="submit" form="edit-product-form" disabled={saving} style={styles.primaryButton}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </section>

          {success && <div style={styles.successBox}>{success}</div>}
          {error && <div style={styles.errorBox}>{error}</div>}
          {progress && <div style={styles.processingBox}>{progress}</div>}

          <form id="edit-product-form" onSubmit={handleSubmit} style={styles.formCard}>
            <SectionHeader eyebrow="INFORMACIÓN PRINCIPAL" title="Datos del producto" description="Mantén la información clara y consistente con las fotografías." />

            <Field label="Título" required error={fieldErrors.title} hint={`${form.title.length}/120`}>
              <input name="title" value={form.title} onChange={handleChange} maxLength={120} disabled={saving} style={styles.input(Boolean(fieldErrors.title))} />
            </Field>

            <Field label="Descripción" required error={fieldErrors.description} hint={`${form.description.length}/2000`}>
              <textarea name="description" value={form.description} onChange={handleChange} maxLength={2000} disabled={saving} style={styles.textarea(Boolean(fieldErrors.description))} />
            </Field>

            <div className="edit-product-two-columns" style={styles.twoColumns}>
              <Field label="Precio RD$" required error={fieldErrors.price}>
                <input name="price" type="number" min="1" step="0.01" value={form.price} onChange={handleChange} disabled={saving} style={styles.input(Boolean(fieldErrors.price))} />
              </Field>

              <Field label="Categoría" required error={fieldErrors.category}>
                <select name="category" value={form.category} onChange={handleChange} disabled={saving} style={styles.input(Boolean(fieldErrors.category))}>
                  <option value="">Seleccionar</option>
                  {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </Field>
            </div>

            <div className="edit-product-two-columns" style={styles.twoColumns}>
              <Field label="Condición">
                <select name="condition" value={form.condition} onChange={handleChange} disabled={saving} style={styles.input(false)}>
                  <option value="NEW">Nuevo</option>
                  <option value="LIKE_NEW">Como nuevo</option>
                  <option value="USED_GOOD">Buen estado</option>
                  <option value="USED_DETAILS">Usado con detalles</option>
                  <option value="FOR_PARTS">Para piezas</option>
                </select>
              </Field>

              <Field label="Calidad">
                <select name="quality" value={form.quality} onChange={handleChange} disabled={saving} style={styles.input(false)}>
                  <option value="UNKNOWN">No especificada</option>
                  <option value="EXCELLENT">Excelente</option>
                  <option value="GOOD">Buena</option>
                  <option value="FAIR">Aceptable</option>
                  <option value="DAMAGED">Dañado</option>
                </select>
              </Field>
            </div>

            <Divider />
            <SectionHeader eyebrow="IDENTIDAD TÉCNICA" title="Marca, modelo e identificadores" description="Estos datos ayudan a detectar duplicados y publicaciones sospechosas." />

            <div className="edit-product-two-columns" style={styles.twoColumns}>
              <Field label="Marca" error={fieldErrors.brand}>
                <input name="brand" value={form.brand} onChange={handleChange} maxLength={80} disabled={saving} style={styles.input(Boolean(fieldErrors.brand))} />
              </Field>
              <Field label="Modelo" error={fieldErrors.model}>
                <input name="model" value={form.model} onChange={handleChange} maxLength={100} disabled={saving} style={styles.input(Boolean(fieldErrors.model))} />
              </Field>
            </div>

            <div className="edit-product-two-columns" style={styles.twoColumns}>
              <Field label="Número de serie">
                <input name="serialNumber" value={form.serialNumber} onChange={handleChange} maxLength={120} disabled={saving} style={styles.input(false)} />
              </Field>
              <Field label="IMEI" error={fieldErrors.imei}>
                <input name="imei" value={form.imei} onChange={handleChange} maxLength={17} disabled={saving} style={styles.input(Boolean(fieldErrors.imei))} />
              </Field>
            </div>

            <div className="edit-product-two-columns" style={styles.twoColumns}>
              <Field label="Almacenamiento">
                <input name="storageCapacity" value={form.storageCapacity} onChange={handleChange} maxLength={80} disabled={saving} placeholder="Ej: 256 GB" style={styles.input(false)} />
              </Field>
              <Field label="Memoria RAM">
                <input name="ramMemory" value={form.ramMemory} onChange={handleChange} maxLength={60} disabled={saving} placeholder="Ej: 16 GB" style={styles.input(false)} />
              </Field>
            </div>

            <div className="edit-product-two-columns" style={styles.twoColumns}>
              <Field label="Estado de batería">
                <input name="batteryHealth" value={form.batteryHealth} onChange={handleChange} maxLength={60} disabled={saving} placeholder="Ej: 89%" style={styles.input(false)} />
              </Field>
              <Field label="Dimensiones">
                <input name="dimensions" value={form.dimensions} onChange={handleChange} maxLength={100} disabled={saving} style={styles.input(false)} />
              </Field>
            </div>

            <Field label="Accesorios incluidos">
              <textarea name="accessoriesIncluded" value={form.accessoriesIncluded} onChange={handleChange} maxLength={300} disabled={saving} style={styles.textareaSmall(false)} />
            </Field>

            {form.category === "Vehículos" && (
              <>
                <Divider />
                <SectionHeader eyebrow="VEHÍCULO" title="Datos del vehículo" description="El VIN y el kilometraje ayudan a validar la identidad del vehículo." />

                <div className="edit-product-two-columns" style={styles.twoColumns}>
                  <Field label="Año" required error={fieldErrors.vehicleYear}>
                    <input name="vehicleYear" type="number" value={form.vehicleYear} onChange={handleChange} disabled={saving} style={styles.input(Boolean(fieldErrors.vehicleYear))} />
                  </Field>
                  <Field label="VIN" error={fieldErrors.vehicleVin}>
                    <input name="vehicleVin" value={form.vehicleVin} onChange={handleChange} maxLength={17} disabled={saving} style={styles.input(Boolean(fieldErrors.vehicleVin))} />
                  </Field>
                </div>

                <div className="edit-product-two-columns" style={styles.twoColumns}>
                  <Field label="Kilometraje" required error={fieldErrors.vehicleMileage}>
                    <input name="vehicleMileage" value={form.vehicleMileage} onChange={handleChange} disabled={saving} placeholder="Ej: 82,000 km" style={styles.input(Boolean(fieldErrors.vehicleMileage))} />
                  </Field>
                  <Field label="Transmisión">
                    <select name="vehicleTransmission" value={form.vehicleTransmission} onChange={handleChange} disabled={saving} style={styles.input(false)}>
                      <option value="">No especificada</option>
                      <option value="AUTOMATIC">Automática</option>
                      <option value="MANUAL">Manual</option>
                      <option value="CVT">CVT</option>
                    </select>
                  </Field>
                </div>

                <Field label="Combustible">
                  <select name="vehicleFuelType" value={form.vehicleFuelType} onChange={handleChange} disabled={saving} style={styles.input(false)}>
                    <option value="">No especificado</option>
                    <option value="GASOLINE">Gasolina</option>
                    <option value="DIESEL">Diésel</option>
                    <option value="HYBRID">Híbrido</option>
                    <option value="ELECTRIC">Eléctrico</option>
                    <option value="LPG">GLP</option>
                  </select>
                </Field>
              </>
            )}

            {form.category === "Moda" && (
              <>
                <Divider />
                <SectionHeader eyebrow="MODA" title="Características de la prenda" description="Indica talla, material y autenticidad." />

                <div className="edit-product-two-columns" style={styles.twoColumns}>
                  <Field label="Talla" required error={fieldErrors.clothingSize}>
                    <input name="clothingSize" value={form.clothingSize} onChange={handleChange} maxLength={30} disabled={saving} style={styles.input(Boolean(fieldErrors.clothingSize))} />
                  </Field>
                  <Field label="Material">
                    <input name="clothingMaterial" value={form.clothingMaterial} onChange={handleChange} maxLength={80} disabled={saving} style={styles.input(false)} />
                  </Field>
                </div>

                <Field label="Autenticidad">
                  <select name="clothingAuthenticityStatus" value={form.clothingAuthenticityStatus} onChange={handleChange} disabled={saving} style={styles.input(false)}>
                    <option value="NOT_SPECIFIED">No especificada</option>
                    <option value="ORIGINAL_NO_INVOICE">Original sin factura</option>
                    <option value="ORIGINAL_WITH_INVOICE">Original con factura</option>
                    <option value="VERIFIED">Verificada</option>
                    <option value="REPLICA">Réplica</option>
                  </select>
                </Field>
              </>
            )}

            <Divider />
            <SectionHeader eyebrow="EVIDENCIA" title="Declaraciones del vendedor" description="Estas declaraciones aumentan la confianza, pero pueden requerir comprobación." />

            <div className="edit-product-evidence-grid" style={styles.evidenceGrid}>
              <CheckboxCard name="hasInvoice" checked={form.hasInvoice} onChange={handleChange} icon="🧾" title="Tiene factura" />
              <CheckboxCard name="hasOriginalBox" checked={form.hasOriginalBox} onChange={handleChange} icon="📦" title="Caja original" />
              <CheckboxCard name="acceptsPhysicalInspection" checked={form.acceptsPhysicalInspection} onChange={handleChange} icon="🔎" title="Acepta inspección" />
            </div>

            <Divider />
            <SectionHeader eyebrow="IMÁGENES" title="Galería del producto" description={`Conserva, elimina, agrega o reordena imágenes. Máximo ${MAX_IMAGES}.`} badge={`${totalImages}/${MAX_IMAGES}`} />

            {fieldErrors.images && <p style={styles.fieldErrorText}>{fieldErrors.images}</p>}

            <div className="edit-product-media-grid" style={styles.mediaGrid}>
              {existingImages.map((image, index) => (
                <MediaCard
                  key={`${image.original}-${index}`}
                  preview={image.preview}
                  label={`Existente ${index + 1}`}
                  isPrimary={index === 0}
                  canMoveLeft={index > 0}
                  canMoveRight={index < existingImages.length - 1}
                  onMoveLeft={() => moveExistingImage(index, -1)}
                  onMoveRight={() => moveExistingImage(index, 1)}
                  onRemove={() => removeExistingImage(index)}
                  disabled={saving}
                />
              ))}

              {newImagePreviews.map((preview, index) => (
                <MediaCard
                  key={`${preview}-${index}`}
                  preview={preview}
                  label={`Nueva ${index + 1}`}
                  isNew
                  canMoveLeft={index > 0}
                  canMoveRight={index < newImagePreviews.length - 1}
                  onMoveLeft={() => moveNewImage(index, -1)}
                  onMoveRight={() => moveNewImage(index, 1)}
                  onRemove={() => removeNewImage(index)}
                  disabled={saving}
                />
              ))}
            </div>

            <label style={styles.uploadBox}>
              <input type="file" multiple accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleNewImages} disabled={saving || totalImages >= MAX_IMAGES} style={{ display: "none" }} />
              <span style={styles.uploadIcon}>📷</span>
              <strong>Agregar imágenes</strong>
              <p>JPG, PNG o WEBP. Máximo 6 MB por imagen.</p>
            </label>

            <Divider />
            <SectionHeader eyebrow="VIDEO" title="Video del producto" description="Puedes conservar, eliminar o reemplazar el video actual." badge="Opcional" />

            {newVideoPreview ? (
              <VideoCard url={newVideoPreview} label="Nuevo video" onRemove={removeNewVideo} disabled={saving} />
            ) : existingVideo ? (
              <VideoCard url={existingVideo.previewUrl} label="Video actual" onRemove={removeCurrentVideo} disabled={saving} />
            ) : (
              <label style={styles.uploadBox}>
                <input type="file" accept=".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime" onChange={handleNewVideo} disabled={saving} style={{ display: "none" }} />
                <span style={styles.uploadIcon}>🎥</span>
                <strong>Agregar video</strong>
                <p>MP4, WEBM o MOV. Máximo 80 MB.</p>
              </label>
            )}

            {!newVideoPreview && existingVideo && (
              <label style={styles.replaceVideoLabel}>
                Reemplazar video
                <input type="file" accept=".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime" onChange={handleNewVideo} disabled={saving} style={{ display: "none" }} />
              </label>
            )}

            <Divider />
            <SectionHeader eyebrow="ENTREGA" title="Ubicación, garantía y entrega" description="Mantén estos datos actualizados para evitar confusiones." />

            <div className="edit-product-two-columns" style={styles.twoColumns}>
              <Field label="Ubicación" required error={fieldErrors.location}>
                <input name="location" value={form.location} onChange={handleChange} maxLength={160} disabled={saving} style={styles.input(Boolean(fieldErrors.location))} />
              </Field>
              <Field label="Garantía">
                <input name="warranty" value={form.warranty} onChange={handleChange} maxLength={160} disabled={saving} style={styles.input(false)} />
              </Field>
            </div>

            <Field label="Método de entrega">
              <select name="deliveryMethod" value={form.deliveryMethod} onChange={handleChange} disabled={saving} style={styles.input(false)}>
                <option value="">No especificado</option>
                <option value="QSM_WAREHOUSE">Almacén seguro QSM</option>
                <option value="QSM_VERIFIED_DELIVERY">Delivery verificado QSM</option>
                <option value="DIRECT_DELIVERY">Entrega directa acordada</option>
              </select>
            </Field>

            <Divider />
            <SectionHeader eyebrow="PRECIO ESPECIAL" title="Motivo del precio" description="Explica precios inusuales o por debajo del mercado." />

            <Field label="Motivo">
              <select name="specialPriceReason" value={form.specialPriceReason} onChange={handleChange} disabled={saving} style={styles.input(false)}>
                <option value="NONE">No aplica</option>
                <option value="URGENT_MONEY">Venta urgente</option>
                <option value="MOVING">Mudanza</option>
                <option value="BOUGHT_ANOTHER">Compré otro producto</option>
                <option value="NO_LONGER_USED">Ya no lo utilizo</option>
                <option value="MEDICAL_EXPENSE">Gasto médico</option>
                <option value="BUSINESS_LIQUIDATION">Liquidación</option>
                <option value="OTHER">Otro</option>
              </select>
            </Field>

            <Field label="Explicación" error={fieldErrors.specialPriceExplanation} hint={`${form.specialPriceExplanation.length}/500`}>
              <textarea name="specialPriceExplanation" value={form.specialPriceExplanation} onChange={handleChange} maxLength={500} disabled={saving} style={styles.textareaSmall(Boolean(fieldErrors.specialPriceExplanation))} />
            </Field>

            <div style={styles.bottomActions}>
              <Link to={`/product/${id}`} style={styles.outlineButton}>Cancelar</Link>
              <button type="submit" disabled={saving} style={styles.primaryButton}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </main>
      </div>

      <AiAssistant pageContext="edit-product" />
    </div>
  );
}

function Shell({ sidebarCollapsed, visuals, children }) {
  const light = visuals.appearance === "light";
  const accent = normalizeAccent(visuals.accentColor);

  return (
    <div style={styles.page(light, accent)}>
      <style>{buildCss(visuals)}</style>
      <div className="edit-product-layout" style={styles.layout(sidebarCollapsed)}>
        <div className="edit-product-sidebar"><Sidebar /></div>
        <main className="edit-product-main" style={styles.main(visuals)}>
          <Topbar />
          {children}
        </main>
      </div>
    </div>
  );
}

function Field({ label, children, required = false, error = "", hint = "" }) {
  return (
    <div style={styles.fieldWrapper}>
      <div style={styles.fieldHeader}>
        <label style={styles.fieldLabel}>
          {label}{required && <span style={styles.requiredStar}>*</span>}
        </label>
        {hint && <span style={styles.fieldHint}>{hint}</span>}
      </div>
      {children}
      {error && <span style={styles.fieldError}>{error}</span>}
    </div>
  );
}

function SectionHeader({ eyebrow, title, description, badge = "" }) {
  return (
    <div style={styles.sectionHeader}>
      <div>
        <p style={styles.eyebrow}>{eyebrow}</p>
        <h2 style={styles.sectionTitle}>{title}</h2>
        <p style={styles.sectionDescription}>{description}</p>
      </div>
      {badge && <span style={styles.sectionBadge}>{badge}</span>}
    </div>
  );
}

function Divider() {
  return <div style={styles.divider} />;
}

function CheckboxCard({ name, checked, onChange, icon, title }) {
  return (
    <label style={styles.checkboxCard(checked)}>
      <input type="checkbox" name={name} checked={checked} onChange={onChange} style={{ display: "none" }} />
      <span style={styles.checkboxIcon}>{icon}</span>
      <div><strong>{title}</strong><p>{checked ? "Sí" : "No"}</p></div>
    </label>
  );
}

function MediaCard({
  preview,
  label,
  isPrimary = false,
  isNew = false,
  canMoveLeft,
  canMoveRight,
  onMoveLeft,
  onMoveRight,
  onRemove,
  disabled
}) {
  return (
    <article style={styles.mediaCard(isPrimary)}>
      <div style={styles.mediaImageWrap}>
        <img src={preview} alt={label} style={styles.mediaImage} onError={handleImageError} />
        {isPrimary && <span style={styles.primaryImageBadge}>Principal</span>}
        {isNew && <span style={styles.newImageBadge}>Nueva</span>}
      </div>
      <div style={styles.mediaCardBody}>
        <strong>{label}</strong>
        <div style={styles.mediaControls}>
          <button type="button" onClick={onMoveLeft} disabled={disabled || !canMoveLeft} style={styles.smallButton}>←</button>
          <button type="button" onClick={onMoveRight} disabled={disabled || !canMoveRight} style={styles.smallButton}>→</button>
          <button type="button" onClick={onRemove} disabled={disabled} style={styles.deleteSmallButton}>×</button>
        </div>
      </div>
    </article>
  );
}

function VideoCard({ url, label, onRemove, disabled }) {
  return (
    <div style={styles.videoCard}>
      <video src={url} controls playsInline style={styles.videoPlayer} />
      <div style={styles.videoFooter}>
        <strong>{label}</strong>
        <button type="button" onClick={onRemove} disabled={disabled} style={styles.deleteSmallButton}>Eliminar</button>
      </div>
    </div>
  );
}

function EditSkeleton() {
  return (
    <div style={styles.skeletonWrap}>
      <div style={styles.skeletonHeader} />
      <div style={styles.skeletonCard} />
    </div>
  );
}

function productToForm(product) {
  return {
    title: product?.title || "",
    description: product?.description || "",
    price: product?.price ?? "",
    category: product?.category || "",
    condition: product?.condition || "USED_GOOD",
    quality: product?.quality || "UNKNOWN",
    brand: product?.brand || "",
    model: product?.model || "",
    serialNumber: product?.serialNumber || "",
    imei: product?.imei || "",
    storageCapacity: product?.storageCapacity || "",
    ramMemory: product?.ramMemory || "",
    batteryHealth: product?.batteryHealth || "",
    dimensions: product?.dimensions || "",
    accessoriesIncluded: product?.accessoriesIncluded || "",
    vehicleYear: product?.vehicleDetails?.year || "",
    vehicleVin: product?.vehicleDetails?.vin || "",
    vehicleMileage: product?.vehicleDetails?.mileage || "",
    vehicleTransmission: product?.vehicleDetails?.transmission || "",
    vehicleFuelType: product?.vehicleDetails?.fuelType || "",
    clothingSize: product?.clothingDetails?.size || "",
    clothingMaterial: product?.clothingDetails?.material || "",
    clothingAuthenticityStatus: product?.clothingDetails?.authenticityStatus || "NOT_SPECIFIED",
    hasInvoice: Boolean(product?.evidence?.hasInvoice),
    hasOriginalBox: Boolean(product?.evidence?.hasOriginalBox),
    acceptsPhysicalInspection: Boolean(product?.evidence?.acceptsPhysicalInspection),
    location: product?.location || "",
    warranty: product?.warranty || "",
    deliveryMethod: product?.deliveryMethod || "",
    specialPriceReason: product?.specialPriceReason || "NONE",
    specialPriceExplanation: product?.specialPriceExplanation || ""
  };
}

function readCurrentUser() {
  return (
    safeJson(localStorage.getItem("qsm_user")) ||
    safeJson(sessionStorage.getItem("qsm_user")) ||
    safeJson(localStorage.getItem("user")) ||
    safeJson(sessionStorage.getItem("user")) ||
    {}
  );
}

function safeJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function storageValue(key) {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

function readSidebarCollapsed() {
  return storageValue("qsm_sidebar_collapsed") === "true";
}

function readVisualSettings() {
  const settings =
    safeJson(storageValue("qsm_settings")) ||
    safeJson(storageValue("qsm_user_settings")) ||
    safeJson(storageValue("qsm_preferences")) ||
    {};

  const editProduct = settings?.editProduct || settings?.visual?.editProduct || {};
  const appearance =
    editProduct?.appearance ||
    settings?.appearance ||
    storageValue("qsm_appearance") ||
    storageValue("qsm_theme") ||
    DEFAULT_VISUALS.appearance;

  const accentColor =
    editProduct?.accentColor ||
    settings?.accentColor ||
    settings?.accent ||
    storageValue("qsm_accent_color") ||
    DEFAULT_VISUALS.accentColor;

  return {
    ...DEFAULT_VISUALS,
    ...editProduct,
    appearance: String(appearance).toLowerCase().includes("light") ? "light" : "dark",
    accentColor: normalizeAccent(accentColor),
    density: ["compact", "comfortable", "spacious"].includes(editProduct?.density || settings?.density)
      ? editProduct?.density || settings?.density
      : "comfortable",
    animations: editProduct?.animations !== false && settings?.animations !== false,
    glassEffect: editProduct?.glassEffect !== false && settings?.glassEffect !== false,
    reducedMotion: Boolean(editProduct?.reducedMotion ?? settings?.reducedMotion ?? false)
  };
}

function isVisualSettingsKey(key) {
  return [
    "qsm_settings",
    "qsm_user_settings",
    "qsm_preferences",
    "qsm_appearance",
    "qsm_theme",
    "qsm_accent_color"
  ].includes(String(key || ""));
}

function normalizeAccent(value) {
  const map = {
    cyan: "#35d0c3",
    purple: "#8b5cf6",
    pink: "#ec4899",
    blue: "#38bdf8",
    green: "#22c55e",
    orange: "#f59e0b"
  };

  const candidate = String(value || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(candidate)) return candidate;
  return map[candidate.toLowerCase()] || "#35d0c3";
}

function normalizeRawMedia(value) {
  if (!value) return "";
  if (typeof value === "string") return cleanMediaPath(value);
  return cleanMediaPath(value?.url || value?.path || value?.fileUrl || value?.secure_url || "");
}

function cleanMediaPath(value) {
  return String(value || "").trim().replaceAll("&#x2F;", "/").replaceAll("&amp;", "&");
}

function resolveMediaUrl(value) {
  const source = normalizeRawMedia(value);
  if (!source) return "";
  if (source.startsWith("data:") || source.startsWith("blob:") || /^https?:\/\//i.test(source)) return source;
  return source.startsWith("/") ? `${API_ORIGIN}${source}` : `${API_ORIGIN}/${source}`;
}

function normalizeExistingVideo(video) {
  if (!video) return null;
  const originalUrl = normalizeRawMedia(typeof video === "string" ? video : video?.url);
  if (!originalUrl) return null;

  const originalThumbnail = normalizeRawMedia(video?.thumbnail);
  return {
    originalUrl,
    originalThumbnail,
    previewUrl: resolveMediaUrl(originalUrl),
    duration: Number(video?.duration || 0)
  };
}

function validateImageFile(file) {
  if (!file) return { valid: false, message: "No se recibió una imagen válida." };
  if (!IMAGE_TYPES.includes(file.type)) return { valid: false, message: `${file.name}: solo JPG, PNG o WEBP.` };
  if (file.size > MAX_IMAGE_SIZE) return { valid: false, message: `${file.name}: supera ${formatFileSize(MAX_IMAGE_SIZE)}.` };
  return { valid: true, message: "" };
}

function validateVideoFile(file) {
  if (!file) return { valid: false, message: "No se recibió un video válido." };
  if (!VIDEO_TYPES.includes(file.type)) return { valid: false, message: "El video debe ser MP4, WEBM o MOV." };
  if (file.size > MAX_VIDEO_SIZE) return { valid: false, message: `El video supera ${formatFileSize(MAX_VIDEO_SIZE)}.` };
  return { valid: true, message: "" };
}

function fileSignature(file) {
  return [file?.name, file?.size, file?.lastModified, file?.type].join("-");
}

function moveArrayItem(values, from, to) {
  if (!Array.isArray(values) || from < 0 || to < 0 || from >= values.length || to >= values.length) return values;
  const copy = [...values];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

function extractUploadedImages(data) {
  const source = data?.data && typeof data.data === "object" ? data.data : data;
  const raw = source?.images || source?.uploadedImages || source?.files || [];
  return Array.isArray(raw) ? raw.map(normalizeRawMedia).filter(Boolean) : [];
}

function extractUploadedVideo(data) {
  const source = data?.data && typeof data.data === "object" ? data.data : data;
  const raw = source?.video || source?.uploadedVideo || null;
  if (!raw) return null;

  if (typeof raw === "string") {
    return { url: normalizeRawMedia(raw), thumbnail: "", duration: 0 };
  }

  const url = normalizeRawMedia(raw?.url || raw?.path || raw?.fileUrl);
  if (!url) return null;

  return {
    url,
    thumbnail: normalizeRawMedia(raw?.thumbnail),
    duration: Number(raw?.duration || 0)
  };
}

function revokeBlobUrl(url) {
  if (typeof url === "string" && url.startsWith("blob:")) {
    try { URL.revokeObjectURL(url); } catch { /* noop */ }
  }
}

function handleImageError(event) {
  event.currentTarget.onerror = null;
  event.currentTarget.src = fallbackImage();
}

function fallbackImage() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="52%" stop-color="#164e63"/>
        <stop offset="100%" stop-color="#312e81"/>
      </linearGradient></defs>
      <rect width="1000" height="700" fill="url(#g)"/>
      <text x="500" y="330" text-anchor="middle" font-size="120">📦</text>
      <text x="500" y="470" text-anchor="middle" fill="#e2e8f0" font-family="Arial" font-size="44" font-weight="700">Producto QSM</text>
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function formatFileSize(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = Number(bytes);
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unit]}`;
}

function hexToRgba(hex, alpha) {
  const value = Number.parseInt(String(hex).replace("#", ""), 16);
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
}

function buildCss(settings) {
  const noMotion = settings?.reducedMotion || settings?.animations === false;

  return `
    * { box-sizing: border-box; }
    html, body, #root { width:100%; min-height:100%; margin:0; padding:0; overflow-x:hidden; font-family:Inter,"Plus Jakarta Sans",system-ui,sans-serif; }
    input, textarea, select, button, a, label { font-family:inherit; }
    select { color-scheme:${settings?.appearance === "light" ? "light" : "dark"}; }
    button, a, label { transition:${noMotion ? "none" : "transform .24s ease, border-color .24s ease, background .24s ease, opacity .24s ease"}; }
    button:hover, a:hover, label:hover { transform:${noMotion ? "none" : "translateY(-2px)"}; }
    button:disabled, input:disabled, textarea:disabled, select:disabled { opacity:.58; cursor:not-allowed; transform:none !important; }

    @media (max-width:1240px) {
      .edit-product-layout { grid-template-columns:1fr !important; }
      .edit-product-sidebar { display:none !important; }
    }

    @media (max-width:850px) {
      .edit-product-main { padding:18px !important; }
      .edit-product-header { grid-template-columns:1fr !important; }
      .edit-product-two-columns,
      .edit-product-evidence-grid,
      .edit-product-media-grid { grid-template-columns:1fr !important; }
    }
  `;
}

const styles = {
  page: (light, accent) => ({
    width: "100%",
    minHeight: "100vh",
    color: "var(--edit-text)",
    background: light
      ? `radial-gradient(circle at 88% 5%, ${hexToRgba(accent, .12)}, transparent 30%), radial-gradient(circle at 12% 10%, rgba(56,189,248,.10), transparent 26%), #edf4ff`
      : `radial-gradient(circle at 88% 5%, rgba(139,92,246,.16), transparent 31%), radial-gradient(circle at 12% 10%, ${hexToRgba(accent, .10)}, transparent 27%), #020617`
  }),

  layout: (collapsed) => ({
    width: "100%",
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: collapsed ? "96px minmax(0, 1fr)" : "300px minmax(0, 1fr)",
    overflowX: "hidden",
    transition: "grid-template-columns .28s ease"
  }),

  main: (settings) => ({
    minWidth: 0,
    minHeight: "100vh",
    padding: settings?.density === "compact"
      ? "20px 24px 48px"
      : settings?.density === "spacious"
      ? "34px 44px 70px"
      : "26px 34px 58px",
    overflowX: "hidden"
  }),

  breadcrumb: { display:"flex", alignItems:"center", flexWrap:"wrap", gap:"8px", marginTop:"18px", color:"var(--edit-muted)", fontSize:"10px" },
  breadcrumbLink: { color:"var(--edit-accent)", textDecoration:"none", fontWeight:"850" },
  header: { display:"grid", gridTemplateColumns:"minmax(0, 1fr) auto", alignItems:"end", gap:"20px", margin:"18px 0 24px" },
  headerActions: { display:"flex", justifyContent:"flex-end", flexWrap:"wrap", gap:"10px" },
  eyebrow: { margin:0, color:"var(--edit-accent)", fontSize:"9px", fontWeight:"950", letterSpacing:"3px", textTransform:"uppercase" },
  title: { margin:"8px 0", color:"var(--edit-text)", fontSize:"clamp(36px, 3.5vw, 58px)", lineHeight:"1.04", letterSpacing:"-1.8px" },
  gradientText: { background:"linear-gradient(90deg, var(--edit-accent), #38bdf8, #8b5cf6)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" },
  subtitle: { maxWidth:"760px", margin:0, color:"var(--edit-muted)", fontSize:"13px", lineHeight:"22px" },
  formCard: { minWidth:0, maxWidth:"1180px", padding:"25px", borderRadius:"28px", border:"1px solid var(--edit-border)", background:"var(--edit-card)", boxShadow:"0 26px 85px rgba(0,0,0,.20)", backdropFilter:"blur(16px)" },
  sectionHeader: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"16px", marginBottom:"18px" },
  sectionTitle: { margin:"5px 0", fontSize:"21px" },
  sectionDescription: { maxWidth:"700px", margin:0, color:"var(--edit-muted)", fontSize:"10px", lineHeight:"17px" },
  sectionBadge: { minHeight:"29px", display:"inline-flex", alignItems:"center", padding:"6px 9px", borderRadius:"999px", border:"1px solid var(--edit-accent-border)", background:"var(--edit-accent-soft)", color:"var(--edit-accent)", fontSize:"8px", fontWeight:"950" },
  fieldWrapper: { display:"grid", gap:"8px", marginBottom:"14px" },
  fieldHeader: { display:"flex", alignItems:"center", justifyContent:"space-between", gap:"12px" },
  fieldLabel: { color:"var(--edit-text)", fontSize:"10px", fontWeight:"900" },
  requiredStar: { marginLeft:"3px", color:"#f87171" },
  fieldHint: { color:"var(--edit-muted)", fontSize:"8px" },
  fieldError: { color:"#fca5a5", fontSize:"8px" },
  fieldErrorText: { color:"#fca5a5", fontSize:"9px" },
  input: (hasError) => ({ width:"100%", minHeight:"51px", padding:"0 14px", borderRadius:"14px", border:hasError ? "1px solid rgba(248,113,113,.56)" : "1px solid var(--edit-border)", outline:"none", background:"rgba(2,6,23,.22)", color:"var(--edit-text)", fontSize:"11px" }),
  textarea: (hasError) => ({ ...styles.input(hasError), minHeight:"145px", padding:"13px 14px", resize:"vertical", lineHeight:"20px" }),
  textareaSmall: (hasError) => ({ ...styles.textarea(hasError), minHeight:"100px" }),
  twoColumns: { display:"grid", gridTemplateColumns:"repeat(2, minmax(0, 1fr))", gap:"14px" },
  divider: { height:"1px", margin:"27px 0", background:"linear-gradient(90deg, transparent, var(--edit-border), transparent)" },
  evidenceGrid: { display:"grid", gridTemplateColumns:"repeat(3, minmax(0, 1fr))", gap:"11px" },
  checkboxCard: (checked) => ({ minHeight:"88px", display:"grid", gridTemplateColumns:"46px minmax(0, 1fr)", alignItems:"center", gap:"11px", padding:"14px", borderRadius:"16px", border:checked ? "1px solid var(--edit-accent-border)" : "1px solid var(--edit-border)", background:checked ? "var(--edit-accent-soft)" : "rgba(2,6,23,.18)", cursor:"pointer" }),
  checkboxIcon: { width:"46px", height:"46px", display:"flex", alignItems:"center", justifyContent:"center", borderRadius:"14px", background:"rgba(255,255,255,.07)", fontSize:"20px" },
  mediaGrid: { display:"grid", gridTemplateColumns:"repeat(3, minmax(0, 1fr))", gap:"12px", marginBottom:"14px" },
  mediaCard: (primary) => ({ minWidth:0, overflow:"hidden", borderRadius:"18px", border:primary ? "1px solid var(--edit-accent-border)" : "1px solid var(--edit-border)", background:"rgba(2,6,23,.20)" }),
  mediaImageWrap: { position:"relative", height:"180px", overflow:"hidden", background:"#020617" },
  mediaImage: { width:"100%", height:"100%", display:"block", objectFit:"cover" },
  primaryImageBadge: { position:"absolute", left:"10px", bottom:"10px", padding:"5px 8px", borderRadius:"999px", background:"rgba(2,6,23,.76)", color:"var(--edit-accent)", fontSize:"8px", fontWeight:"950" },
  newImageBadge: { position:"absolute", top:"10px", left:"10px", padding:"5px 8px", borderRadius:"999px", background:"rgba(139,92,246,.72)", color:"#fff", fontSize:"8px", fontWeight:"950" },
  mediaCardBody: { display:"grid", gap:"9px", padding:"11px" },
  mediaControls: { display:"grid", gridTemplateColumns:"repeat(3, minmax(0, 1fr))", gap:"6px" },
  smallButton: { minHeight:"34px", borderRadius:"10px", border:"1px solid var(--edit-border)", background:"rgba(15,23,42,.60)", color:"var(--edit-text)", cursor:"pointer" },
  deleteSmallButton: { minHeight:"34px", borderRadius:"10px", border:"1px solid rgba(239,68,68,.28)", background:"rgba(127,29,29,.18)", color:"#fca5a5", cursor:"pointer" },
  uploadBox: { minHeight:"140px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"20px", borderRadius:"20px", border:"1px dashed var(--edit-accent-border)", background:"linear-gradient(135deg, var(--edit-accent-soft), rgba(139,92,246,.08))", color:"var(--edit-muted)", textAlign:"center", cursor:"pointer" },
  uploadIcon: { fontSize:"35px" },
  videoCard: { overflow:"hidden", borderRadius:"19px", border:"1px solid var(--edit-border)", background:"rgba(2,6,23,.20)" },
  videoPlayer: { width:"100%", maxHeight:"380px", display:"block", background:"#020617" },
  videoFooter: { display:"flex", alignItems:"center", justifyContent:"space-between", gap:"12px", padding:"12px" },
  replaceVideoLabel: { minHeight:"40px", display:"inline-flex", alignItems:"center", justifyContent:"center", marginTop:"10px", padding:"9px 13px", borderRadius:"12px", border:"1px solid var(--edit-accent-border)", background:"var(--edit-accent-soft)", color:"var(--edit-accent)", fontSize:"9px", fontWeight:"900", cursor:"pointer" },
  bottomActions: { display:"flex", justifyContent:"flex-end", flexWrap:"wrap", gap:"10px", marginTop:"24px" },
  primaryButton: { minHeight:"47px", display:"inline-flex", alignItems:"center", justifyContent:"center", padding:"11px 17px", border:"none", borderRadius:"13px", background:"linear-gradient(135deg, var(--edit-accent, #35d0c3), #38bdf8, #8b5cf6)", color:"#fff", textDecoration:"none", fontSize:"10px", fontWeight:"950", cursor:"pointer" },
  outlineButton: { minHeight:"47px", display:"inline-flex", alignItems:"center", justifyContent:"center", padding:"11px 17px", borderRadius:"13px", border:"1px solid var(--edit-border)", background:"var(--edit-card)", color:"var(--edit-text)", textDecoration:"none", fontSize:"10px", fontWeight:"900", cursor:"pointer" },
  successBox: { marginBottom:"15px", padding:"13px 16px", borderRadius:"14px", border:"1px solid rgba(34,197,94,.32)", background:"rgba(34,197,94,.13)", color:"#bbf7d0", fontSize:"10px" },
  errorBox: { marginBottom:"15px", padding:"13px 16px", borderRadius:"14px", border:"1px solid rgba(248,113,113,.30)", background:"rgba(127,29,29,.20)", color:"#fecaca", fontSize:"10px" },
  processingBox: { marginBottom:"15px", padding:"13px 16px", borderRadius:"14px", border:"1px solid rgba(56,189,248,.30)", background:"rgba(14,116,144,.14)", color:"#bae6fd", fontSize:"10px" },
  centerCard: { minHeight:"75vh", display:"grid", justifyItems:"center", alignContent:"center", gap:"10px", padding:"28px", textAlign:"center" },
  centerIcon: { fontSize:"58px" },
  skeletonWrap: { marginTop:"24px" },
  skeletonHeader: { width:"58%", height:"58px", marginBottom:"22px", borderRadius:"18px", background:"rgba(148,163,184,.12)" },
  skeletonCard: { maxWidth:"1180px", minHeight:"720px", borderRadius:"28px", background:"rgba(148,163,184,.08)" }
};

export default EditProduct;
