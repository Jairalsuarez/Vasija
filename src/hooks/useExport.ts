import { useCallback } from 'react';
import { useFinanceStore } from '../store';

export function useExport() {
  const { movements } = useFinanceStore();

  const exportPDF = useCallback(
    async (filter: 'day' | 'week' | 'month') => {
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable');

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Reporte de Movimientos', 14, 22);

      const now = new Date();
      const filtered = movements.filter((m) => {
        const date = new Date(m.date);
        const diff = now.getTime() - date.getTime();
        const days = diff / (1000 * 3600 * 24);
        if (filter === 'day') return days <= 1;
        if (filter === 'week') return days <= 7;
        return days <= 30;
      });

      const rows = filtered.map((m) => [
        m.date,
        m.type === 'income' ? 'Ingreso' : 'Gasto',
        `$${m.amount.toFixed(2)}`,
        m.description,
      ]);

      (doc as any).autoTable({
        head: [['Fecha', 'Tipo', 'Monto', 'Descripción']],
        body: rows,
        startY: 30,
      });

      doc.save(`movimientos-${filter}.pdf`);
    },
    [movements],
  );

  const exportExcel = useCallback(async () => {
    const XLSX = await import('xlsx');

    const data = movements.map((m) => ({
      Fecha: m.date,
      Tipo: m.type === 'income' ? 'Ingreso' : 'Gasto',
      Monto: m.amount,
      Descripción: m.description,
      Categoría: m.category,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
    XLSX.writeFile(wb, 'analisis-financiero.xlsx');
  }, [movements]);

  return { exportPDF, exportExcel };
}
