export type BalanceCurrency = {
  currency: string;
  totalBalance: number;
  grantedBalance: number;
  toppedUpBalance: number;
};

export type BalanceSnapshot = {
  provider: string;
  fetchedAt: string;
  isAvailable: boolean;
  balances: BalanceCurrency[];
};

export class BalanceKeyMissingError extends Error {
  constructor(providerName: string, envVar: string) {
    super(`${providerName}: missing API key (set ${envVar})`);
    this.name = "BalanceKeyMissingError";
  }
}

export class BalanceFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BalanceFetchError";
  }
}

export interface BalanceProvider {
  readonly id: string;
  readonly name: string;
  fetchBalance(): Promise<BalanceSnapshot>;
}

interface DeepSeekBalanceInfo {
  currency: string;
  total_balance: string;
  granted_balance: string;
  topped_up_balance: string;
}

interface DeepSeekBalanceResponse {
  is_available: boolean;
  balance_infos: DeepSeekBalanceInfo[];
}

const DEEPSEEK_API_URL = "https://api.deepseek.com/user/balance";
const DEEPSEEK_API_KEY_ENV = "DEEPSEEK_API_KEY";

export class DeepSeekProvider implements BalanceProvider {
  readonly id = "deepseek";
  readonly name = "DeepSeek";

  async fetchBalance(): Promise<BalanceSnapshot> {
    const apiKey = process.env[DEEPSEEK_API_KEY_ENV];
    if (!apiKey) {
      throw new BalanceKeyMissingError(this.name, DEEPSEEK_API_KEY_ENV);
    }

    let response: Response;
    try {
      response = await fetch(DEEPSEEK_API_URL, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      });
    } catch {
      throw new BalanceFetchError(`${this.name}: network error fetching balance`);
    }

    if (!response.ok) {
      throw new BalanceFetchError(`${this.name}: balance request failed (HTTP ${response.status})`);
    }

    let data: DeepSeekBalanceResponse;
    try {
      data = (await response.json()) as DeepSeekBalanceResponse;
    } catch {
      throw new BalanceFetchError(`${this.name}: invalid response from balance API`);
    }

    const balances = Array.isArray(data.balance_infos)
      ? data.balance_infos.map((info) => ({
          currency: info.currency,
          totalBalance: Number(info.total_balance),
          grantedBalance: Number(info.granted_balance),
          toppedUpBalance: Number(info.topped_up_balance),
        }))
      : [];

    return {
      provider: this.id,
      fetchedAt: new Date().toISOString(),
      isAvailable: data.is_available,
      balances,
    };
  }
}

export function getProviders(): BalanceProvider[] {
  return [new DeepSeekProvider()];
}
