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
