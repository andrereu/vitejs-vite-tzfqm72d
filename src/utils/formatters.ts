export const formatDateDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
};

export const formatDateBR = (dateStr: string): string => {
  if (!dateStr) return '';
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export const calculateWeeksAndDays = (dumStr: string) => {
  if (!dumStr) return { weeks: 0, days: 0 };
  const dum = new Date(dumStr);
  const today = new Date();
  const diffDays = Math.floor(Math.max(0, today.getTime() - dum.getTime()) / (1000 * 60 * 60 * 24));
  return { weeks: Math.floor(diffDays / 7), days: diffDays % 7 };
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};
