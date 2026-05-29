export type ApiHealth = {
  ok: boolean;
  service: string;
  version: string;
};

export type Material = {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  category_id: number | null;
  category_name: string | null;
  unit_id: number;
  unit_code: string;
  unit_name: string;
};

export type MaterialPricingInput = {
  id: number;
  material_id: number;
  supplier_name: string | null;
  purchase_unit_id: number;
  purchase_unit_code: string;
  calculation_unit_id: number;
  calculation_unit_code: string;
  purchase_price_minor: number;
  markup_percent: string;
  delivery_price_minor: number;
  work_amount: string;
  currency_code: string;
  source_note: string | null;
  valid_from: string;
  valid_to: string | null;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:3001";

export async function getApiHealth(): Promise<ApiHealth> {
  const response = await fetch(`${apiBaseUrl}/health`);

  if (!response.ok) {
    throw new Error(`API health check failed: ${response.status}`);
  }

  return response.json() as Promise<ApiHealth>;
}

export async function getMaterials(): Promise<Material[]> {
  const response = await fetch(`${apiBaseUrl}/materials`);

  if (!response.ok) {
    throw new Error(`Materials request failed: ${response.status}`);
  }

  return response.json() as Promise<Material[]>;
}

export async function getMaterialPricingInputs(
  materialId: number
): Promise<MaterialPricingInput[]> {
  const response = await fetch(`${apiBaseUrl}/materials/${materialId}/pricing-inputs`);

  if (!response.ok) {
    throw new Error(`Material pricing inputs request failed: ${response.status}`);
  }

  return response.json() as Promise<MaterialPricingInput[]>;
}
