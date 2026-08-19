import { useEffect } from 'react';
import type { DoctorTenant } from '../types/saas';
import { BRAND_THEME_VARS, buildBrandTheme } from '../utils/theme';

// Aplica a cor personalizada da médica (DoctorTenant.corPrimaria) como
// sobrescrita das variáveis de marca em :root, só enquanto a tela exibida
// pertence a essa médica (painel dela, prontuário de uma paciente dela, ou
// a landing pessoal dela). Sem médica no contexto (landing genérica, master
// admin) ou sem cor customizada, remove a sobrescrita e volta pro verde
// padrão do index.css.
export function useBrandTheme(doctor: DoctorTenant | undefined): void {
  useEffect(() => {
    const root = document.documentElement;
    const overrides = buildBrandTheme(doctor?.corPrimaria);

    for (const key of BRAND_THEME_VARS) {
      if (overrides) {
        root.style.setProperty(key, overrides[key]);
      } else {
        root.style.removeProperty(key);
      }
    }
  }, [doctor?.corPrimaria]);
}
