import {
  Farm,
  GaugeCalibrationRecord,
  NR13Category,
  NR13CompanyData,
  NR13InspectionReport,
  NR13VesselMaster,
  UltrassomEquipmentRecord,
  ValveCalibrationRecord
} from '../types';

export const FARM_COMPANY_PROFILES: Record<Farm, NR13CompanyData> = {
  'Vale das Uvas': {
    razaoSocial: 'Agropecuária Vale das Uvas LTDA',
    cnpj: '',
    address: 'Estrada Das Pedrinhas KM 14, Serrote do Urubu, S/N - Zona Rural',
    cityState: 'Petrolina / PE',
    cep: '56300-000'
  },
  'Brasil Uvas': {
    razaoSocial: 'Brasil Uvas Agrícola Ltda',
    cnpj: '',
    address: 'DT Itamotinga, S/N - Itamotinga (Rod. Juazeiro/Curaçá, KM 40)',
    cityState: 'Juazeiro / BA',
    cep: '48923-000'
  },
  'Labrunier 1': {
    razaoSocial: 'Agropecuária Labrunier Ltda',
    cnpj: '',
    address: 'Santana do Sobrado, Sem Número - Zona Rural',
    cityState: 'Casa Nova / BA',
    cep: '47310-000'
  },
  'Labrunier 2': {
    razaoSocial: 'Agropecuária Labrunier Ltda 2',
    cnpj: '',
    address: 'Estrada dos Vermelhos, KM 12, S/N - Zona Rural',
    cityState: 'Lagoa Grande / PE',
    cep: '56395-000'
  },
  'Matriz': {
    razaoSocial: 'el Ciruelo Agrícola do Brasil Ltda - Matriz',
    cnpj: '',
    address: 'Unidade Administrativa Matriz',
    cityState: 'Petrolina / PE',
    cep: '56300-000'
  },
  'Bravis': {
    razaoSocial: 'el Ciruelo Agrícola do Brasil Ltda - Fazenda Bravis',
    cnpj: '',
    address: 'Zona Rural - Unidade Bravis',
    cityState: 'Petrolina / PE',
    cep: '56300-000'
  }
};

// IDs legados de demonstração que não devem reaparecer caso ainda existam em cache antigo
export const LEGACY_SAMPLE_VESSEL_IDS = ['vessel_vu_vp01', 'vessel_bu_acum02'];
export const LEGACY_SAMPLE_VALVE_IDS = ['valv_cal_1', 'valv_cal_2', 'valv_cal_3'];
export const LEGACY_SAMPLE_GAUGE_IDS = ['gauge_cal_1', 'gauge_test_960500'];

// Instrumentos padrão reais constantes nas páginas finais dos laudos enviados
export const INSPECIONE_TEST_GAUGE_STANDARD = 'Manômetro de Teste • Nº de Série: 960500 (Faixa 0 a 21 kgf/cm²)';
export const INSPECIONE_TEST_GAUGE_CERT = 'T2-91824/24 (06/09/2024)';
export const INSPECIONE_ULTRASSOM_EQUIPMENT = 'Eddytronic USE 100 • Série: KL:2412978 • Certificado: 4575/24 (Calib. 24/07/2024 • Val. 22/07/2025)';

