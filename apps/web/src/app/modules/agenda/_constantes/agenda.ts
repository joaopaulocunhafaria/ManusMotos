/** Primeira hora exibida na grade (amplia se houver agendamento mais cedo). */
export const HORA_INICIO = 7;

/** Hora em que a grade termina (amplia se houver agendamento mais tarde). */
export const HORA_FIM = 20;

/** Altura de uma hora na grade, em px. */
export const ALTURA_HORA_PX = 48;

/** Altura mínima de um bloco, para continuar tocável e legível. */
export const ALTURA_MINIMA_BLOCO_PX = 18;

/** Duração padrão de um agendamento, em minutos. */
export const DURACAO_PADRAO = 60;

/** Opções de duração do formulário. */
export const DURACOES: { label: string; value: number }[] = [
	{ label: '30 min', value: 30 },
	{ label: '1 hora', value: 60 },
	{ label: '1h30', value: 90 },
	{ label: '2 horas', value: 120 },
	{ label: '3 horas', value: 180 },
	{ label: '4 horas', value: 240 },
	{ label: 'Dia todo (8h)', value: 480 },
];

/** Limite de agendamentos buscados por semana. */
export const LIMITE_AGENDAMENTOS_SEMANA = 500;
