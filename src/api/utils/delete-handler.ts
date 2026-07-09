/**
 * Centralized DELETE error handler.
 * Wraps any DELETE call and surfaces user-friendly errors.
 */
export async function safeDelete<T = void>(
  fn: () => Promise<T>,
  context?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await fn();
    return { success: true };
  } catch (err: any) {
    const status = err?.response?.status;
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.detail ||
      err?.message ||
      'Terjadi kesalahan saat menghapus data';

    console.error(`[DELETE ERROR]${context ? ` [${context}]` : ''} ${status ?? ''} ${msg}`);

    if (status === 404) {
      return { success: false, error: 'Data tidak ditemukan atau sudah dihapus' };
    }
    if (status === 403) {
      return { success: false, error: 'Tidak memiliki izin untuk menghapus data ini' };
    }
    if (status === 409) {
      return { success: false, error: 'Data tidak bisa dihapus karena masih digunakan' };
    }
    return { success: false, error: msg };
  }
}
