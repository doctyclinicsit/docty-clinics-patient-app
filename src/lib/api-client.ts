export interface IOperationOptions {
  filter?: string;
  orderBy?: string[];
  top?: number;
  skip?: number;
}

export interface ApiResult<T> {
  success: boolean;
  data: T;
  error?: unknown;
}

const DATA_SOURCE_ENDPOINTS: Record<string, string> = {
  Appointment: 'appointments',
  Doctor: 'doctors',
  HealthPackage: 'health-packages',
  HealthPlan: 'health-plans',
  Location: 'locations',
  Service: 'services',
};

function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
}

function buildUrl(dataSourceName: string, id?: string, options?: IOperationOptions) {
  const endpoint = DATA_SOURCE_ENDPOINTS[dataSourceName] ?? dataSourceName;
  const baseUrl = getApiBaseUrl();
  const apiRoot = baseUrl || `${window.location.origin}/api`;
  const url = new URL(`${apiRoot}/${endpoint}${id ? `/${id}` : ''}`);

  if (options?.filter) {
    url.searchParams.set('filter', options.filter);
  }
  if (options?.orderBy?.length) {
    url.searchParams.set('orderBy', options.orderBy.join(','));
  }
  if (typeof options?.top === 'number') {
    url.searchParams.set('top', String(options.top));
  }
  if (typeof options?.skip === 'number') {
    url.searchParams.set('skip', String(options.skip));
  }

  return url.toString();
}

async function request<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      ...init,
    });

    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? await response.json() : null;

    if (!response.ok) {
      return {
        success: false,
        data: undefined as T,
        error: body?.message || body?.error || response.statusText,
      };
    }

    return {
      success: true,
      data: (body?.data ?? body?.items ?? body ?? null) as T,
    };
  } catch (error) {
    return {
      success: false,
      data: undefined as T,
      error,
    };
  }
}

export function getClient() {
  return {
    createRecordAsync<TRecord>(dataSourceName: string, record: TRecord) {
      return request<TRecord>(buildUrl(dataSourceName), {
        method: 'POST',
        body: JSON.stringify(record),
      });
    },

    updateRecordAsync<TRecord>(
      dataSourceName: string,
      id: string,
      changedFields: Partial<TRecord>
    ) {
      return request<TRecord>(buildUrl(dataSourceName, id), {
        method: 'PATCH',
        body: JSON.stringify(changedFields),
      });
    },

    deleteRecordAsync(dataSourceName: string, id: string) {
      return request<void>(buildUrl(dataSourceName, id), {
        method: 'DELETE',
      });
    },

    retrieveRecordAsync<TRecord>(dataSourceName: string, id: string) {
      return request<TRecord>(buildUrl(dataSourceName, id));
    },

    retrieveMultipleRecordsAsync<TRecord>(
      dataSourceName: string,
      options?: IOperationOptions
    ) {
      return request<TRecord[]>(buildUrl(dataSourceName, undefined, options));
    },
  };
}

export function initialize() {
  if (!getApiBaseUrl()) {
    console.info('VITE_API_BASE_URL is not set; API calls will use same-origin /api routes.');
  }
}
