const doctorService = require("../services/Doctor.service");

const getDoctors = async (req, res, next) => {
  try {
    const { search = "", specialty = "All", page = 1, limit = 9 } = req.query;

    const result = await doctorService.getDoctors({
      search,
      specialty,
      page: Number(page),
      limit: Number(limit),
    });

    res.status(200).json({
      success: true,
      message: "Doctors fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getDoctorById = async (req, res, next) => {
  try {
    const doctor = await doctorService.getDoctorById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Doctor fetched successfully",
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
};

const createDoctor = async (req, res, next) => {
  try {
    const doctor = await doctorService.createDoctor(req.body);

    res.status(201).json({
      success: true,
      message: "Doctor created successfully",
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
};

const updateDoctor = async (req, res, next) => {
  try {
    const doctor = await doctorService.updateDoctor(req.params.id, req.body);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Doctor updated successfully",
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
};

const deleteDoctor = async (req, res, next) => {
  try {
    const doctor = await doctorService.deleteDoctor(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Doctor removed successfully",
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
};

const getSpecialties = async (req, res, next) => {
  try {
    const specialties = await doctorService.getSpecialties();

    res.status(200).json({
      success: true,
      data: specialties,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  getSpecialties,
};
