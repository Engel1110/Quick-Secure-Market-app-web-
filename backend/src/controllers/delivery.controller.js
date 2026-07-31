const deliveryService = require("../services/delivery.service");

/*
|--------------------------------------------------------------------------
| Dashboard
|--------------------------------------------------------------------------
*/

const listDeliveries = async (req, res) => {
    try {

        const data = await deliveryService.listDeliveries({
            ...req.query
        });

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

const getDelivery = async (req, res) => {
    try {

        const data = await deliveryService.getDelivery(
            req.params.deliveryId
        );

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

const getDeliveryStatistics = async (req, res) => {
    try {

        const data =
            await deliveryService.getDeliveryStatistics();

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

const getDeliveryTimeline = async (req, res) => {
    try {

        const data =
            await deliveryService.getDeliveryTimeline(
                req.params.deliveryId
            );

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

/*
|--------------------------------------------------------------------------
| Delivery
|--------------------------------------------------------------------------
*/

const createDelivery = async (req, res) => {
    try {

        const data =
            await deliveryService.createDelivery({

                ...req.body,

                employeeId: req.user.id

            });

        return res.status(201).json({

            success: true,

            message:
                "Delivery created successfully.",

            data

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};

const updateDelivery = async (req, res) => {
    try {

        const data =
            await deliveryService.updateDelivery({

                deliveryId:
                    req.params.deliveryId,

                employeeId:
                    req.user.id,

                ...req.body

            });

        return res.status(200).json({

            success: true,

            message:
                "Delivery updated successfully.",

            data

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};

const cancelDelivery = async (req, res) => {
    try {

        const data =
            await deliveryService.cancelDelivery({

                deliveryId:
                    req.params.deliveryId,

                employeeId:
                    req.user.id,

                ...req.body

            });

        return res.status(200).json({

            success: true,

            message:
                "Delivery cancelled successfully.",

            data

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};

const deleteDelivery = async (req, res) => {
    try {

        await deliveryService.deleteDelivery({

            deliveryId:
                req.params.deliveryId,

            employeeId:
                req.user.id

        });

        return res.status(200).json({

            success: true,

            message:
                "Delivery deleted successfully."

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {

    // Dashboard
    listDeliveries,
    getDelivery,
    getDeliveryStatistics,
    getDeliveryTimeline,

    // Delivery
    createDelivery,
    updateDelivery,
    cancelDelivery,
    deleteDelivery

};
/*
|--------------------------------------------------------------------------
| Conductores
|--------------------------------------------------------------------------
*/

const assignDriver = async (req, res) => {
    try {
        const data = await deliveryService.assignDriver({
            deliveryId: req.params.deliveryId,
            employeeId: req.user.id,
            ...req.body
        });

        return res.status(200).json({
            success: true,
            message: "Driver assigned successfully.",
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const changeDriver = async (req, res) => {
    try {
        const data = await deliveryService.changeDriver({
            deliveryId: req.params.deliveryId,
            employeeId: req.user.id,
            ...req.body
        });

        return res.status(200).json({
            success: true,
            message: "Driver changed successfully.",
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const removeDriver = async (req, res) => {
    try {
        const data = await deliveryService.removeDriver({
            deliveryId: req.params.deliveryId,
            employeeId: req.user.id,
            ...req.body
        });

        return res.status(200).json({
            success: true,
            message: "Driver removed successfully.",
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/*
|--------------------------------------------------------------------------
| Vehículos
|--------------------------------------------------------------------------
*/

const assignVehicle = async (req, res) => {
    try {
        const data = await deliveryService.assignVehicle({
            deliveryId: req.params.deliveryId,
            employeeId: req.user.id,
            ...req.body
        });

        return res.status(200).json({
            success: true,
            message: "Vehicle assigned successfully.",
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const changeVehicle = async (req, res) => {
    try {
        const data = await deliveryService.changeVehicle({
            deliveryId: req.params.deliveryId,
            employeeId: req.user.id,
            ...req.body
        });

        return res.status(200).json({
            success: true,
            message: "Vehicle changed successfully.",
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const removeVehicle = async (req, res) => {
    try {
        const data = await deliveryService.removeVehicle({
            deliveryId: req.params.deliveryId,
            employeeId: req.user.id,
            ...req.body
        });

        return res.status(200).json({
            success: true,
            message: "Vehicle removed successfully.",
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
/*
|--------------------------------------------------------------------------
| Rutas
|--------------------------------------------------------------------------
*/

const assignRoute = async (req, res) => {
    try {

        const data = await deliveryService.assignRoute({

            deliveryId: req.params.deliveryId,

            employeeId: req.user.id,

            ...req.body

        });

        return res.status(200).json({

            success: true,

            message: "Route assigned successfully.",

            data

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};

const changeRoute = async (req, res) => {
    try {

        const data = await deliveryService.changeRoute({

            deliveryId: req.params.deliveryId,

            employeeId: req.user.id,

            ...req.body

        });

        return res.status(200).json({

            success: true,

            message: "Route updated successfully.",

            data

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};

const removeRoute = async (req, res) => {
    try {

        const data = await deliveryService.removeRoute({

            deliveryId: req.params.deliveryId,

            employeeId: req.user.id

        });

        return res.status(200).json({

            success: true,

            message: "Route removed successfully.",

            data

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};

/*
|--------------------------------------------------------------------------
| Tracking
|--------------------------------------------------------------------------
*/

const startDelivery = async (req, res) => {
    try {

        const data = await deliveryService.startDelivery({

            deliveryId: req.params.deliveryId,

            employeeId: req.user.id

        });

        return res.status(200).json({

            success: true,

            message: "Delivery started successfully.",

            data

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};

const updateLocation = async (req, res) => {
    try {

        const data = await deliveryService.updateLocation({

            deliveryId: req.params.deliveryId,

            employeeId: req.user.id,

            ...req.body

        });

        return res.status(200).json({

            success: true,

            message: "Location updated successfully.",

            data

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};

const finishDelivery = async (req, res) => {
    try {

        const data = await deliveryService.finishDelivery({

            deliveryId: req.params.deliveryId,

            employeeId: req.user.id,

            ...req.body

        });

        return res.status(200).json({

            success: true,

            message: "Delivery completed successfully.",

            data

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};

const getTrackingHistory = async (req, res) => {
    try {

        const data =
            await deliveryService.getTrackingHistory(

                req.params.deliveryId

            );

        return res.status(200).json({

            success: true,

            data

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};
/*
|--------------------------------------------------------------------------
| OTP
|--------------------------------------------------------------------------
*/

const generateOtp = async (req, res) => {
    try {
        const data = await deliveryService.generateOtp({
            deliveryId: req.params.deliveryId,
            employeeId: req.user.id
        });

        return res.status(200).json({
            success: true,
            message: "OTP generated successfully.",
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const verifyOtp = async (req, res) => {
    try {
        const data = await deliveryService.verifyOtp({
            deliveryId: req.params.deliveryId,
            employeeId: req.user.id,
            ...req.body
        });

        return res.status(200).json({
            success: true,
            message: "OTP verified successfully.",
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const resendOtp = async (req, res) => {
    try {
        const data = await deliveryService.resendOtp({
            deliveryId: req.params.deliveryId,
            employeeId: req.user.id
        });

        return res.status(200).json({
            success: true,
            message: "OTP resent successfully.",
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/*
|--------------------------------------------------------------------------
| Intentos de entrega
|--------------------------------------------------------------------------
*/

const createDeliveryAttempt = async (req, res) => {
    try {
        const data =
            await deliveryService.createDeliveryAttempt({
                deliveryId: req.params.deliveryId,
                employeeId: req.user.id,
                ...req.body
            });

        return res.status(201).json({
            success: true,
            message:
                "Delivery attempt registered successfully.",
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const listDeliveryAttempts = async (req, res) => {
    try {
        const data =
            await deliveryService.listDeliveryAttempts(
                req.params.deliveryId
            );

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const rescheduleDelivery = async (req, res) => {
    try {
        const data =
            await deliveryService.rescheduleDelivery({
                deliveryId: req.params.deliveryId,
                employeeId: req.user.id,
                ...req.body
            });

        return res.status(200).json({
            success: true,
            message:
                "Delivery rescheduled successfully.",
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
/*
|--------------------------------------------------------------------------
| Confirmación de entrega
|--------------------------------------------------------------------------
*/

const confirmDelivery = async (req, res) => {
    try {

        const data =
            await deliveryService.confirmDelivery({

                deliveryId: req.params.deliveryId,

                employeeId: req.user.id,

                ...req.body

            });

        return res.status(200).json({

            success: true,

            message:
                "Delivery confirmed successfully.",

            data

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};

const failDelivery = async (req, res) => {
    try {

        const data =
            await deliveryService.failDelivery({

                deliveryId: req.params.deliveryId,

                employeeId: req.user.id,

                ...req.body

            });

        return res.status(200).json({

            success: true,

            message:
                "Delivery marked as failed.",

            data

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};

/*
|--------------------------------------------------------------------------
| Retorno al almacén
|--------------------------------------------------------------------------
*/

const startReturn = async (req, res) => {
    try {

        const data =
            await deliveryService.startReturn({

                deliveryId: req.params.deliveryId,

                employeeId: req.user.id,

                ...req.body

            });

        return res.status(200).json({

            success: true,

            message:
                "Return process started successfully.",

            data

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};

const confirmWarehouseReturn = async (req, res) => {
    try {

        const data =
            await deliveryService.confirmWarehouseReturn({

                deliveryId: req.params.deliveryId,

                employeeId: req.user.id,

                ...req.body

            });

        return res.status(200).json({

            success: true,

            message:
                "Package returned to warehouse successfully.",

            data

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};

/*
|--------------------------------------------------------------------------
| Tracking público
|--------------------------------------------------------------------------
*/

const publicTracking = async (req, res) => {
    try {

        const data =
            await deliveryService.publicTracking(

                req.params.trackingNumber

            );

        return res.status(200).json({

            success: true,

            data

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};
/*
|--------------------------------------------------------------------------
| Confirmación de entrega
|--------------------------------------------------------------------------
*/

const confirmDelivery = async (req, res) => {
    try {

        const data =
            await deliveryService.confirmDelivery({

                deliveryId: req.params.deliveryId,

                employeeId: req.user.id,

                ...req.body

            });

        return res.status(200).json({

            success: true,

            message:
                "Delivery confirmed successfully.",

            data

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};

const failDelivery = async (req, res) => {
    try {

        const data =
            await deliveryService.failDelivery({

                deliveryId: req.params.deliveryId,

                employeeId: req.user.id,

                ...req.body

            });

        return res.status(200).json({

            success: true,

            message:
                "Delivery marked as failed.",

            data

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};

/*
|--------------------------------------------------------------------------
| Retorno al almacén
|--------------------------------------------------------------------------
*/

const startReturn = async (req, res) => {
    try {

        const data =
            await deliveryService.startReturn({

                deliveryId: req.params.deliveryId,

                employeeId: req.user.id,

                ...req.body

            });

        return res.status(200).json({

            success: true,

            message:
                "Return process started successfully.",

            data

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};

const confirmWarehouseReturn = async (req, res) => {
    try {

        const data =
            await deliveryService.confirmWarehouseReturn({

                deliveryId: req.params.deliveryId,

                employeeId: req.user.id,

                ...req.body

            });

        return res.status(200).json({

            success: true,

            message:
                "Package returned to warehouse successfully.",

            data

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};

/*
|--------------------------------------------------------------------------
| Tracking público
|--------------------------------------------------------------------------
*/

const publicTracking = async (req, res) => {
    try {

        const data =
            await deliveryService.publicTracking(

                req.params.trackingNumber

            );

        return res.status(200).json({

            success: true,

            data

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};
/*
|--------------------------------------------------------------------------
| Evidencias
|--------------------------------------------------------------------------
*/

const uploadEvidence = async (req, res) => {
    try {
        const files = Array.isArray(req.files)
            ? req.files
            : [];

        const data =
            await deliveryService.uploadEvidence({
                deliveryId: req.params.deliveryId,
                employeeId: req.user.id,
                files,
                ...req.body
            });

        return res.status(201).json({
            success: true,
            message:
                "Delivery evidence uploaded successfully.",
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const listEvidence = async (req, res) => {
    try {
        const data =
            await deliveryService.listEvidence(
                req.params.deliveryId
            );

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getEvidence = async (req, res) => {
    try {
        const data =
            await deliveryService.getEvidence(
                req.params.evidenceId
            );

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const updateEvidence = async (req, res) => {
    try {
        const data =
            await deliveryService.updateEvidence({
                evidenceId: req.params.evidenceId,
                employeeId: req.user.id,
                ...req.body
            });

        return res.status(200).json({
            success: true,
            message:
                "Delivery evidence updated successfully.",
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const deleteEvidence = async (req, res) => {
    try {
        const data =
            await deliveryService.deleteEvidence({
                evidenceId: req.params.evidenceId,
                employeeId: req.user.id
            });

        return res.status(200).json({
            success: true,
            message:
                "Delivery evidence deleted successfully.",
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const setPrimaryEvidence = async (req, res) => {
    try {
        const data =
            await deliveryService.setPrimaryEvidence({
                evidenceId: req.params.evidenceId,
                employeeId: req.user.id
            });

        return res.status(200).json({
            success: true,
            message:
                "Primary delivery evidence updated successfully.",
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
/*
|--------------------------------------------------------------------------
| Incidentes
|--------------------------------------------------------------------------
*/

const createIncident = async (req, res) => {
    try {

        const data =
            await deliveryService.createIncident({

                deliveryId: req.params.deliveryId,

                employeeId: req.user.id,

                ...req.body

            });

        return res.status(201).json({

            success: true,

            message:
                "Delivery incident created successfully.",

            data

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};

const listIncidents = async (req, res) => {
    try {

        const data =
            await deliveryService.listIncidents(

                req.params.deliveryId

            );

        return res.status(200).json({

            success: true,

            data

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};

const resolveIncident = async (req, res) => {
    try {

        const data =
            await deliveryService.resolveIncident({

                incidentId: req.params.incidentId,

                employeeId: req.user.id,

                ...req.body

            });

        return res.status(200).json({

            success: true,

            message:
                "Delivery incident resolved successfully.",

            data

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};

/*
|--------------------------------------------------------------------------
| Notas internas
|--------------------------------------------------------------------------
*/

const addInternalNote = async (req, res) => {
    try {

        const data =
            await deliveryService.addInternalNote({

                deliveryId: req.params.deliveryId,

                employeeId: req.user.id,

                ...req.body

            });

        return res.status(201).json({

            success: true,

            message:
                "Internal note added successfully.",

            data

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};

const getInternalNotes = async (req, res) => {
    try {

        const data =
            await deliveryService.getInternalNotes(

                req.params.deliveryId

            );

        return res.status(200).json({

            success: true,

            data

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};

const updateInternalNote = async (req, res) => {
    try {

        const data =
            await deliveryService.updateInternalNote({

                noteId: req.params.noteId,

                employeeId: req.user.id,

                ...req.body

            });

        return res.status(200).json({

            success: true,

            message:
                "Internal note updated successfully.",

            data

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};

const deleteInternalNote = async (req, res) => {
    try {

        const data =
            await deliveryService.deleteInternalNote({

                noteId: req.params.noteId,

                employeeId: req.user.id

            });

        return res.status(200).json({

            success: true,

            message:
                "Internal note deleted successfully.",

            data

        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};
/*
|--------------------------------------------------------------------------
| Auditoría
|--------------------------------------------------------------------------
*/

const getAuditHistory = async (req, res) => {
    try {
        const data =
            await deliveryService.getAuditHistory(
                req.params.deliveryId
            );

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getDriverActivity = async (req, res) => {
    try {
        const data =
            await deliveryService.getDriverActivity({
                driverId: req.params.driverId,
                ...req.query
            });

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getVehicleActivity = async (req, res) => {
    try {
        const data =
            await deliveryService.getVehicleActivity({
                vehicleId: req.params.vehicleId,
                ...req.query
            });

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getRecentActivity = async (req, res) => {
    try {
        const data =
            await deliveryService.getRecentActivity(
                req.query.limit
            );

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/*
|--------------------------------------------------------------------------
| KPIs y reportes
|--------------------------------------------------------------------------
*/

const getDeliveryKpis = async (req, res) => {
    try {
        const data =
            await deliveryService.getDeliveryKpis({
                ...req.query
            });

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const generateDeliveryReport = async (req, res) => {
    try {
        const data =
            await deliveryService.generateDeliveryReport({
                employeeId: req.user.id,
                ...req.body
            });

        return res.status(200).json({
            success: true,
            message:
                "Delivery report generated successfully.",
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const exportDeliveryReport = async (req, res) => {
    try {
        const data =
            await deliveryService.exportDeliveryReport({
                employeeId: req.user.id,
                ...req.body
            });

        return res.status(200).json({
            success: true,
            message:
                "Delivery report exported successfully.",
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/*
|--------------------------------------------------------------------------
| Herramientas operativas
|--------------------------------------------------------------------------
*/

const scanDeliveryQr = async (req, res) => {
    try {
        const data =
            await deliveryService.scanDeliveryQr({
                employeeId: req.user.id,
                ...req.body
            });

        return res.status(200).json({
            success: true,
            message:
                "Delivery QR scanned successfully.",
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const generateDeliveryLabel = async (req, res) => {
    try {
        const data =
            await deliveryService.generateDeliveryLabel({
                deliveryId: req.params.deliveryId,
                employeeId: req.user.id,
                ...req.body
            });

        return res.status(200).json({
            success: true,
            message:
                "Delivery label generated successfully.",
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {

    // Dashboard
    listDeliveries,
    getDelivery,
    getDeliveryStatistics,
    getDeliveryTimeline,

    // Delivery
    createDelivery,
    updateDelivery,
    cancelDelivery,
    deleteDelivery,

    // Conductores
    assignDriver,
    changeDriver,
    removeDriver,

    // Vehículos
    assignVehicle,
    changeVehicle,
    removeVehicle,

    // Rutas
    assignRoute,
    changeRoute,
    removeRoute,

    // Tracking
    startDelivery,
    updateLocation,
    finishDelivery,
    getTrackingHistory,

    // OTP
    generateOtp,
    verifyOtp,
    resendOtp,

    // Intentos
    createDeliveryAttempt,
    listDeliveryAttempts,
    rescheduleDelivery,

    // Confirmación
    confirmDelivery,
    failDelivery,

    // Retorno
    startReturn,
    confirmWarehouseReturn,

    // Tracking público
    publicTracking,

    // Evidencias
    uploadEvidence,
    listEvidence,
    getEvidence,
    updateEvidence,
    deleteEvidence,
    setPrimaryEvidence,

    // Incidentes
    createIncident,
    listIncidents,
    resolveIncident,

    // Notas internas
    addInternalNote,
    getInternalNotes,
    updateInternalNote,
    deleteInternalNote,

    // Auditoría
    getAuditHistory,
    getDriverActivity,
    getVehicleActivity,
    getRecentActivity,

    // KPIs y reportes
    getDeliveryKpis,
    generateDeliveryReport,
    exportDeliveryReport,

    // Herramientas
    scanDeliveryQr,
    generateDeliveryLabel

};