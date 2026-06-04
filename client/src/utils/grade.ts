export function getGrade(accuracy: number): string {
  if (accuracy >= 100) return 'SSS'
  if (accuracy >= 99) return 'SS'
  if (accuracy >= 95) return 'S'
  if (accuracy >= 90) return 'A'
  return 'B'
}

export function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    SSS: '#d4a017',
    SS: '#4a9eff',
    S: '#4caf50',
    A: '#ff9800',
    B: '#9e9e9e'
  }
  return colors[grade] || '#9e9e9e'
}
