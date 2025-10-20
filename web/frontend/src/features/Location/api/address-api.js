import axios from "@/lib/axios";

export const createAddress = async (data) => {
  // data: { address_line1, address_line2, city, country, latitude, longitude }
  return axios.post("/addresses", data);
};
