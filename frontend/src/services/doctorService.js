const API_URL = import.meta.env.VITE_API_URL;

export const getDoctors = async ({
  search = "",
  specialty = "All",
  page = 1,
  limit = 9,
} = {}) => {
  const params = new URLSearchParams({
    search,
    specialty,
    page: String(page),
    limit: String(limit),
  });

  const response = await fetch(
    `${API_URL}/api/v1/doctors?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch doctors");
  }

  return response.json();
};

export const getDoctorById = async (id) => {
  const response = await fetch(`${API_URL}/api/v1/doctors/${id}`);

  if (!response.ok) {
    throw new Error("Failed to fetch doctor");
  }

  return response.json();
};

export const getSpecialties = async () => {
  const response = await fetch(`${API_URL}/api/v1/doctors/specialties`);

  if (!response.ok) {
    throw new Error("Failed to fetch specialties");
  }

  return response.json();
};
