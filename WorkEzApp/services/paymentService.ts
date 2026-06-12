import { safeStorage as AsyncStorage } from './storage';
import { apiRequest, STORAGE_KEY_ACCESS } from './api';

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface CreatePaymentResponse {
  paymentId: string;
  paymentUrl: string | null;
  pixCode: string | null;
  pixQrCode: string | null;
  status: string;
  expiresAt: string | null;
  amount: number;
}

export interface PaymentStatusResponse {
  paymentId: string;
  status: 'Pending' | 'Paid' | 'Expired' | 'Cancelled' | 'Failed' | 'Refunded';
  amount: number;
  paidAmount: number | null;
  paidAt: string | null;
  paymentUrl: string | null;
  pixCode: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem(STORAGE_KEY_ACCESS);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Serviço ────────────────────────────────────────────────────────────────

export const paymentService = {
  /**
   * Creates a new PIX billing for the given appointment via AbacatePay.
   * Returns the PIX payment URL and QR code to display to the customer.
   */
  async createPayment(appointmentId: string): Promise<{
    data: CreatePaymentResponse | null;
    error: string | null;
  }> {
    const headers = await authHeaders();
    const result = await apiRequest<CreatePaymentResponse>(
      `/api/payments/${appointmentId}`,
      { method: 'POST', headers }
    );
    return { data: result.data, error: result.error };
  },

  /**
   * Polls the payment status for a given payment ID.
   * Calls /api/payments/{id}/status which also syncs with AbacatePay if needed.
   */
  async getPaymentStatus(paymentId: string): Promise<{
    data: PaymentStatusResponse | null;
    error: string | null;
  }> {
    const headers = await authHeaders();
    const result = await apiRequest<PaymentStatusResponse>(
      `/api/payments/${paymentId}/status`,
      { headers }
    );
    return { data: result.data, error: result.error };
  },

  /**
   * Gets the payment record for a specific appointment.
   */
  async getPaymentByAppointment(appointmentId: string): Promise<{
    data: PaymentStatusResponse | null;
    error: string | null;
  }> {
    const headers = await authHeaders();
    const result = await apiRequest<PaymentStatusResponse>(
      `/api/payments/by-appointment/${appointmentId}`,
      { headers }
    );
    return { data: result.data, error: result.error };
  },

  /** Returns true if the status is a terminal paid state. */
  isPaid(status: string): boolean {
    return status === 'Paid';
  },

  /** Returns true if the payment is still pending (not yet confirmed). */
  isPending(status: string): boolean {
    return status === 'Pending';
  },
};