const formatDateShortBR = (isoDate?: string): string => {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export const formatUltrassomEquipmentLabel = (
  eq: Pick<UltrassomEquipmentRecord, 'name' | 'serialNumber' | 'certificateNumber' | 'calibrationDate' | 'nextCalibrationDate'>
): string => {
  const parts = [eq.name.trim()];
  if (eq.serialNumber?.trim()) parts.push(`Série: ${eq.serialNumber.trim()}`);
  if (eq.certificateNumber?.trim()) {
    const dates = eq.calibrationDate || eq.nextCalibrationDate
      ? ` (Calib. ${formatDateShortBR(eq.calibrationDate)} • Val. ${formatDateShortBR(eq.nextCalibrationDate)})`
      : '';
    parts.push(`Certificado: ${eq.certificateNumber.trim()}${dates}`);
  }
  return parts.join(' • ');
};

const addOneYearIso = (dateStr: string): string => {
  const d = new Date(`${dateStr}T12:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().substring(0, 10);
};

interface ValveSeedInput {
  id: string;
  code: string;
  tag: string;
  farm: Farm;
  equipmentLinked: string;
  sector: string;
  manufacturer: string;
  model: string;
  connectionSize: string;
  fluidType: string;
  setPressure: number;
  reseatPressure: number;
  pressureUnit: 'bar' | 'kgf/cm²' | 'psi';
  calibrationDate: string;
  notes?: string;
}

const buildValve = (v: ValveSeedInput): ValveCalibrationRecord => ({
  id: v.id,
  code: v.code,
  tag: v.tag,
  farm: v.farm,
  equipmentLinked: v.equipmentLinked,
  sector: v.sector,
  manufacturer: v.manufacturer,
  model: v.model,
  connectionSize: v.connectionSize,
  fluidType: v.fluidType,
  setPressure: v.setPressure,
  openingPressure: v.setPressure,
  reseatPressure: v.reseatPressure,
  pressureUnit: v.pressureUnit,
  tightnessTest: 'SEM_VAZAMENTO',
  testFluid: 'Nitrogênio Gasoso (N2)',
  testBenchStandard: INSPECIONE_TEST_GAUGE_STANDARD,
  standardCertNumber: INSPECIONE_TEST_GAUGE_CERT,
  technicianName: 'Eng. Aurélio Antonio Rodrigues Henrique (CREA-PE 047443)',
  calibrationDate: v.calibrationDate,
  nextCalibrationDate: addOneYearIso(v.calibrationDate),
  status: 'APROVADA',
  notes: v.notes,
  createdAt: `${v.calibrationDate}T12:00:00.000Z`
});

export const INITIAL_VALVE_CALIBRATIONS: ValveCalibrationRecord[] = [
  // ==================== BRASIL UVAS (20 VÁLVULAS) ====================
  buildValve({
    id: 'valv_bu_01', code: 'IE-151-24', tag: 'PSV-01', farm: 'Brasil Uvas',
    equipmentLinked: 'VP-01 - Casco Líquido R-22', sector: 'Câmaras Frias / Sala de Máquinas',
    manufacturer: 'Vastin', model: 'Angular', connectionSize: '1/2"', fluidType: 'R-22',
    setPressure: 19.0, reseatPressure: 17.0, pressureUnit: 'kgf/cm²', calibrationDate: '2024-11-14',
    notes: 'Série 2021/1101 • Laudo VP-01 (Relatório 502).'
  }),
  buildValve({
    id: 'valv_bu_02', code: 'IE-152-24', tag: 'PSV-02', farm: 'Brasil Uvas',
    equipmentLinked: 'VP-01 - Casco Líquido R-22', sector: 'Câmaras Frias / Sala de Máquinas',
    manufacturer: 'Vastin', model: 'Angular', connectionSize: '1/2"', fluidType: 'R-22',
    setPressure: 19.0, reseatPressure: 17.5, pressureUnit: 'kgf/cm²', calibrationDate: '2024-11-14',
    notes: 'Série 2021/1105 • Laudo VP-01 (Relatório 502).'
  }),
  buildValve({
    id: 'valv_bu_03', code: 'IE-153-24', tag: 'PSV-03', farm: 'Brasil Uvas',
    equipmentLinked: 'VP-02 - Casco Líquido R 438a', sector: 'Câmaras Frias / Sala de Máquinas',
    manufacturer: 'Vastin', model: 'Angular', connectionSize: '1/2"', fluidType: 'R 438a',
    setPressure: 19.0, reseatPressure: 17.3, pressureUnit: 'kgf/cm²', calibrationDate: '2024-11-14',
    notes: 'Série 2021/1097 • Laudo VP-02 (Relatório 503).'
  }),
  buildValve({
    id: 'valv_bu_04', code: 'IE-154-24', tag: 'PSV-04', farm: 'Brasil Uvas',
    equipmentLinked: 'VP-02 - Casco Líquido R 438a', sector: 'Câmaras Frias / Sala de Máquinas',
    manufacturer: 'Vastin', model: 'Angular', connectionSize: '1/2"', fluidType: 'R 438a',
    setPressure: 19.0, reseatPressure: 17.5, pressureUnit: 'kgf/cm²', calibrationDate: '2024-11-14',
    notes: 'Série 2021/1106 • Laudo VP-02 (Relatório 503).'
  }),
  buildValve({
    id: 'valv_bu_05', code: 'IE-155-24', tag: 'PSV-05', farm: 'Brasil Uvas',
    equipmentLinked: 'VP-03 - Casco Líquido R404 A', sector: 'Câmaras Frias / Sala de Máquinas',
    manufacturer: 'Vastin', model: 'Angular', connectionSize: '1/2"', fluidType: 'R404 A',
    setPressure: 19.0, reseatPressure: 17.4, pressureUnit: 'kgf/cm²', calibrationDate: '2024-11-14',
    notes: 'Série 2021/1103 • Laudo VP-03 (Relatório 504).'
  }),
  buildValve({
    id: 'valv_bu_06', code: 'IE-156-24', tag: 'PSV-06', farm: 'Brasil Uvas',
    equipmentLinked: 'VP-03 - Casco Líquido R404 A', sector: 'Câmaras Frias / Sala de Máquinas',
    manufacturer: 'Vastin', model: 'Angular', connectionSize: '1/2"', fluidType: 'R404 A',
    setPressure: 19.0, reseatPressure: 17.4, pressureUnit: 'kgf/cm²', calibrationDate: '2024-11-14',
    notes: 'Série 2021/1100 • Laudo VP-03 (Relatório 504).'
  }),
  buildValve({
    id: 'valv_bu_07', code: 'IE-157-24', tag: 'PSV-07', farm: 'Brasil Uvas',
    equipmentLinked: 'VP-04 - Casco Líquido R-22', sector: 'Câmaras Frias / Sala de Máquinas',
    manufacturer: 'Vastin', model: 'Angular', connectionSize: '1/2"', fluidType: 'R-22',
    setPressure: 19.0, reseatPressure: 17.5, pressureUnit: 'kgf/cm²', calibrationDate: '2024-11-14',
    notes: 'Série 2021/1095 • Laudo VP-04 (Relatório 505).'
  }),
  buildValve({
    id: 'valv_bu_08', code: 'IE-158-24', tag: 'PSV-08', farm: 'Brasil Uvas',
    equipmentLinked: 'VP-04 - Casco Líquido R-22', sector: 'Câmaras Frias / Sala de Máquinas',
    manufacturer: 'Vastin', model: 'Angular', connectionSize: '1/2"', fluidType: 'R-22',
    setPressure: 19.0, reseatPressure: 17.4, pressureUnit: 'kgf/cm²', calibrationDate: '2024-11-14',
    notes: 'Série 2021/1099 • Laudo VP-04 (Relatório 505).'
  }),
  buildValve({
    id: 'valv_bu_09', code: 'IE-159-24', tag: 'PSV-09', farm: 'Brasil Uvas',
    equipmentLinked: 'VP-05 - Casco Líquido R-22', sector: 'Câmaras Frias / Sala de Máquinas',
    manufacturer: 'Vastin', model: 'Angular', connectionSize: '1/2"', fluidType: 'R-22',
    setPressure: 19.0, reseatPressure: 17.4, pressureUnit: 'kgf/cm²', calibrationDate: '2024-11-14',
    notes: 'Série 2021/1094 • Laudo VP-05 (Relatório 506).'
  }),
  buildValve({
    id: 'valv_bu_10', code: 'IE-160-24', tag: 'PSV-10', farm: 'Brasil Uvas',
    equipmentLinked: 'VP-05 - Casco Líquido R-22', sector: 'Câmaras Frias / Sala de Máquinas',
    manufacturer: 'Vastin', model: 'Angular', connectionSize: '1/2"', fluidType: 'R-22',
    setPressure: 19.0, reseatPressure: 17.2, pressureUnit: 'kgf/cm²', calibrationDate: '2024-11-14',
    notes: 'Série 2021/1102 • Laudo VP-05 (Relatório 506).'
  }),
  buildValve({
    id: 'valv_bu_11', code: 'IE-161-24', tag: 'PSV-11', farm: 'Brasil Uvas',
    equipmentLinked: 'VP-06 - Casco Líquido R 438a', sector: 'Câmaras Frias / Sala de Máquinas',
    manufacturer: 'Vastin', model: 'Angular', connectionSize: '1/2"', fluidType: 'R 438a',
    setPressure: 19.0, reseatPressure: 17.2, pressureUnit: 'kgf/cm²', calibrationDate: '2024-11-14',
    notes: 'Série 1096 • Laudo VP-06 (Relatório 507).'
  }),
  buildValve({
    id: 'valv_bu_12', code: 'IE-162-24', tag: 'PSV-12', farm: 'Brasil Uvas',
    equipmentLinked: 'VP-06 - Casco Líquido R 438a', sector: 'Câmaras Frias / Sala de Máquinas',
    manufacturer: 'Vastin', model: 'Angular', connectionSize: '1/2"', fluidType: 'R 438a',
    setPressure: 19.0, reseatPressure: 17.4, pressureUnit: 'kgf/cm²', calibrationDate: '2024-11-14',
    notes: 'Série 1104 • Laudo VP-06 (Relatório 507).'
  }),
  buildValve({
    id: 'valv_bu_13', code: 'IE-163-24', tag: 'PSV-13', farm: 'Brasil Uvas',
    equipmentLinked: 'VP-07 - Casco Líquido R-22', sector: 'Câmaras Frias / Sala de Máquinas',
    manufacturer: 'Vastin', model: 'Angular', connectionSize: '1/2"', fluidType: 'R-22',
    setPressure: 19.0, reseatPressure: 17.5, pressureUnit: 'kgf/cm²', calibrationDate: '2024-11-14',
    notes: 'Série 1785/21 • Laudo VP-07 (Relatório 508).'
  }),
  buildValve({
    id: 'valv_bu_14', code: 'IE-164-24', tag: 'PSV-14', farm: 'Brasil Uvas',
    equipmentLinked: 'VP-07 - Casco Líquido R-22', sector: 'Câmaras Frias / Sala de Máquinas',
    manufacturer: 'Valvugás', model: 'Angular', connectionSize: '1/2"', fluidType: 'R-22',
    setPressure: 19.0, reseatPressure: 17.4, pressureUnit: 'kgf/cm²', calibrationDate: '2024-11-14',
    notes: 'Série 1785/21 • Laudo VP-07 (Relatório 508).'
  }),
  buildValve({
    id: 'valv_bu_15', code: 'IE-165-24', tag: 'PSV-15', farm: 'Brasil Uvas',
    equipmentLinked: 'VP-08 - Casco RLH-025 R-22', sector: 'Câmaras Frias / Sala de Máquinas',
    manufacturer: 'Valvugás', model: 'Angular', connectionSize: '1/2"', fluidType: 'R-22',
    setPressure: 19.0, reseatPressure: 17.4, pressureUnit: 'kgf/cm²', calibrationDate: '2024-11-14',
    notes: 'Série 1165/22 • Laudo VP-08 (Relatório 509).'
  }),
  buildValve({
    id: 'valv_bu_16', code: 'IE-166-24', tag: 'PSV-16', farm: 'Brasil Uvas',
    equipmentLinked: 'VP-08 - Casco RLH-025 R-22', sector: 'Câmaras Frias / Sala de Máquinas',
    manufacturer: 'Valvugás', model: 'Angular', connectionSize: '1/2"', fluidType: 'R-22',
    setPressure: 19.0, reseatPressure: 17.0, pressureUnit: 'kgf/cm²', calibrationDate: '2024-11-14',
    notes: 'Série 1665/22 • Laudo VP-08 (Relatório 509).'
  }),
  buildValve({
    id: 'valv_bu_17', code: 'IE-168-24', tag: 'PSV-17', farm: 'Brasil Uvas',
    equipmentLinked: 'VP-09 - Reservatório de Ar Schulz (Oficina)', sector: 'Oficina / Fazenda',
    manufacturer: 'Não Informado', model: 'Argola', connectionSize: '1/4"', fluidType: 'Ar comprimido',
    setPressure: 9.4, reseatPressure: 7.0, pressureUnit: 'kgf/cm²', calibrationDate: '2024-11-18',
    notes: 'Laudo VP-09 (Relatório 510).'
  }),
  buildValve({
    id: 'valv_bu_18', code: 'IE-170-24', tag: 'PSV-18', farm: 'Brasil Uvas',
    equipmentLinked: 'VP-10 - Reservatório de Ar Chiaperini RCH 425 L', sector: 'Packing / Sala de Máquinas',
    manufacturer: 'Não Informado', model: 'Argola', connectionSize: '1/4"', fluidType: 'Ar comprimido',
    setPressure: 12.2, reseatPressure: 8.0, pressureUnit: 'kgf/cm²', calibrationDate: '2024-11-19',
    notes: 'Laudo VP-10 (Relatório 511).'
  }),
  buildValve({
    id: 'valv_bu_19', code: 'IE-172-24', tag: 'PSV-19', farm: 'Brasil Uvas',
    equipmentLinked: 'VP-10 - Reservatório de Ar Chiaperini RCH 425 L', sector: 'Packing / Sala de Máquinas',
    manufacturer: 'Não Informado', model: 'Argola', connectionSize: '1/4"', fluidType: 'Ar comprimido',
    setPressure: 12.8, reseatPressure: 7.2, pressureUnit: 'kgf/cm²', calibrationDate: '2024-11-19',
    notes: 'Laudo VP-10 (Relatório 511).'
  }),
  buildValve({
    id: 'valv_bu_20', code: 'IE-173-24', tag: 'PSV-20', farm: 'Brasil Uvas',
    equipmentLinked: 'VP-11 - Reservatório de Ar Pressure', sector: 'Fazenda / Oficina',
    manufacturer: 'Não Informado', model: 'Argola', connectionSize: '1/4"', fluidType: 'Ar comprimido',
    setPressure: 9.0, reseatPressure: 7.0, pressureUnit: 'kgf/cm²', calibrationDate: '2024-11-19',
    notes: 'Laudo VP-11 (Relatório 512).'
  }),

  // ==================== LABRUNIER 1 (3 VÁLVULAS) ====================
  buildValve({
    id: 'valv_l1_01', code: 'IE-155-24-L1', tag: 'PSV-SL-01', farm: 'Labrunier 1',
    equipmentLinked: 'VP-02 - Separador Amônia e Óleo SL-900-2', sector: 'Packing House / Sala de Máquinas',
    manufacturer: 'EICA', model: 'VSA F-13', connectionSize: '1/2"', fluidType: 'Amônia',
    setPressure: 15.0, reseatPressure: 13.0, pressureUnit: 'kgf/cm²', calibrationDate: '2024-11-26',
    notes: 'Laudo VP-02 (Relatório 501).'
  }),
  buildValve({
    id: 'valv_l1_02', code: 'IE-156-24-L1', tag: 'PSV-SL-02', farm: 'Labrunier 1',
    equipmentLinked: 'VP-02 - Separador Amônia e Óleo SL-900-2', sector: 'Packing House / Sala de Máquinas',
    manufacturer: 'EICA', model: 'VSA F-13', connectionSize: '1/2"', fluidType: 'Amônia',
    setPressure: 15.0, reseatPressure: 13.5, pressureUnit: 'kgf/cm²', calibrationDate: '2024-11-26',
    notes: 'Laudo VP-02 (Relatório 501).'
  }),
  buildValve({
    id: 'valv_l1_03', code: 'IE-157-2024', tag: 'PSV-01', farm: 'Labrunier 1',
    equipmentLinked: 'VP-03 - Reservatório de Ar Chiaperini RCH 200L AP', sector: 'Packing House / Oficina',
    manufacturer: 'Não Informado', model: 'Argola', connectionSize: '1/4"', fluidType: 'Ar comprimido',
    setPressure: 11.0, reseatPressure: 7.0, pressureUnit: 'kgf/cm²', calibrationDate: '2024-11-27',
    notes: 'Laudo VP-03 (Relatório 495).'
  }),

  // ==================== LABRUNIER 2 (3 VÁLVULAS) ====================
  buildValve({
    id: 'valv_l2_01', code: 'IE-174-24', tag: 'PSV-21', farm: 'Labrunier 2',
    equipmentLinked: 'VP-01 (Sala Maquinas) - Chiaperini RCH 425L', sector: 'Packing / Sala de Máquinas',
    manufacturer: 'Lubefer', model: 'Argola', connectionSize: '1/4"', fluidType: 'Ar comprimido',
    setPressure: 12.2, reseatPressure: 6.0, pressureUnit: 'kgf/cm²', calibrationDate: '2024-11-21',
    notes: 'Laudo VP-01 (Relatório 513).'
  }),
  buildValve({
    id: 'valv_l2_02', code: 'IE-175-24', tag: 'PSV-22', farm: 'Labrunier 2',
    equipmentLinked: 'VP-01 (Sala Maquinas) - Chiaperini RCH 425L', sector: 'Packing / Sala de Máquinas',
    manufacturer: 'Lubefer', model: 'Argola', connectionSize: '1/4"', fluidType: 'Ar comprimido',
    setPressure: 12.3, reseatPressure: 6.0, pressureUnit: 'kgf/cm²', calibrationDate: '2024-11-21',
    notes: 'Laudo VP-01 (Relatório 513).'
  }),
  buildValve({
    id: 'valv_l2_03', code: 'IE-177-24', tag: 'PSV-23', farm: 'Labrunier 2',
    equipmentLinked: 'VP-02 (Oficina) - Chiaperini RCH 110L', sector: 'Fazenda / Oficina',
    manufacturer: 'Lubefer', model: 'Argola', connectionSize: '1/4"', fluidType: 'Ar comprimido',
    setPressure: 10.5, reseatPressure: 7.0, pressureUnit: 'kgf/cm²', calibrationDate: '2024-11-21',
    notes: 'Laudo VP-02 (Relatório 514).'
  }),

  // ==================== VALE DAS UVAS (6 VÁLVULAS) ====================
  buildValve({
    id: 'valv_vu_01', code: 'IE-144-24', tag: 'PSV-SL2-01', farm: 'Vale das Uvas',
    equipmentLinked: 'VP-02 - Separador de Líquidos York PVER 8121', sector: 'Packing House / Sala de Máquinas',
    manufacturer: 'Danfoss', model: 'VSEG', connectionSize: '3/4 x 1"', fluidType: 'Amônia',
    setPressure: 16.0, reseatPressure: 14.8, pressureUnit: 'bar', calibrationDate: '2024-11-12',
    notes: 'Série 182501 • Laudo VP-02 (Relatório 482).'
  }),
  buildValve({
    id: 'valv_vu_02', code: 'IE-142-24', tag: 'PSV-SL2-02', farm: 'Vale das Uvas',
    equipmentLinked: 'VP-02 - Separador de Líquidos York PVER 8121', sector: 'Packing House / Sala de Máquinas',
    manufacturer: 'Danfoss', model: 'VSEG', connectionSize: '3/4 x 1"', fluidType: 'Amônia',
    setPressure: 16.0, reseatPressure: 15.0, pressureUnit: 'bar', calibrationDate: '2024-11-12',
    notes: 'Série 182494 • Laudo VP-02 (Relatório 482).'
  }),
  buildValve({
    id: 'valv_vu_03', code: 'IE-143-24', tag: 'PSV-RL-01', farm: 'Vale das Uvas',
    equipmentLinked: 'VP-03 - Acumulador Amônia Mebrafe RL 1100-5', sector: 'Packing House / Sala de Máquinas',
    manufacturer: 'Valvugás', model: 'VSEG', connectionSize: '1/2 x 1"', fluidType: 'Amônia',
    setPressure: 16.0, reseatPressure: 15.0, pressureUnit: 'bar', calibrationDate: '2024-11-12',
    notes: 'Série 147213A • Laudo VP-03 (Relatório 481).'
  }),
  buildValve({
    id: 'valv_vu_04', code: 'IE-141-24', tag: 'PSV-RL-02', farm: 'Vale das Uvas',
    equipmentLinked: 'VP-03 - Acumulador Amônia Mebrafe RL 1100-5', sector: 'Packing House / Sala de Máquinas',
    manufacturer: 'Valvugás', model: 'VSEG', connectionSize: '1/2 x 1"', fluidType: 'Amônia',
    setPressure: 16.0, reseatPressure: 15.3, pressureUnit: 'bar', calibrationDate: '2024-11-12',
    notes: 'Série 147213 • Laudo VP-03 (Relatório 481).'
  }),
  buildValve({
    id: 'valv_vu_05', code: 'IE-085-25', tag: 'PSV-C5-01', farm: 'Vale das Uvas',
    equipmentLinked: 'CP-05 - Compressor nº 5', sector: 'Sala de Máquinas',
    manufacturer: 'Não Informado', model: 'Angular', connectionSize: '3/4"', fluidType: 'Amônia',
    setPressure: 20.5, reseatPressure: 18.0, pressureUnit: 'kgf/cm²', calibrationDate: '2025-05-21',
    notes: 'Série H5602 GA • Certificado IE-085-25 (Local Inst.: Compressor nº 5).'
  }),
  buildValve({
    id: 'valv_vu_06', code: 'IE-147-24', tag: 'PSV-VO-01', farm: 'Vale das Uvas',
    equipmentLinked: 'VP-08 - Reservatório de Ar Garthen MRM 100', sector: 'Packing House / Oficina Mecânica',
    manufacturer: 'Não Informado', model: 'Argola', connectionSize: '1/4"', fluidType: 'Ar comprimido',
    setPressure: 145, reseatPressure: 100, pressureUnit: 'psi', calibrationDate: '2024-11-12',
    notes: 'Laudo VP-08 (Relatório 488).'
  })
];

export const INITIAL_GAUGE_CALIBRATIONS: GaugeCalibrationRecord[] = [];

export const INITIAL_ULTRASSOM_EQUIPMENTS: UltrassomEquipmentRecord[] = [
  {
    id: 'ultra_eddytronic_use100',
    name: 'Eddytronic USE 100',
    serialNumber: 'KL:2412978',
    certificateNumber: '4575/24',
    calibrationDate: '2024-07-24',
    nextCalibrationDate: '2025-07-22',
    calibrationLab: 'Righ Comércio e Serviços Ltda',
    measurementRange: '1,0 a 32,0 mm (Nominal 1–200 mm)',
    resolution: '0,1 mm',
    uncertainty: '1%',
    status: 'CALIBRADO',
    notes: 'Medidor de espessuras digital por ultrassom Eddytronic USE 100 constante nas páginas finais dos laudos técnicos enviados.',
    createdAt: '2024-07-24T12:00:00.000Z'
  }
];

interface VesselSeedInput {
  id: string;
  farm: Farm;
  assetType: 'VP' | 'CP';
  vesselNumber: string;
  equipmentTag: string;
  sector: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  manufactureYear: string;
  projectCode: string;
  designCodeEdition: string;
  volumeM3: number;
  serviceFluid: string;
  fluidGroup: string;
  pmta: number;
  pmtaUnit?: 'Kgf/cm²' | 'Bar';
  pth: string;
  normalOperatingPressure: number;
  maxOperatingPressure: string;
  equipmentType: string;
  vesselPurpose: string;
  vesselType: string;
  outerDiameter: string;
  length: string;
  tareWeight: string;
  bodyThickness: string;
  headThickness: string;
  headType: string;
  height: string;
  width: string;
  minBodyThickness: string;
  minHeadThickness: string;
  local: string;
  area: string;
  designTemperature: string;
  operatingTemperature: string;
  material: string;
  installationConfig: 'HORIZONTAL' | 'VERTICAL';
  fluidClass: 'A' | 'B' | 'C' | 'D';
  pvProduct: number;
  riskGroup: string;
  category: NR13Category;
  linkedValveTag?: string;
  linkedValveSpecs?: NR13VesselMaster['linkedValveSpecs'];
  notes?: string;
  createdAt?: string;
}

const buildVessel = (v: VesselSeedInput): NR13VesselMaster => {
  const pressureMpa = v.pmtaUnit === 'Bar'
    ? Number((v.pmta * 0.1).toFixed(3))
    : Number((v.pmta * 0.0980665).toFixed(3));
  return {
    id: v.id,
    farm: v.farm,
    assetType: v.assetType,
    vesselNumber: v.vesselNumber,
    equipmentTag: v.equipmentTag,
    sector: v.sector,
    companyData: { ...FARM_COMPANY_PROFILES[v.farm], cnpj: '' },
    equipment: {
      manufacturer: v.manufacturer,
      model: v.model,
      serialNumber: v.serialNumber,
      manufactureYear: v.manufactureYear,
      projectCode: v.projectCode,
      designCodeEdition: v.designCodeEdition,
      geometricVolume: v.volumeM3,
      volumeUnit: 'm³',
      serviceFluid: v.serviceFluid,
      fluidGroup: v.fluidGroup,
      pmta: v.pmta,
      pth: v.pth,
      normalOperatingPressure: v.normalOperatingPressure,
      maxOperatingPressure: v.maxOperatingPressure,
      equipmentType: v.equipmentType,
      vesselPurpose: v.vesselPurpose,
      vesselType: v.vesselType,
      outerDiameter: v.outerDiameter,
      length: v.length,
      tareWeight: v.tareWeight,
      bodyThickness: v.bodyThickness,
      headThickness: v.headThickness,
      headBottomLeft: v.headType,
      headTopRight: v.headType,
      height: v.height,
      width: v.width,
      minBodyThickness: v.minBodyThickness,
      minHeadThickness: v.minHeadThickness,
      local: v.local,
      area: v.area,
      designTemperature: v.designTemperature,
      operatingTemperature: v.operatingTemperature,
      material: v.material,
      mainDimensions: v.outerDiameter !== '-' && v.length !== '-' ? `Ø ${v.outerDiameter} x ${v.length}` : '-',
      installationConfig: v.installationConfig
    },
    nr13Categorization: {
      fluidClass: v.fluidClass,
      pressureMpa,
      volumeM3: v.volumeM3,
      pvProduct: v.pvProduct,
      category: v.category,
      riskGroup: v.riskGroup
    },
    linkedValveTag: v.linkedValveTag,
    // Nota: Campos da Seção 8 (visualInspection, calibrationStatus, leakage) permanecem abertos nos laudos
    linkedValveSpecs: v.linkedValveSpecs,
    notes: v.notes,
    createdAt: v.createdAt || '2024-11-27T12:00:00.000Z'
  };
};

export const INITIAL_NR13_VESSELS: NR13VesselMaster[] = [
  // =========================================================================
  // FAZENDA BRASIL UVAS (11 VASOS DE PRESSÃO: VP-01 a VP-11)
  // =========================================================================
  buildVessel({
    id: 'vessel_bu_vp01', farm: 'Brasil Uvas', assetType: 'VP',
    vesselNumber: 'VP-01', equipmentTag: 'VP-01 - Casco Líquido R-22 (Mebrafe)',
    sector: 'Câmaras Frias / Sala de Máquinas', manufacturer: 'Mebrafe', model: 'Horizontal',
    serialNumber: '010', manufactureYear: '2010', projectCode: 'ASME, SEC VIII, DIV 1', designCodeEdition: '2008',
    volumeM3: 0.36, serviceFluid: 'R-22', fluidGroup: 'Grupo 2', pmta: 21.0, pth: '25.00 Kgf/cm²',
    normalOperatingPressure: 17.0, maxOperatingPressure: '17.00 Kgf/cm²', equipmentType: 'CASCO',
    vesselPurpose: 'Armazenar liquido', vesselType: 'AÉREO HORIZONTAL', outerDiameter: '500 mm', length: '2120 mm',
    tareWeight: '1000 kgf', bodyThickness: '6.50 mm', headThickness: '8.00 mm', headType: 'TORIESFÉRICA',
    height: '1500 mm', width: '700 mm', minBodyThickness: '6.20 mm', minHeadThickness: '7.50 mm',
    local: 'Camaras Frias', area: 'Sala de máquinas', designTemperature: '150°C', operatingTemperature: '35°C',
    material: 'Aço carbono', installationConfig: 'HORIZONTAL',
    fluidClass: 'C', pvProduct: 0.7414, riskGroup: 'Grupo 5 (Categoria V)', category: 'V',
    linkedValveTag: 'PSV-01 / PSV-02',
    linkedValveSpecs: {
      tag: 'PSV-01 / PSV-02', manufacturer: 'Vastin', model: 'Angular', connectionSize: '1/2"',
      fluidType: 'R-22', setPressure: '19.0 kgf/cm²', openingPressure: '19.0 kgf/cm²',
      reseatPressure: '17.0 / 17.5 kgf/cm²', certificateNumber: 'IE-151-24 / IE-152-24',
      calibrationDate: '2024-11-14', nextCalibrationDate: '2025-11-14'
    },
    notes: 'Relatório de referência nº 502.'
  }),
  buildVessel({
    id: 'vessel_bu_vp02', farm: 'Brasil Uvas', assetType: 'VP',
    vesselNumber: 'VP-02', equipmentTag: 'VP-02 - Casco Líquido R 438a (Mebrafe)',
    sector: 'Câmaras Frias / Sala de Máquinas', manufacturer: 'Mebrafe', model: 'Horizontal',
    serialNumber: 'NI', manufactureYear: '2003', projectCode: 'ASME, SEC VIII, DIV 1', designCodeEdition: '2000',
    volumeM3: 0.12, serviceFluid: 'R 438a', fluidGroup: 'Grupo 2', pmta: 21.0, pth: '25.00 Kgf/cm²',
    normalOperatingPressure: 17.0, maxOperatingPressure: '17.00 Kgf/cm²', equipmentType: 'CASCO',
    vesselPurpose: 'Armazenar liquido', vesselType: 'AÉREO HORIZONTAL', outerDiameter: '400 mm', length: '1200 mm',
    tareWeight: '300 kgf', bodyThickness: '6.40 mm', headThickness: '6.40 mm', headType: 'TORIESFÉRICA',
    height: '1200 mm', width: '600 mm', minBodyThickness: '6.20 mm', minHeadThickness: '7.20 mm',
    local: 'Camaras Frias', area: 'Sala de máquinas', designTemperature: '150°C', operatingTemperature: '35°C',
    material: 'Aço carbono', installationConfig: 'HORIZONTAL',
    fluidClass: 'C', pvProduct: 0.2471, riskGroup: 'Grupo 5 (Categoria V)', category: 'V',
    linkedValveTag: 'PSV-03 / PSV-04',
    linkedValveSpecs: {
      tag: 'PSV-03 / PSV-04', manufacturer: 'Vastin', model: 'Angular', connectionSize: '1/2"',
      fluidType: 'R 438a', setPressure: '19.0 kgf/cm²', openingPressure: '19.0 kgf/cm²',
      reseatPressure: '17.3 / 17.5 kgf/cm²', certificateNumber: 'IE-153-24 / IE-154-24',
      calibrationDate: '2024-11-14', nextCalibrationDate: '2025-11-14'
    },
    notes: 'Relatório de referência nº 503.'
  }),
  buildVessel({
    id: 'vessel_bu_vp03', farm: 'Brasil Uvas', assetType: 'VP',
    vesselNumber: 'VP-03', equipmentTag: 'VP-03 - Casco Líquido R404 A (Climasul)',
    sector: 'Câmaras Frias / Sala de Máquinas', manufacturer: 'Climasul', model: 'Horizontal',
    serialNumber: 'NI', manufactureYear: '2003', projectCode: 'ASME, SEC VIII, DIV 1', designCodeEdition: '2008',
    volumeM3: 0.36, serviceFluid: 'R404 A', fluidGroup: 'Grupo 2', pmta: 21.0, pth: '25.00 Kgf/cm²',
    normalOperatingPressure: 17.0, maxOperatingPressure: '17.00 Kgf/cm²', equipmentType: 'CASCO',
    vesselPurpose: 'Armazenar liquido', vesselType: 'AÉREO HORIZONTAL', outerDiameter: '470 mm', length: '950 mm',
    tareWeight: '300 kgf', bodyThickness: '8.20 mm', headThickness: '7.80 mm', headType: 'TORIESFÉRICA',
    height: '1200 mm', width: '700 mm', minBodyThickness: '6.50 mm', minHeadThickness: '7.50 mm',
    local: 'Camaras Frias', area: 'Sala de máquinas', designTemperature: '150°C', operatingTemperature: '35°C',
    material: 'Aço carbono', installationConfig: 'HORIZONTAL',
    fluidClass: 'C', pvProduct: 0.7414, riskGroup: 'Grupo 5 (Categoria V)', category: 'V',
    linkedValveTag: 'PSV-05 / PSV-06',
    linkedValveSpecs: {
      tag: 'PSV-05 / PSV-06', manufacturer: 'Vastin', model: 'Angular', connectionSize: '1/2"',
      fluidType: 'R404 A', setPressure: '19.0 kgf/cm²', openingPressure: '19.0 kgf/cm²',
      reseatPressure: '17.4 kgf/cm²', certificateNumber: 'IE-155-24 / IE-156-24',
      calibrationDate: '2024-11-14', nextCalibrationDate: '2025-11-14'
    },
    notes: 'Relatório de referência nº 504.'
  }),
  buildVessel({
    id: 'vessel_bu_vp04', farm: 'Brasil Uvas', assetType: 'VP',
    vesselNumber: 'VP-04', equipmentTag: 'VP-04 - Casco Líquido R-22 (Climasul)',
    sector: 'Câmaras Frias / Sala de Máquinas', manufacturer: 'Climasul', model: 'Horizontal',
    serialNumber: 'NI', manufactureYear: '2003', projectCode: 'ASME, SEC VIII, DIV 1', designCodeEdition: '2008',
    volumeM3: 0.112, serviceFluid: 'R-22', fluidGroup: 'Grupo 2', pmta: 21.0, pth: '25.00 Kgf/cm²',
    normalOperatingPressure: 17.0, maxOperatingPressure: '17.00 Kgf/cm²', equipmentType: 'CASCO',
    vesselPurpose: 'Armazenar liquido', vesselType: 'AÉREO HORIZONTAL', outerDiameter: '370 mm', length: '1050 mm',
    tareWeight: '300 kgf', bodyThickness: '4.60 mm', headThickness: '6.20 mm', headType: 'TORIESFÉRICA',
    height: '1200 mm', width: '700 mm', minBodyThickness: '4.50 mm', minHeadThickness: '6.00 mm',
    local: 'Camaras Frias', area: 'Sala de máquinas', designTemperature: '150°C', operatingTemperature: '35°C',
    material: 'Aço carbono', installationConfig: 'HORIZONTAL',
    fluidClass: 'C', pvProduct: 0.2307, riskGroup: 'Grupo 5 (Categoria V)', category: 'V',
    linkedValveTag: 'PSV-07 / PSV-08',
    linkedValveSpecs: {
      tag: 'PSV-07 / PSV-08', manufacturer: 'Vastin', model: 'Angular', connectionSize: '1/2"',
      fluidType: 'R-22', setPressure: '19.0 kgf/cm²', openingPressure: '19.0 kgf/cm²',
      reseatPressure: '17.5 / 17.4 kgf/cm²', certificateNumber: 'IE-157-24 / IE-158-24',
      calibrationDate: '2024-11-14', nextCalibrationDate: '2025-11-14'
    },
    notes: 'Relatório de referência nº 505.'
  }),
  buildVessel({
    id: 'vessel_bu_vp05', farm: 'Brasil Uvas', assetType: 'VP',
    vesselNumber: 'VP-05', equipmentTag: 'VP-05 - Casco Líquido R-22 (Climasul)',
    sector: 'Câmaras Frias / Sala de Máquinas', manufacturer: 'Climasul', model: 'Horizontal',
    serialNumber: 'NI', manufactureYear: '2003', projectCode: 'ASME, SEC VIII, DIV 1', designCodeEdition: '2000',
    volumeM3: 0.15, serviceFluid: 'R-22', fluidGroup: 'Grupo 2', pmta: 21.0, pth: '25.00 Kgf/cm²',
    normalOperatingPressure: 17.0, maxOperatingPressure: '17.00 Kgf/cm²', equipmentType: 'CASCO',
    vesselPurpose: 'Armazenar liquido', vesselType: 'AÉREO HORIZONTAL', outerDiameter: '470 mm', length: '870 mm',
    tareWeight: '300 kgf', bodyThickness: '8.20 mm', headThickness: '7.80 mm', headType: 'TORIESFÉRICA',
    height: '1200 mm', width: '700 mm', minBodyThickness: '7.50 mm', minHeadThickness: '7.50 mm',
    local: 'Camaras Frias', area: 'Sala de máquinas', designTemperature: '150°C', operatingTemperature: '35°C',
    material: 'Aço carbono', installationConfig: 'HORIZONTAL',
    fluidClass: 'C', pvProduct: 0.3089, riskGroup: 'Grupo 5 (Categoria V)', category: 'V',
    linkedValveTag: 'PSV-09 / PSV-10',
    linkedValveSpecs: {
      tag: 'PSV-09 / PSV-10', manufacturer: 'Vastin', model: 'Angular', connectionSize: '1/2"',
      fluidType: 'R-22', setPressure: '19.0 kgf/cm²', openingPressure: '19.0 kgf/cm²',
      reseatPressure: '17.4 / 17.2 kgf/cm²', certificateNumber: 'IE-159-24 / IE-160-24',
      calibrationDate: '2024-11-14', nextCalibrationDate: '2025-11-14'
    },
    notes: 'Relatório de referência nº 506.'
  }),
  buildVessel({
    id: 'vessel_bu_vp06', farm: 'Brasil Uvas', assetType: 'VP',
    vesselNumber: 'VP-06', equipmentTag: 'VP-06 - Casco Líquido R 438a (Climasul)',
    sector: 'Câmaras Frias / Sala de Máquinas', manufacturer: 'Climasul', model: 'Horizontal',
    serialNumber: 'NI', manufactureYear: '2003', projectCode: 'ASME, SEC VIII, DIV 1', designCodeEdition: '2000',
    volumeM3: 0.23, serviceFluid: 'R 438a', fluidGroup: 'Grupo 2', pmta: 21.0, pth: '25.00 Kgf/cm²',
    normalOperatingPressure: 17.0, maxOperatingPressure: '17.00 Kgf/cm²', equipmentType: 'CASCO',
    vesselPurpose: 'Armazenar liquido', vesselType: 'AÉREO HORIZONTAL', outerDiameter: '370 mm', length: '2070 mm',
    tareWeight: '200 kgf', bodyThickness: '5.00 mm', headThickness: '6.70 mm', headType: 'TORIESFÉRICA',
    height: '1200 mm', width: '700 mm', minBodyThickness: '4.50 mm', minHeadThickness: '6.50 mm',
    local: 'Camaras Frias', area: 'Sala de máquinas', designTemperature: '150°C', operatingTemperature: '35°C',
    material: 'Aço carbono', installationConfig: 'HORIZONTAL',
    fluidClass: 'C', pvProduct: 0.4737, riskGroup: 'Grupo 5 (Categoria V)', category: 'V',
    linkedValveTag: 'PSV-11 / PSV-12',
    linkedValveSpecs: {
      tag: 'PSV-11 / PSV-12', manufacturer: 'Vastin', model: 'Angular', connectionSize: '1/2"',
      fluidType: 'R 438a', setPressure: '19.0 kgf/cm²', openingPressure: '19.0 kgf/cm²',
      reseatPressure: '17.2 / 17.4 kgf/cm²', certificateNumber: 'IE-161-24 / IE-162-24',
      calibrationDate: '2024-11-14', nextCalibrationDate: '2025-11-14'
    },
    notes: 'Relatório de referência nº 507.'
  }),
  buildVessel({
    id: 'vessel_bu_vp07', farm: 'Brasil Uvas', assetType: 'VP',
    vesselNumber: 'VP-07', equipmentTag: 'VP-07 - Casco Líquido R-22',
    sector: 'Câmaras Frias / Sala de Máquinas', manufacturer: 'Não Informado', model: 'Horizontal',
    serialNumber: 'NI', manufactureYear: '2003', projectCode: 'ASME, SEC VIII, DIV 1', designCodeEdition: '2000',
    volumeM3: 0.05, serviceFluid: 'R-22', fluidGroup: 'Grupo 2', pmta: 21.0, pth: '25.00 Kgf/cm²',
    normalOperatingPressure: 17.0, maxOperatingPressure: '17.00 Kgf/cm²', equipmentType: 'CASCO',
    vesselPurpose: 'Armazenar liquido', vesselType: 'AÉREO HORIZONTAL', outerDiameter: '270 mm', length: '900 mm',
    tareWeight: '200 kgf', bodyThickness: '3.30 mm', headThickness: '5.00 mm', headType: 'TORIESFÉRICA',
    height: '1200 mm', width: '700 mm', minBodyThickness: '3.20 mm', minHeadThickness: '4.50 mm',
    local: 'Camaras Frias', area: 'Sala de máquinas', designTemperature: '150°C', operatingTemperature: '35°C',
    material: 'Aço carbono', installationConfig: 'HORIZONTAL',
    fluidClass: 'C', pvProduct: 0.1030, riskGroup: 'Grupo 5 (Categoria V)', category: 'V',
    linkedValveTag: 'PSV-13 / PSV-14',
    linkedValveSpecs: {
      tag: 'PSV-13 / PSV-14', manufacturer: 'Vastin / Valvugás', model: 'Angular', connectionSize: '1/2"',
      fluidType: 'R-22', setPressure: '19.0 kgf/cm²', openingPressure: '19.0 kgf/cm²',
      reseatPressure: '17.5 / 17.4 kgf/cm²', certificateNumber: 'IE-163-24 / IE-164-24',
      calibrationDate: '2024-11-14', nextCalibrationDate: '2025-11-14'
    },
    notes: 'Relatório de referência nº 508.'
  }),
  buildVessel({
    id: 'vessel_bu_vp08', farm: 'Brasil Uvas', assetType: 'VP',
    vesselNumber: 'VP-08', equipmentTag: 'VP-08 - Casco RLH-025 R-22',
    sector: 'Câmaras Frias / Sala de Máquinas', manufacturer: 'Não Informado', model: 'RLH-025',
    serialNumber: 'NI', manufactureYear: '2022', projectCode: 'ASME, SEC VIII, DIV 1', designCodeEdition: '2020',
    volumeM3: 0.238, serviceFluid: 'R-22', fluidGroup: 'Grupo 2', pmta: 37.0, pth: '38.00 Kgf/cm²',
    normalOperatingPressure: 17.0, maxOperatingPressure: '17.00 Kgf/cm²', equipmentType: 'CASCO',
    vesselPurpose: 'Armazenar liquido', vesselType: 'AÉREO HORIZONTAL', outerDiameter: '450 mm', length: '1500 mm',
    tareWeight: '200 kgf', bodyThickness: '9.70 mm', headThickness: '11.40 mm', headType: 'SEMI-ELIPTICA',
    height: '1200 mm', width: '700 mm', minBodyThickness: '9.50 mm', minHeadThickness: '10.50 mm',
    local: 'Camaras Frias', area: 'Sala de máquinas', designTemperature: '150°C', operatingTemperature: '35°C',
    material: 'Aço carbono', installationConfig: 'HORIZONTAL',
    fluidClass: 'C', pvProduct: 0.8636, riskGroup: 'Grupo 5 (Categoria V)', category: 'V',
    linkedValveTag: 'PSV-15 / PSV-16',
    linkedValveSpecs: {
      tag: 'PSV-15 / PSV-16', manufacturer: 'Valvugás', model: 'Angular', connectionSize: '1/2"',
      fluidType: 'R-22', setPressure: '19.0 kgf/cm²', openingPressure: '19.0 kgf/cm²',
      reseatPressure: '17.4 / 17.0 kgf/cm²', certificateNumber: 'IE-165-24 / IE-166-24',
      calibrationDate: '2024-11-14', nextCalibrationDate: '2025-11-14'
    },
    notes: 'Relatório de referência nº 509.'
  }),
  buildVessel({
    id: 'vessel_bu_vp09', farm: 'Brasil Uvas', assetType: 'VP',
    vesselNumber: 'VP-09', equipmentTag: 'VP-09 - Reservatório de Ar Schulz (Oficina)',
    sector: 'Oficina / Fazenda', manufacturer: 'Schulz', model: 'Horizontal',
    serialNumber: 'C-046647', manufactureYear: '1998', projectCode: 'ASME, SEC VIII, DIV 1', designCodeEdition: '1995',
    volumeM3: 0.221, serviceFluid: 'Ar comprimido', fluidGroup: 'Grupo 2', pmta: 13.5, pth: '20.20 Kgf/cm²',
    normalOperatingPressure: 8.5, maxOperatingPressure: '8.50 Kgf/cm²', equipmentType: 'CASCO',
    vesselPurpose: 'Acumular ar', vesselType: 'AÉREO HORIZONTAL', outerDiameter: '480 mm', length: '1200 mm',
    tareWeight: '40 kgf', bodyThickness: '5.00 mm', headThickness: '5.00 mm', headType: 'SEMI-ELIPTICA',
    height: '800 mm', width: '500 mm', minBodyThickness: '4.50 mm', minHeadThickness: '4.50 mm',
    local: 'Oficina', area: 'Fazenda', designTemperature: '150°C', operatingTemperature: '35°C',
    material: 'Aço carbono', installationConfig: 'HORIZONTAL',
    fluidClass: 'C', pvProduct: 0.2926, riskGroup: 'Grupo 5 (Categoria V)', category: 'V',
    linkedValveTag: 'PSV-17',
    linkedValveSpecs: {
      tag: 'PSV-17', manufacturer: 'Não Informado', model: 'Argola', connectionSize: '1/4"',
      fluidType: 'Ar comprimido', setPressure: '9.4 kgf/cm²', openingPressure: '9.4 kgf/cm²',
      reseatPressure: '7.0 kgf/cm²', certificateNumber: 'IE-168-24',
      calibrationDate: '2024-11-18', nextCalibrationDate: '2025-11-18'
    },
    notes: 'Relatório de referência nº 510.'
  }),
  buildVessel({
    id: 'vessel_bu_vp10', farm: 'Brasil Uvas', assetType: 'VP',
    vesselNumber: 'VP-10', equipmentTag: 'VP-10 - Reservatório de Ar Chiaperini RCH 425 L',
    sector: 'Packing / Sala de Máquinas', manufacturer: 'Chiaperini', model: 'RCH 425 L',
    serialNumber: '10.269-12', manufactureYear: '2012', projectCode: 'ASME, SEC VIII, DIV 1', designCodeEdition: '2010',
    volumeM3: 0.425, serviceFluid: 'Ar comprimido', fluidGroup: 'Grupo 2', pmta: 13.4, pth: '20.00 Kgf/cm²',
    normalOperatingPressure: 9.0, maxOperatingPressure: '9.00 Kgf/cm²', equipmentType: 'CASCO',
    vesselPurpose: 'Acumular ar', vesselType: 'AÉREO HORIZONTAL', outerDiameter: '560 mm', length: '1700 mm',
    tareWeight: '70 kgf', bodyThickness: '5.00 mm', headThickness: '5.00 mm', headType: 'SEMI-ELIPTICA',
    height: '1000 mm', width: '600 mm', minBodyThickness: '4.50 mm', minHeadThickness: '4.50 mm',
    local: 'Packing', area: 'Sala de maquinas', designTemperature: '150°C', operatingTemperature: '35°C',
    material: 'Aço carbono', installationConfig: 'HORIZONTAL',
    fluidClass: 'C', pvProduct: 0.5585, riskGroup: 'Grupo 5 (Categoria V)', category: 'V',
    linkedValveTag: 'PSV-18 / PSV-19',
    linkedValveSpecs: {
      tag: 'PSV-18 / PSV-19', manufacturer: 'Não Informado', model: 'Argola', connectionSize: '1/4"',
      fluidType: 'Ar comprimido', setPressure: '12.2 / 12.8 kgf/cm²', openingPressure: '12.2 / 12.8 kgf/cm²',
      reseatPressure: '8.0 / 7.2 kgf/cm²', certificateNumber: 'IE-170-24 / IE-172-24',
      calibrationDate: '2024-11-19', nextCalibrationDate: '2025-11-19'
    },
    notes: 'Relatório de referência nº 511.'
  }),
  buildVessel({
    id: 'vessel_bu_vp11', farm: 'Brasil Uvas', assetType: 'VP',
    vesselNumber: 'VP-11', equipmentTag: 'VP-11 - Reservatório de Ar Pressure (Oficina)',
    sector: 'Fazenda / Oficina', manufacturer: 'Pressure', model: 'Horizontal',
    serialNumber: 'KB20082895', manufactureYear: '2020', projectCode: 'ASME, SEC VIII, DIV 1', designCodeEdition: '2019',
    volumeM3: 0.05, serviceFluid: 'Ar comprimido', fluidGroup: 'Grupo 2', pmta: 9.1, pth: '11.83 Kgf/cm²',
    normalOperatingPressure: 8.0, maxOperatingPressure: '8.00 Kgf/cm²', equipmentType: 'CASCO',
    vesselPurpose: 'Acumular ar', vesselType: 'AÉREO HORIZONTAL', outerDiameter: '280 mm', length: '900 mm',
    tareWeight: '15 kgf', bodyThickness: '3.20 mm', headThickness: '3.20 mm', headType: 'TORIESFÉRICA',
    height: '700 mm', width: '300 mm', minBodyThickness: '3.00 mm', minHeadThickness: '3.00 mm',
    local: 'Fazenda', area: 'Oficina', designTemperature: '150°C', operatingTemperature: '35°C',
    material: 'ASTM 414', installationConfig: 'HORIZONTAL',
    fluidClass: 'C', pvProduct: 0.0446, riskGroup: 'Grupo 5 (Categoria V)', category: 'V',
    linkedValveTag: 'PSV-20',
    linkedValveSpecs: {
      tag: 'PSV-20', manufacturer: 'Não Informado', model: 'Argola', connectionSize: '1/4"',
      fluidType: 'Ar comprimido', setPressure: '9.0 kgf/cm²', openingPressure: '9.0 kgf/cm²',
      reseatPressure: '7.0 kgf/cm²', certificateNumber: 'IE-173-24',
      calibrationDate: '2024-11-19', nextCalibrationDate: '2025-11-19'
    },
    notes: 'Relatório de referência nº 512.'
  }),

  // =========================================================================
  // FAZENDA LABRUNIER 1 (3 CPs + 5 VPs)
  // =========================================================================
  buildVessel({
    id: 'vessel_l1_cp04', farm: 'Labrunier 1', assetType: 'CP',
    vesselNumber: 'CP-04 (VP-04)', equipmentTag: 'CP-04 (VP-04) - Separador de Óleo York',
    sector: 'Packing House / Sala de Máquinas', manufacturer: 'York International', model: 'Vertical',
    serialNumber: '4307', manufactureYear: '2002', projectCode: 'ASME VIII, DIV 1', designCodeEdition: '1998',
    volumeM3: 0.04, serviceFluid: 'Amônia', fluidGroup: 'Grupo 1', pmta: 18.0, pth: '25.00 Kgf/cm²',
    normalOperatingPressure: 13.0, maxOperatingPressure: '13.00 Kgf/cm²', equipmentType: 'CASCO',
    vesselPurpose: 'Separar óleo', vesselType: 'AÉREO VERTICAL', outerDiameter: '320 mm', length: '530 mm',
    tareWeight: '30 kgf', bodyThickness: '10.60 mm', headThickness: '38.00 mm', headType: 'PLANA',
    height: '600 mm', width: '500 mm', minBodyThickness: '9.00 mm', minHeadThickness: '36.00 mm',
    local: 'Packing House', area: 'Sala de Maquinas', designTemperature: '200°C', operatingTemperature: '80°C',
    material: 'ASTM 516 GR 60', installationConfig: 'VERTICAL',
    fluidClass: 'A', pvProduct: 0.0706, riskGroup: 'Grupo 5 (Categoria III)', category: 'III',
    notes: 'Relatório de referência nº 496 (ID do laudo: VP-04).'
  }),
  buildVessel({
    id: 'vessel_l1_cp05', farm: 'Labrunier 1', assetType: 'CP',
    vesselNumber: 'CP-05 (VP-05)', equipmentTag: 'CP-05 (VP-05) - Separador de Óleo Sabroe',
    sector: 'Packing House / Sala de Máquinas', manufacturer: 'Sabroe do Brasil', model: 'Vertical',
    serialNumber: '104798', manufactureYear: '1993', projectCode: 'ASME VIII, DIV 1', designCodeEdition: '1998',
    volumeM3: 0.04, serviceFluid: 'Amônia', fluidGroup: 'Grupo 1', pmta: 18.0, pth: '22.00 Kgf/cm²',
    normalOperatingPressure: 13.0, maxOperatingPressure: '13.00 Kgf/cm²', equipmentType: 'CASCO',
    vesselPurpose: 'Separar óleo', vesselType: 'AÉREO VERTICAL', outerDiameter: '320 mm', length: '530 mm',
    tareWeight: '30 kgf', bodyThickness: '6.50 mm', headThickness: '38.00 mm', headType: 'PLANA',
    height: '600 mm', width: '500 mm', minBodyThickness: '6.50 mm', minHeadThickness: '30.00 mm',
    local: 'Packing House', area: 'Sala de Maquinas', designTemperature: '200°C', operatingTemperature: '80°C',
    material: 'ASTM 516 GR 60', installationConfig: 'VERTICAL',
    fluidClass: 'A', pvProduct: 0.0706, riskGroup: 'Grupo 5 (Categoria III)', category: 'III',
    notes: 'Relatório de referência nº 497 (ID do laudo: VP-05).'
  }),
  buildVessel({
    id: 'vessel_l1_cp06', farm: 'Labrunier 1', assetType: 'CP',
    vesselNumber: 'CP-06 (VP-06)', equipmentTag: 'CP-06 (VP-06) - Separador de Óleo Sabroe',
    sector: 'Packing House / Sala de Máquinas', manufacturer: 'Sabroe do Brasil', model: 'Vertical',
    serialNumber: '104799', manufactureYear: '1993', projectCode: 'ASME VIII, DIV 1', designCodeEdition: '1990',
    volumeM3: 0.04, serviceFluid: 'Amônia', fluidGroup: 'Grupo 1', pmta: 18.0, pth: '22.00 Kgf/cm²',
    normalOperatingPressure: 13.0, maxOperatingPressure: '13.00 Kgf/cm²', equipmentType: 'CASCO',
    vesselPurpose: 'Separar óleo', vesselType: 'AÉREO VERTICAL', outerDiameter: '320 mm', length: '530 mm',
    tareWeight: '30 kgf', bodyThickness: '6.70 mm', headThickness: '38.00 mm', headType: 'PLANA',
    height: '600 mm', width: '500 mm', minBodyThickness: '6.50 mm', minHeadThickness: '30.00 mm',
    local: 'Packing House', area: 'Sala de Maquinas', designTemperature: '200°C', operatingTemperature: '80°C',
    material: 'ASTM 516 GR 60', installationConfig: 'VERTICAL',
    fluidClass: 'A', pvProduct: 0.0706, riskGroup: 'Grupo 5 (Categoria III)', category: 'III',
    notes: 'Relatório de referência nº 498 (ID do laudo: VP-06).'
  }),
  buildVessel({
    id: 'vessel_l1_vp01', farm: 'Labrunier 1', assetType: 'VP',
    vesselNumber: 'VP-01', equipmentTag: 'VP-01 - Acumulador de Amônia York RHER 7127',
    sector: 'Packing House / Sala de Máquinas', manufacturer: 'York International', model: 'RHER 7127',
    serialNumber: '362454', manufactureYear: '2001', projectCode: 'ASME VIII, DIV 1', designCodeEdition: '1998',
    volumeM3: 1.10, serviceFluid: 'Amônia', fluidGroup: 'Grupo 1', pmta: 16.0, pth: '22.00 Kgf/cm²',
    normalOperatingPressure: 13.0, maxOperatingPressure: '13.00 Kgf/cm²', equipmentType: 'CASCO',
    vesselPurpose: 'Acumular Amônia', vesselType: 'AÉREO HORIZONTAL', outerDiameter: '700 mm', length: '3000 mm',
    tareWeight: '300 kgf', bodyThickness: '13.10 mm', headThickness: '12.40 mm', headType: 'SEMI-ELIPTICA',
    height: '800 mm', width: '800 mm', minBodyThickness: '12.00 mm', minHeadThickness: '11.50 mm',
    local: 'Packing House', area: 'Sala de Maquinas', designTemperature: '200°C', operatingTemperature: '35°C',
    material: 'ASTM 516 GR 60', installationConfig: 'HORIZONTAL',
    fluidClass: 'A', pvProduct: 1.7260, riskGroup: 'Grupo 4 (Categoria III)', category: 'III',
    notes: 'Relatório de referência nº 500 • Anexos PSV Danfoss SFA15 (Part No 148F3216, 16 bar g, séries 962715-962768 e 969563-969642).'
  }),
  buildVessel({
    id: 'vessel_l1_vp02', farm: 'Labrunier 1', assetType: 'VP',
    vesselNumber: 'VP-02', equipmentTag: 'VP-02 - Separador Amônia e Óleo Mebrafe SL-900-2',
    sector: 'Packing House / Sala de Máquinas', manufacturer: 'Mebrafe', model: 'SL-900-2',
    serialNumber: '1531', manufactureYear: '2002', projectCode: 'ASME VIII, DIV 1', designCodeEdition: '1998',
    volumeM3: 1.20, serviceFluid: 'Amônia', fluidGroup: 'Grupo 1', pmta: 17.0, pth: '25.00 Kgf/cm²',
    normalOperatingPressure: 5.0, maxOperatingPressure: '5.00 Kgf/cm²', equipmentType: 'CASCO',
    vesselPurpose: 'Separar Amônia e óleo', vesselType: 'AÉREO HORIZONTAL', outerDiameter: '900 mm', length: '2000 mm',
    tareWeight: '1210 kgf', bodyThickness: '12.70 mm', headThickness: '12.50 mm', headType: 'SEMI-ELIPTICA',
    height: '3000 mm', width: '1000 mm', minBodyThickness: '12.00 mm', minHeadThickness: '12.00 mm',
    local: 'Packing House', area: 'Sala de Maquinas', designTemperature: '200°C', operatingTemperature: '35°C',
    material: 'ASTM 516 GR 60', installationConfig: 'HORIZONTAL',
    fluidClass: 'A', pvProduct: 2.0006, riskGroup: 'Grupo 4 (Categoria III)', category: 'III',
    linkedValveTag: 'PSV-SL-01 / PSV-SL-02',
    linkedValveSpecs: {
      tag: 'PSV-SL-01 / PSV-SL-02', manufacturer: 'EICA', model: 'VSA F-13', connectionSize: '1/2"',
      fluidType: 'Amônia', setPressure: '15.0 kgf/cm²', openingPressure: '15.0 kgf/cm²',
      reseatPressure: '13.0 / 13.5 kgf/cm²', certificateNumber: 'IE-155-24-L1 / IE-156-24-L1',
      calibrationDate: '2024-11-26', nextCalibrationDate: '2025-11-26'
    },
    notes: 'Relatório de referência nº 501.'
  }),
  buildVessel({
    id: 'vessel_l1_vp03', farm: 'Labrunier 1', assetType: 'VP',
    vesselNumber: 'VP-03', equipmentTag: 'VP-03 - Reservatório de Ar Chiaperini RCH 200L AP',
    sector: 'Packing House / Oficina', manufacturer: 'Chiaperini', model: 'RCH 200L AP',
    serialNumber: '3279', manufactureYear: '2006', projectCode: 'ASME VIII, DIV 1', designCodeEdition: '2002',
    volumeM3: 0.20, serviceFluid: 'Ar comprimido', fluidGroup: 'Grupo 2', pmta: 12.3, pth: '18.40 Kgf/cm²',
    normalOperatingPressure: 10.0, maxOperatingPressure: '10.00 Kgf/cm²', equipmentType: 'CASCO',
    vesselPurpose: 'Acumular Ar', vesselType: 'AÉREO HORIZONTAL', outerDiameter: '460 mm', length: '1200 mm',
    tareWeight: '60 kgf', bodyThickness: '4.90 mm', headThickness: '4.90 mm', headType: 'SEMI-ELIPTICA',
    height: '800 mm', width: '500 mm', minBodyThickness: '4.40 mm', minHeadThickness: '4.40 mm',
    local: 'Packing House', area: 'Oficina', designTemperature: '150°C', operatingTemperature: '35°C',
    material: 'Aço carbono', installationConfig: 'HORIZONTAL',
    fluidClass: 'C', pvProduct: 0.2412, riskGroup: 'Grupo 5 (Categoria V)', category: 'V',
    linkedValveTag: 'PSV-01',
    linkedValveSpecs: {
      tag: 'PSV-01', manufacturer: 'Não Informado', model: 'Argola', connectionSize: '1/4"',
      fluidType: 'Ar comprimido', setPressure: '11.0 kgf/cm²', openingPressure: '11.0 kgf/cm²',
      reseatPressure: '7.0 kgf/cm²', certificateNumber: 'IE-157-2024',
      calibrationDate: '2024-11-27', nextCalibrationDate: '2025-11-27'
    },
    notes: 'Relatório de referência nº 495.'
  }),
  buildVessel({
    id: 'vessel_l1_vp07', farm: 'Labrunier 1', assetType: 'VP',
    vesselNumber: 'VP-07', equipmentTag: 'VP-07 - Reservatório de Ar Schulz (Amarelo Oficina)',
    sector: 'Packing House / Oficina', manufacturer: 'Schulz', model: 'Horizontal',
    serialNumber: '285', manufactureYear: '2008', projectCode: 'ASME VIII, DIV 1', designCodeEdition: '2002',
    volumeM3: 0.183, serviceFluid: 'Ar comprimido', fluidGroup: 'Grupo 2', pmta: 10.3, pth: '15.50 Kgf/cm²',
    normalOperatingPressure: 8.0, maxOperatingPressure: '8.00 Kgf/cm²', equipmentType: 'CASCO',
    vesselPurpose: 'Acumular Ar', vesselType: 'AÉREO HORIZONTAL', outerDiameter: '430 mm', length: '1200 mm',
    tareWeight: '60 kgf', bodyThickness: '3.10 mm', headThickness: '2.80 mm', headType: 'SEMI-ELIPTICA',
    height: '800 mm', width: '500 mm', minBodyThickness: '2.80 mm', minHeadThickness: '2.80 mm',
    local: 'Packing House', area: 'Oficina', designTemperature: '150°C', operatingTemperature: '35°C',
    material: 'Aço carbono', installationConfig: 'HORIZONTAL',
    fluidClass: 'C', pvProduct: 0.1848, riskGroup: 'Grupo 5 (Categoria V)', category: 'V',
    notes: 'Relatório de referência nº 499 (ID Interno: Vaso amarelo de ar oficina).'
  }),
  buildVessel({
    id: 'vessel_l1_vp08', farm: 'Labrunier 1', assetType: 'VP',
    vesselNumber: 'VP-08', equipmentTag: 'VP-08 - Reservatório de Ar Schulz Twister CSL 20/200',
    sector: 'Packing House / Oficina', manufacturer: 'Schulz', model: 'Twister CSL 20/200 - 5 hp',
    serialNumber: '11307', manufactureYear: '-', projectCode: 'ASME VIII, DIV 1', designCodeEdition: '-',
    volumeM3: 0.20, serviceFluid: 'Ar comprimido', fluidGroup: 'Grupo 2', pmta: 10.3, pth: '15.50 Kgf/cm²',
    normalOperatingPressure: 8.0, maxOperatingPressure: '8.00 Kgf/cm²', equipmentType: 'CASCO',
    vesselPurpose: 'Acumular Ar', vesselType: 'AÉREO HORIZONTAL', outerDiameter: '-', length: '-',
    tareWeight: '-', bodyThickness: '-', headThickness: '-', headType: 'SEMI-ELIPTICA',
    height: '-', width: '-', minBodyThickness: '-', minHeadThickness: '-',
    local: 'Packing House', area: 'Oficina', designTemperature: '150°C', operatingTemperature: '35°C',
    material: 'Aço carbono', installationConfig: 'HORIZONTAL',
    fluidClass: 'C', pvProduct: 0.2020, riskGroup: 'Grupo 5 (Categoria V)', category: 'V',
    notes: 'ART BA20240977467 identifica VP08(11307) e registro fotográfico Schulz Twister CSL 20/200.'
  }),

  // =========================================================================
  // FAZENDA LABRUNIER 2 (4 VASOS DE PRESSÃO)
  // =========================================================================
  buildVessel({
    id: 'vessel_l2_vp01', farm: 'Labrunier 2', assetType: 'VP',
    vesselNumber: 'VP-01 (Sala Maquinas)', equipmentTag: 'VP-01 - Reservatório de Ar Chiaperini RCH 425L',
    sector: 'Packing / Sala de Máquinas', manufacturer: 'Chiaperini', model: 'RCH 425L',
    serialNumber: '3369 09', manufactureYear: '2006', projectCode: 'ASME, VIII, DIV 1', designCodeEdition: '2005',
    volumeM3: 0.425, serviceFluid: 'Ar comprimido', fluidGroup: 'Grupo 2', pmta: 12.3, pth: '18.00 Kgf/cm²',
    normalOperatingPressure: 9.0, maxOperatingPressure: '9.00 Kgf/cm²', equipmentType: 'CASCO',
    vesselPurpose: 'Armazenar Ar', vesselType: 'AÉREO HORIZONTAL', outerDiameter: '550 mm', length: '1700 mm',
    tareWeight: '120 kgf', bodyThickness: '5.00 mm', headThickness: '5.00 mm', headType: 'SEMI-ELIPTICA',
    height: '1200 mm', width: '600 mm', minBodyThickness: '4.80 mm', minHeadThickness: '4.80 mm',
    local: 'Packing', area: 'Sala de maquinas', designTemperature: '150°C', operatingTemperature: '35°C',
    material: 'Aço carbono', installationConfig: 'HORIZONTAL',
    fluidClass: 'C', pvProduct: 0.5126, riskGroup: 'Grupo 5 (Categoria V)', category: 'V',
    linkedValveTag: 'PSV-21 / PSV-22',
    linkedValveSpecs: {
      tag: 'PSV-21 / PSV-22', manufacturer: 'Lubefer', model: 'Argola', connectionSize: '1/4"',
      fluidType: 'Ar comprimido', setPressure: '12.2 / 12.3 kgf/cm²', openingPressure: '12.2 / 12.3 kgf/cm²',
      reseatPressure: '6.0 kgf/cm²', certificateNumber: 'IE-174-24 / IE-175-24',
      calibrationDate: '2024-11-21', nextCalibrationDate: '2025-11-21'
    },
    notes: 'Relatório de referência nº 513.'
  }),
  buildVessel({
    id: 'vessel_l2_vp02', farm: 'Labrunier 2', assetType: 'VP',
    vesselNumber: 'VP-02 (Oficina)', equipmentTag: 'VP-02 - Reservatório de Ar Chiaperini RCH 110L',
    sector: 'Fazenda / Oficina', manufacturer: 'Chiaperini', model: 'RCH 110L',
    serialNumber: '062052', manufactureYear: '2023', projectCode: 'ASME, VIII, DIV 1', designCodeEdition: '2021',
    volumeM3: 0.11, serviceFluid: 'Ar comprimido', fluidGroup: 'Grupo 2', pmta: 10.6, pth: '15.00 Kgf/cm²',
    normalOperatingPressure: 9.0, maxOperatingPressure: '9.00 Kgf/cm²', equipmentType: 'CASCO',
    vesselPurpose: 'Armazenar Ar', vesselType: 'AÉREO HORIZONTAL', outerDiameter: '400 mm', length: '900 mm',
    tareWeight: '50 kgf', bodyThickness: '3.20 mm', headThickness: '3.20 mm', headType: 'SEMI-ELIPTICA',
    height: '1000 mm', width: '500 mm', minBodyThickness: '3.00 mm', minHeadThickness: '3.00 mm',
    local: 'Fazenda', area: 'Oficina', designTemperature: '150°C', operatingTemperature: '35°C',
    material: 'Aço carbono', installationConfig: 'HORIZONTAL',
    fluidClass: 'C', pvProduct: 0.1143, riskGroup: 'Grupo 5 (Categoria V)', category: 'V',
    linkedValveTag: 'PSV-23',
    linkedValveSpecs: {
      tag: 'PSV-23', manufacturer: 'Lubefer', model: 'Argola', connectionSize: '1/4"',
      fluidType: 'Ar comprimido', setPressure: '10.5 kgf/cm²', openingPressure: '10.5 kgf/cm²',
      reseatPressure: '7.0 kgf/cm²', certificateNumber: 'IE-177-24',
      calibrationDate: '2024-11-21', nextCalibrationDate: '2025-11-21'
    },
    notes: 'Relatório de referência nº 514.'
  }),
  buildVessel({
    id: 'vessel_l2_vp03', farm: 'Labrunier 2', assetType: 'VP',
    vesselNumber: 'VP-03 (Recip Liquido)', equipmentTag: 'VP-03 - Recipiente de Líquido Amônia Frost Frio DL3',
    sector: 'Packing / Sala de Máquinas', manufacturer: 'Frost Frio SA', model: 'DL3',
    serialNumber: '701448', manufactureYear: '2024', projectCode: 'ASME, VIII, DIV 1', designCodeEdition: '2023',
    volumeM3: 0.07, serviceFluid: 'Amônia', fluidGroup: 'Grupo 1', pmta: 16.0, pth: '20.00 Kgf/cm²',
    normalOperatingPressure: 12.5, maxOperatingPressure: '12.50 Kgf/cm²', equipmentType: 'CASCO',
    vesselPurpose: 'Armazenar Amônia', vesselType: 'AÉREO HORIZONTAL', outerDiameter: '600 mm', length: '3600 mm',
    tareWeight: '500 kgf', bodyThickness: '6.35 mm', headThickness: '6.35 mm', headType: 'SEMI-ELIPTICA',
    height: '1000 mm', width: '600 mm', minBodyThickness: '5.50 mm', minHeadThickness: '5.50 mm',
    local: 'Packing', area: 'Sala de maquinas', designTemperature: '-10 a 120°C', operatingTemperature: '35°C',
    material: 'ASTM 516 Gr 70', installationConfig: 'HORIZONTAL',
    fluidClass: 'A', pvProduct: 0.1098, riskGroup: 'Grupo 5 (Categoria III)', category: 'III',
    notes: 'Relatório de referência nº 515.'
  }),
  buildVessel({
    id: 'vessel_l2_vp05', farm: 'Labrunier 2', assetType: 'VP',
    vesselNumber: 'VP-05 / VP-04 (Sep. Liquido)', equipmentTag: 'VP-05 (VP-04) - Separador de Líquido Amônia Frost Frio SCLH-4',
    sector: 'Packing / Sala de Máquinas', manufacturer: 'Frost Frio SA', model: 'SCLH-4',
    serialNumber: '701446', manufactureYear: '2024', projectCode: 'ASME, VIII, DIV 1', designCodeEdition: '2023',
    volumeM3: 1.17, serviceFluid: 'Amônia', fluidGroup: 'Grupo 1', pmta: 16.0, pth: '20.80 Kgf/cm²',
    normalOperatingPressure: 5.0, maxOperatingPressure: '5.00 Kgf/cm²', equipmentType: 'CASCO',
    vesselPurpose: 'Armazenar Amônia', vesselType: 'AÉREO HORIZONTAL', outerDiameter: '750 mm', length: '2400 mm',
    tareWeight: '897 kgf', bodyThickness: '8.00 mm', headThickness: '8.00 mm', headType: 'SEMI-ELIPTICA',
    height: '1000 mm', width: '800 mm', minBodyThickness: '7.60 mm', minHeadThickness: '7.60 mm',
    local: 'Packing', area: 'Sala de maquinas', designTemperature: '-10 a 120°C', operatingTemperature: '35°C',
    material: 'ASTM 516 Gr 70', installationConfig: 'HORIZONTAL',
    fluidClass: 'A', pvProduct: 1.8358, riskGroup: 'Grupo 4 (Categoria III)', category: 'III',
    notes: 'Relatório de referência nº 516 (ART PE20241259542 lista como VP05 NS 701446; arquivo VP 04).'
  }),

  // =========================================================================
  // FAZENDA VALE DAS UVAS (4 CPs + 5 VPs)
  // =========================================================================
  buildVessel({
    id: 'vessel_vu_cp02', farm: 'Vale das Uvas', assetType: 'CP',
    vesselNumber: 'CP-02 (VP-09)', equipmentTag: 'CP-02 (VP-09) - Separador de Óleo Sabroe OVUR 2106 D',
    sector: 'Packing House / Sala de Máquinas', manufacturer: 'Sabroe do Brasil', model: 'OVUR 2106 D',
    serialNumber: 'SO 1952', manufactureYear: '1996', projectCode: 'ASME VIII, DIV 1', designCodeEdition: '1998',
    volumeM3: 0.02, serviceFluid: 'Amônia', fluidGroup: 'Grupo 1', pmta: 18.0, pmtaUnit: 'Bar', pth: '22.50 Bar',
    normalOperatingPressure: 13.0, maxOperatingPressure: '13.00 Bar', equipmentType: 'CASCO',
    vesselPurpose: 'Separar óleo', vesselType: 'AÉREO VERTICAL', outerDiameter: '200 mm', length: '500 mm',
    tareWeight: '30 kgf', bodyThickness: '9.50 mm', headThickness: '25.00 mm', headType: 'PLANA',
    height: '600 mm', width: '300 mm', minBodyThickness: '8.50 mm', minHeadThickness: '24.00 mm',
    local: 'Packing House', area: 'Sala de Máquinas', designTemperature: '200°C', operatingTemperature: '80°C',
    material: 'ASTM 516 GR 60', installationConfig: 'VERTICAL',
    fluidClass: 'A', pvProduct: 0.0360, riskGroup: 'Grupo 5 (Categoria III)', category: 'III',
    notes: 'Relatório de referência nº 485 (ID do laudo: VP 09 / Separador de óleo comp 2).'
  }),
  buildVessel({
    id: 'vessel_vu_cp03', farm: 'Vale das Uvas', assetType: 'CP',
    vesselNumber: 'CP-03 (VP-04)', equipmentTag: 'CP-03 (VP-04) - Separador de Óleo York OVUR 3206 D',
    sector: 'Packing House / Sala de Máquinas', manufacturer: 'York International', model: 'OVUR 3206 D',
    serialNumber: '362453', manufactureYear: '2001', projectCode: 'ASME VIII, DIV 1', designCodeEdition: '1998',
    volumeM3: 0.045, serviceFluid: 'Amônia', fluidGroup: 'Grupo 1', pmta: 18.0, pmtaUnit: 'Bar', pth: '20.00 Bar',
    normalOperatingPressure: 13.0, maxOperatingPressure: '13.00 Bar', equipmentType: 'CASCO',
    vesselPurpose: 'Separar óleo', vesselType: 'AÉREO VERTICAL', outerDiameter: '320 mm', length: '560 mm',
    tareWeight: '40 kgf', bodyThickness: '9.10 mm', headThickness: '38.10 mm', headType: 'PLANA',
    height: '800 mm', width: '400 mm', minBodyThickness: '8.50 mm', minHeadThickness: '37.00 mm',
    local: 'Packing House', area: 'Sala de Máquinas', designTemperature: '200°C', operatingTemperature: '80°C',
    material: 'ASTM 516 GR 60', installationConfig: 'VERTICAL',
    fluidClass: 'A', pvProduct: 0.0810, riskGroup: 'Grupo 5 (Categoria III)', category: 'III',
    notes: 'Relatório de referência nº 483 (ID do laudo: VP 04 / Compressor 03).'
  }),
  buildVessel({
    id: 'vessel_vu_cp04', farm: 'Vale das Uvas', assetType: 'CP',
    vesselNumber: 'CP-04 (VP-05)', equipmentTag: 'CP-04 (VP-05) - Separador de Óleo York OVUR 3206 D',
    sector: 'Packing House / Sala de Máquinas', manufacturer: 'York International', model: 'OVUR 3206 D',
    serialNumber: 'SO 3883', manufactureYear: '2001', projectCode: 'ASME VIII, DIV 1', designCodeEdition: '1998',
    volumeM3: 0.039, serviceFluid: 'Amônia', fluidGroup: 'Grupo 1', pmta: 18.0, pmtaUnit: 'Bar', pth: '20.00 Bar',
    normalOperatingPressure: 13.0, maxOperatingPressure: '13.00 Bar', equipmentType: 'CASCO',
    vesselPurpose: 'Separar óleo', vesselType: 'AÉREO VERTICAL', outerDiameter: '320 mm', length: '560 mm',
    tareWeight: '40 kgf', bodyThickness: '10.10 mm', headThickness: '37.80 mm', headType: 'PLANA',
    height: '800 mm', width: '400 mm', minBodyThickness: '8.50 mm', minHeadThickness: '37.00 mm',
    local: 'Packing House', area: 'Sala de Máquinas', designTemperature: '200°C', operatingTemperature: '80°C',
    material: 'ASTM 516 GR 60', installationConfig: 'VERTICAL',
    fluidClass: 'A', pvProduct: 0.0702, riskGroup: 'Grupo 5 (Categoria III)', category: 'III',
    notes: 'Relatório de referência nº 484 (ID do laudo: VP 05 / Compressor 04).'
  }),
  buildVessel({
    id: 'vessel_vu_cp05', farm: 'Vale das Uvas', assetType: 'CP',
    vesselNumber: 'CP-05 (Compressor nº 5)', equipmentTag: 'CP-05 - Compressor nº 5 (Válvula PSV-C5-01)',
    sector: 'Sala de Máquinas', manufacturer: 'A confirmar', model: 'Compressor nº 5',
    serialNumber: '-', manufactureYear: '-', projectCode: 'ASME VIII, DIV 1', designCodeEdition: '-',
    volumeM3: 0.04, serviceFluid: 'Amônia', fluidGroup: 'Grupo 1', pmta: 20.5, pth: '-',
    normalOperatingPressure: 13.0, maxOperatingPressure: '13.00 Kgf/cm²', equipmentType: 'COMPRESSOR / SEPARADOR',
    vesselPurpose: 'Sistema de refrigeração Amônia', vesselType: 'AÉREO VERTICAL', outerDiameter: '-', length: '-',
    tareWeight: '-', bodyThickness: '-', headThickness: '-', headType: 'PLANA',
    height: '-', width: '-', minBodyThickness: '-', minHeadThickness: '-',
    local: 'Packing House', area: 'Sala de Máquinas', designTemperature: '200°C', operatingTemperature: '80°C',
    material: 'Aço Carbono', installationConfig: 'VERTICAL',
    fluidClass: 'A', pvProduct: 0.0804, riskGroup: 'Grupo 5 (Categoria III)', category: 'III',
    linkedValveTag: 'PSV-C5-01',
    linkedValveSpecs: {
      tag: 'PSV-C5-01', manufacturer: 'Não Informado', model: 'Angular', connectionSize: '3/4"',
      fluidType: 'Amônia', setPressure: '20.5 kgf/cm²', openingPressure: '20.5 kgf/cm²',
      reseatPressure: '18.0 kgf/cm²', certificateNumber: 'IE-085-25',
      calibrationDate: '2025-05-21', nextCalibrationDate: '2026-05-21'
    },
    notes: 'Cadastrado com base no Certificado de Válvula IE-085-25 (Compressor nº 5).'
  }),
  buildVessel({
    id: 'vessel_vu_vp02', farm: 'Vale das Uvas', assetType: 'VP',
    vesselNumber: 'VP-02', equipmentTag: 'VP-02 - Separador de Líquidos York PVER 8121',
    sector: 'Packing House / Sala de Máquinas', manufacturer: 'York International', model: 'PVER 8121',
    serialNumber: '362453', manufactureYear: '2001', projectCode: 'ASME VIII, DIV 1', designCodeEdition: '1998',
    volumeM3: 1.20, serviceFluid: 'Amônia', fluidGroup: 'Grupo 1', pmta: 18.0, pmtaUnit: 'Bar', pth: '20.00 Bar',
    normalOperatingPressure: 3.0, maxOperatingPressure: '3.00 Bar', equipmentType: 'CASCO',
    vesselPurpose: 'Separar líquidos', vesselType: 'AÉREO VERTICAL', outerDiameter: '810 mm', length: '2100 mm',
    tareWeight: '800 kgf', bodyThickness: '13.40 mm', headThickness: '13.00 mm', headType: 'SEMI-ELIPTICA',
    height: '3000 mm', width: '1400 mm', minBodyThickness: '11.00 mm', minHeadThickness: '12.00 mm',
    local: 'Packing House', area: 'Sala de Máquinas', designTemperature: '200°C', operatingTemperature: '5°C',
    material: 'ASTM 516 GR 60', installationConfig: 'VERTICAL',
    fluidClass: 'A', pvProduct: 2.1600, riskGroup: 'Grupo 4 (Categoria III)', category: 'III',
    linkedValveTag: 'PSV-SL2-01 / PSV-SL2-02',
    linkedValveSpecs: {
      tag: 'PSV-SL2-01 / PSV-SL2-02', manufacturer: 'Danfoss', model: 'VSEG', connectionSize: '3/4 x 1"',
      fluidType: 'Amônia', setPressure: '16.0 bar', openingPressure: '16.0 bar',
      reseatPressure: '14.8 / 15.0 bar', certificateNumber: 'IE-144-24 / IE-142-24',
      calibrationDate: '2024-11-12', nextCalibrationDate: '2025-11-12'
    },
    notes: 'Relatório de referência nº 482.'
  }),
  buildVessel({
    id: 'vessel_vu_vp03', farm: 'Vale das Uvas', assetType: 'VP',
    vesselNumber: 'VP-03', equipmentTag: 'VP-03 - Acumulador de Amônia Mebrafe RL 1100-5',
    sector: 'Packing House / Sala de Máquinas', manufacturer: 'Mebrafe', model: 'RL 1100-5',
    serialNumber: 'VS034/13 - 0088', manufactureYear: '2013', projectCode: 'ASME VIII, DIV 1', designCodeEdition: '2007',
    volumeM3: 4.975, serviceFluid: 'Amônia', fluidGroup: 'Grupo 1', pmta: 17.1, pmtaUnit: 'Bar', pth: '18.00 Bar',
    normalOperatingPressure: 12.5, maxOperatingPressure: '12.50 Bar', equipmentType: 'CASCO',
    vesselPurpose: 'Acumular Amônia', vesselType: 'AÉREO HORIZONTAL', outerDiameter: '1100 mm', length: '5000 mm',
    tareWeight: '2750 kgf', bodyThickness: '16.50 mm', headThickness: '15.20 mm', headType: 'SEMI-ELIPTICA',
    height: '1500 mm', width: '1300 mm', minBodyThickness: '13.50 mm', minHeadThickness: '13.20 mm',
    local: 'Packing House', area: 'Sala de Máquinas', designTemperature: '120°C', operatingTemperature: '35°C',
    material: 'ASTM 516 GR 60', installationConfig: 'HORIZONTAL',
    fluidClass: 'A', pvProduct: 8.5073, riskGroup: 'Grupo 3 (Categoria II)', category: 'II',
    linkedValveTag: 'PSV-RL-01 / PSV-RL-02',
    linkedValveSpecs: {
      tag: 'PSV-RL-01 / PSV-RL-02', manufacturer: 'Valvugás', model: 'VSEG', connectionSize: '1/2 x 1"',
      fluidType: 'Amônia', setPressure: '16.0 bar', openingPressure: '16.0 bar',
      reseatPressure: '15.0 / 15.3 bar', certificateNumber: 'IE-143-24 / IE-141-24',
      calibrationDate: '2024-11-12', nextCalibrationDate: '2025-11-12'
    },
    notes: 'Relatório de referência nº 481.'
  }),
  buildVessel({
    id: 'vessel_vu_vp06', farm: 'Vale das Uvas', assetType: 'VP',
    vesselNumber: 'VP-06', equipmentTag: 'VP-06 - Reservatório de Ar Chiaperini CJ 20 +APV',
    sector: 'Packing House / Sala de Máquinas', manufacturer: 'Chiaperini', model: 'CJ 20 +APV',
    serialNumber: '4822', manufactureYear: '2006', projectCode: 'ASME VIII, DIV 1', designCodeEdition: '2004',
    volumeM3: 0.20, serviceFluid: 'Ar comprimido', fluidGroup: 'Grupo 2', pmta: 12.3, pth: '18.40 Kgf/cm²',
    normalOperatingPressure: 10.0, maxOperatingPressure: '10.00 Kgf/cm²', equipmentType: 'CASCO',
    vesselPurpose: 'Acumular Ar comprimido', vesselType: 'AÉREO HORIZONTAL', outerDiameter: '420 mm', length: '1100 mm',
    tareWeight: '40 kgf', bodyThickness: '4.90 mm', headThickness: '5.00 mm', headType: 'SEMI-ELIPTICA',
    height: '800 mm', width: '600 mm', minBodyThickness: '4.20 mm', minHeadThickness: '4.20 mm',
    local: 'Packing House', area: 'Sala de Máquinas', designTemperature: '150°C', operatingTemperature: '40°C',
    material: 'Aço Carbono', installationConfig: 'HORIZONTAL',
    fluidClass: 'C', pvProduct: 0.2412, riskGroup: 'Grupo 5 (Categoria V)', category: 'V',
    notes: 'Relatório de referência nº 486.'
  }),
  buildVessel({
    id: 'vessel_vu_vp07', farm: 'Vale das Uvas', assetType: 'VP',
    vesselNumber: 'VP-07', equipmentTag: 'VP-07 - Reservatório de Ar Chiaperini RCH 360L',
    sector: 'Packing House / Sala de Máquinas', manufacturer: 'Chiaperini', model: 'RCH 360L',
    serialNumber: '13800/13', manufactureYear: '2013', projectCode: 'ASME VIII, DIV I', designCodeEdition: '2010',
    volumeM3: 0.36, serviceFluid: 'Ar comprimido', fluidGroup: 'Grupo 2', pmta: 13.25, pth: '17.60 Kgf/cm²',
    normalOperatingPressure: 10.0, maxOperatingPressure: '10.00 Kgf/cm²', equipmentType: 'CASCO',
    vesselPurpose: 'Acumular Ar comprimido', vesselType: 'AÉREO HORIZONTAL', outerDiameter: '520 mm', length: '1400 mm',
    tareWeight: '60 kgf', bodyThickness: '4.90 mm', headThickness: '4.70 mm', headType: 'SEMI-ELIPTICA',
    height: '900 mm', width: '600 mm', minBodyThickness: '4.20 mm', minHeadThickness: '4.00 mm',
    local: 'Packing House', area: 'Sala de Máquinas', designTemperature: '150°C', operatingTemperature: '40°C',
    material: 'Aço Carbono', installationConfig: 'HORIZONTAL',
    fluidClass: 'C', pvProduct: 0.4678, riskGroup: 'Grupo 5 (Categoria V)', category: 'V',
    notes: 'Relatório de referência nº 487 (arquivo VP-04 Vale das Uvas / Identificação VP07).'
  }),
  buildVessel({
    id: 'vessel_vu_vp08', farm: 'Vale das Uvas', assetType: 'VP',
    vesselNumber: 'VP-08', equipmentTag: 'VP-08 - Reservatório de Ar Garthen MRM 100 (Oficina)',
    sector: 'Packing House / Oficina Mecânica', manufacturer: 'Garthen Ind. E Com. de Maquinas Ltda', model: 'MRM 100',
    serialNumber: '650011400031', manufactureYear: '2024', projectCode: 'ASME VIII, DIV I', designCodeEdition: '2010',
    volumeM3: 0.10, serviceFluid: 'Ar comprimido', fluidGroup: 'Grupo 2', pmta: 10.0, pth: '13.00 Kgf/cm²',
    normalOperatingPressure: 8.0, maxOperatingPressure: '8.00 Kgf/cm²', equipmentType: 'CASCO',
    vesselPurpose: 'Acumular Ar comprimido', vesselType: 'AÉREO HORIZONTAL', outerDiameter: '400 mm', length: '750 mm',
    tareWeight: '20 kgf', bodyThickness: '3.20 mm', headThickness: '3.20 mm', headType: 'SEMI-ELIPTICA',
    height: '800 mm', width: '600 mm', minBodyThickness: '3.00 mm', minHeadThickness: '3.00 mm',
    local: 'Packing House', area: 'Oficina mecanica', designTemperature: '150°C', operatingTemperature: '40°C',
    material: 'Aço Carbono', installationConfig: 'HORIZONTAL',
    fluidClass: 'C', pvProduct: 0.0981, riskGroup: 'Grupo 5 (Categoria V)', category: 'V',
    linkedValveTag: 'PSV-VO-01',
    linkedValveSpecs: {
      tag: 'PSV-VO-01', manufacturer: 'Não Informado', model: 'Argola', connectionSize: '1/4"',
      fluidType: 'Ar comprimido', setPressure: '145 psi', openingPressure: '145 psi',
      reseatPressure: '100 psi', certificateNumber: 'IE-147-24',
      calibrationDate: '2024-11-12', nextCalibrationDate: '2025-11-12'
    },
    notes: 'Relatório de referência nº 488.'
  })
];

// Mantém a estrutura vazia por padrão para que o usuário gere novos relatórios oficiais puxando a base fixa de VP/CP
export const INITIAL_NR13_REPORTS: NR13InspectionReport[] = [];
