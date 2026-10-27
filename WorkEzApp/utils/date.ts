/**
 * Utilitário centralizado para formatação de datas e horários em pt-BR.
 */

export interface FormatDateOptions {
  showTime?: boolean;
  relative?: boolean;
}

/**
 * Formata data e horário para o padrão brasileiro (ex: "26/10/2026 às 18:15" ou "Hoje às 18:15").
 */
export function formatDateTime(
  dateInput?: string | Date | null,
  options?: FormatDateOptions
): string {
  if (!dateInput) return '-';
  const showTime = options?.showTime ?? true;
  const relative = options?.relative ?? false;

  // Se já estiver no formato amigável brasileiro com "às"
  if (typeof dateInput === 'string' && dateInput.includes('às')) {
    return dateInput.trim();
  }

  // Se for string no formato "DD/MM/YYYY HH:mm" ou "DD-MM-YYYY HH:mm"
  if (typeof dateInput === 'string') {
    const ddmmyyyyMatch = dateInput.trim().match(/^(\d{2})[-/](\d{2})[-/](\d{4})(?:\s+(\d{2}):(\d{2}))?/);
    if (ddmmyyyyMatch) {
      const [, day, month, year, hours, minutes] = ddmmyyyyMatch;
      if (hours && minutes && showTime) {
        return `${day}/${month}/${year} às ${hours}:${minutes}`;
      }
      return `${day}/${month}/${year}`;
    }
  }

  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) {
      return String(dateInput);
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    if (relative) {
      const now = new Date();
      const isToday =
        now.getDate() === d.getDate() &&
        now.getMonth() === d.getMonth() &&
        now.getFullYear() === d.getFullYear();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday =
        yesterday.getDate() === d.getDate() &&
        yesterday.getMonth() === d.getMonth() &&
        yesterday.getFullYear() === d.getFullYear();

      if (isToday) {
        return showTime ? `Hoje às ${hours}:${minutes}` : 'Hoje';
      }
      if (isYesterday) {
        return showTime ? `Ontem às ${hours}:${minutes}` : 'Ontem';
      }
    }

    if (showTime) {
      return `${day}/${month}/${year} às ${hours}:${minutes}`;
    }
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Formata apenas a data (ex: "26/10/2026").
 */
export function formatDate(dateInput?: string | Date | null): string {
  return formatDateTime(dateInput, { showTime: false });
}
