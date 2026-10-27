export interface DefaultCategory {
  id: string;
  name: string;
  description: string;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    id: '11111111-1111-1111-1111-111111111101',
    name: 'Elétrica',
    description: 'Instalações, reparos de fiação, disjuntores e tomadas',
  },
  {
    id: '11111111-1111-1111-1111-111111111102',
    name: 'Hidráulica',
    description: 'Conserto de vazamentos, torneiras, encanamentos e registros',
  },
  {
    id: '11111111-1111-1111-1111-111111111103',
    name: 'Pintura',
    description: 'Pintura residencial, comercial, massa corrida e texturas',
  },
  {
    id: '11111111-1111-1111-1111-111111111104',
    name: 'Limpeza e Diarista',
    description: 'Faxina completa, limpeza pós-obra e conservação',
  },
  {
    id: '11111111-1111-1111-1111-111111111105',
    name: 'Montagem de Móveis',
    description: 'Montagem, desmontagem e pequenos reparos em móveis',
  },
  {
    id: '11111111-1111-1111-1111-111111111106',
    name: 'Climatização e Ar-Condicionado',
    description: 'Instalação, higienização e manutenção de ar-condicionado',
  },
  {
    id: '11111111-1111-1111-1111-111111111107',
    name: 'Jardinagem',
    description: 'Corte de grama, poda, paisagismo e manutenção de jardins',
  },
  {
    id: '11111111-1111-1111-1111-111111111108',
    name: 'Alvenaria e Reformas',
    description: 'Pequenas obras, assentamento de pisos, reboco e reparos',
  },
];
