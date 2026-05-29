import { useQuery } from '@tanstack/react-query';
import ky from 'ky';

interface DolarApiResponse {
  fuente: string;
  promedio: number;
}

interface ExchangeRates {
  oficial: number;
  paralelo: number;
}

const FALLBACK_RATES: ExchangeRates = { oficial: 53.05, paralelo: 57.1 };

async function fetchExchangeRates(): Promise<ExchangeRates> {
  const data = await ky
    .get('https://ve.dolarapi.com/v1/dolares', {
      timeout: 10000,
    })
    .json<DolarApiResponse[]>();

  if (!Array.isArray(data)) return FALLBACK_RATES;

  const ofi = data.find((d) => d.fuente === 'oficial')?.promedio || FALLBACK_RATES.oficial;
  const par = data.find((d) => d.fuente === 'paralelo')?.promedio || FALLBACK_RATES.paralelo;
  return { oficial: ofi, paralelo: par };
}

function getStoredRates(): ExchangeRates {
  try {
    const raw = localStorage.getItem('duo_pos_exchange_rates');
    if (raw) return JSON.parse(raw);
  } catch {}
  return FALLBACK_RATES;
}

export function useExchangeRates() {
  return useQuery({
    queryKey: ['exchangeRates'],
    queryFn: fetchExchangeRates,
    staleTime: 60000,
    refetchInterval: 120000,
    initialData: getStoredRates,
    meta: { persist: true },
  });
}
