import api from "./axios";

export const getProducts = async () => {
  const response = await api.get("/products");
  return response.data;
};

export const createProduct = async (productData) => {
  const response = await api.post("/products", productData);
  return response.data;
};

export const improveProductEvidence = async (productId, data) => {
  const response = await api.put(`/products/${productId}/evidence`, data);
  return response.data;
};