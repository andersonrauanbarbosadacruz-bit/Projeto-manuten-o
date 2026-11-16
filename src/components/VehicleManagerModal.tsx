import React, { useState } from 'react';
import { X, Plus, Trash2, Car, Search, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FARMS, Farm } from '../types';

interface VehicleManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVehicle?: (plate: string, model: string) => void;
}

export const VehicleManagerModal: React.FC<VehicleManagerModalProps> = ({
  isOpen,
  onClose,
  onSelectVehicle
}) => {
  const { vehicles, addVehicle, deleteVehicle, userRole } = useApp();

  const [search, setSearch] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newPlate, setNewPlate] = useState('');
  const [newFarm, setNewFarm] = useState<Farm | ''>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const filtered = vehicles.filter(v => 
    v.plate.toLowerCase().includes(search.toLowerCase()) ||
    v.model.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const plateClean = newPlate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const modelClean = newModel.trim().toUpperCase();

    if (!modelClean) {
      setErrorMsg('Informe o modelo do veículo (ex: ARGO, STRADA, POLO).');
      return;
    }
    if (!plateClean || plateClean.length < 5) {
      setErrorMsg('Informe uma placa válida (ex: TYY7F10).');
      return;
    }

    const exists = vehicles.some(v => v.plate.toUpperCase() === plateClean);
    if (exists) {
      setErrorMsg(`A placa ${plateClean} já está cadastrada no sistema.`);
      return;
    }

    const created = addVehicle({
      model: modelClean,
      plate: plateClean,
      farm: newFarm || undefined
    });

    setSuccessMsg(`Veículo ${created.model} - ${created.plate} cadastrado com sucesso!`);
    setNewPlate('');
    setNewModel('');
    setNewFarm('');

    if (onSelectVehicle) {
      onSelectVehicle(created.plate, created.model);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Cadastro & Gestão de Placas e Veículos</h2>
              <p className="text-xs text-slate-400">
                Lista suspensa da frota com modelos e placas ({vehicles.length} cadastrados)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Admin Registration Form */}
          {userRole === 'ADMIN' && (
            <form onSubmit={handleAdd} className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center">
                  <Plus className="w-4 h-4 mr-1 text-emerald-700" />
                  Cadastrar Novo Veículo na Frota (Acesso Admin)
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Exclusivo Admin
                </span>
              </div>

              {errorMsg && (
                <p className="text-xs text-red-600 font-semibold bg-red-50 p-2 rounded-lg border border-red-200">
                  {errorMsg}
                </p>
              )}
              {successMsg && (
                <p className="text-xs text-emerald-700 font-semibold bg-white p-2 rounded-lg border border-emerald-300">
                  {successMsg}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Modelo do Veículo: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: ARGO, STRADA, POLO"
                    value={newModel}
                    onChange={e => setNewModel(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold uppercase focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Placa: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: TYY7F10"
                    value={newPlate}
                    onChange={e => setNewPlate(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Fazenda / Unidade (Opcional):
                  </label>
                  <select
                    value={newFarm}
                    onChange={e => setNewFarm(e.target.value as Farm)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Todas / Frota Geral</option>
                    {FARMS.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar à Frota</span>
                </button>
              </div>
            </form>
          )}

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por placa ou modelo (ex: TYY, ARGO, POLO, STRADA)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Vehicles List Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Modelo</th>
                  <th className="py-2.5 px-3">Placa</th>
                  <th className="py-2.5 px-3">Fazenda</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      Nenhum veículo encontrado com o termo "{search}".
                    </td>
                  </tr>
                ) : (
                  filtered.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{v.model}</td>
                      <td className="py-2.5 px-3 font-mono font-extrabold text-emerald-800 bg-emerald-50/50">
                        {v.plate}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{v.farm || 'Geral / Todas'}</td>
                      <td className="py-2.5 px-3 text-right space-x-1">
                        {onSelectVehicle && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectVehicle(v.plate, v.model);
                              onClose();
                            }}
                            className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
                          >
                            Selecionar
                          </button>
                        )}
                        {userRole === 'ADMIN' && (
                          <button
                            type="button"
                            onClick={() => deleteVehicle(v.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                            title="Excluir veículo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Total cadastrado: <strong>{vehicles.length} veículos</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-bold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
