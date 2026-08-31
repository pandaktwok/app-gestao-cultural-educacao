import { useMemo } from 'react';

export interface AttendanceRecord {
  id: string;
  professorId: string;
  schoolId: string;
  date: string;
  month: number; // 0-11
  attended: number;
  absent: number;
  dropped: number;
}

export function useFrequencyData(
  allRecords: AttendanceRecord[],
  selectedProfessorId: string | null,
  selectedSchoolId: string | null
) {
  return useMemo(() => {
    // 1. Aplica os filtros hierárquicos
    const filtered = allRecords.filter((record) => {
      if (selectedSchoolId && selectedSchoolId !== 'ALL' && record.schoolId !== selectedSchoolId) {
        return false;
      }
      if (selectedProfessorId && selectedProfessorId !== 'ALL' && record.professorId !== selectedProfessorId) {
        return false;
      }
      return true;
    });

    // 2. Agrupa os valores mês a mês (Jan a Dez)
    const monthLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    const monthlyStats = Array.from({ length: 12 }, (_, monthIndex) => {
      const monthRecords = filtered.filter((r) => r.month === monthIndex);

      const attended = monthRecords.reduce((acc, curr) => acc + curr.attended, 0);
      const absent = monthRecords.reduce((acc, curr) => acc + curr.absent, 0);
      const dropped = monthRecords.reduce((acc, curr) => acc + curr.dropped, 0);

      return {
        month: monthIndex,
        day: monthLabels[monthIndex],
        presentes: attended,
        faltas: absent,
        desistencias: dropped,
        attended,
        absent,
        dropped,
      };
    });

    return monthlyStats;
  }, [allRecords, selectedProfessorId, selectedSchoolId]);
}
