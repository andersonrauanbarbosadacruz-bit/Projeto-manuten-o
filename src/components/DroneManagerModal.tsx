import React, { useState } from 'react';
import { X, Plus, Trash2, Navigation, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FARMS, Farm } from '../types';

interface DroneManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDrone?: (label: string) => void;
}

export const DroneManagerModal: React.FC<DroneManagerModalProps> = ({
  isOpen,
  onClose,
  onSelectDrone
}) => {
  const { drones, addDrone, deleteDrone, userRole } = useApp();

  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [newModel, setNewModel] = useState('DJI T70P');
  const [newFarm, setNewFarm] = useState<Farm | ''>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const filtered = drones.filter(d =>
    d.label.toLowerCase().includes(search.toLowerCase()) ||
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.model.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const nameClean = newName.trim();
    const modelClean = newModel.trim().toUpperCase();

    if (!nameClean) {
      setErrorMsg('Informe o nome ou prefixo do drone (ex: Drone 03).');
      return;
    }
    if (!modelClean) {
      setErrorMsg('Informe o modelo do drone (ex: DJI T70P, DJI Agras T50).');
      return;
    }

    const candidateLabel = `${nameClean} (${modelClean})`;
    const exists = drones.some(d => d.label.toLowerCase() === candidateLabel.toLowerCase());
    if (exists) {
      setErrorMsg(`O drone "${candidateLabel}" já está cadastrado.`);
      return;
    }

    const created = addDrone({
      name: nameClean,
      model: modelClean,
      farm: newFarm || undefined
    });

    setSuccessMsg(`Drone ${created.label} cadastrado com sucesso!`);
    setNewName('');
    setNewModel('DJI T70P');
    setNewFarm('');

    if (onSelectDrone) {
      onSelectDrone(created.label);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Cadastro & Gestão de Aeronaves / Drones</h2>
              <p className="text-xs text-slate-400">
                Lista suspensa de drones agrícolas ({drones.length} cadastrado{drones.length === 1 ? '' : 's'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Registration Form */}
          <form onSubmit={handleAdd} className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center">
                <Plus className="w-4 h-4 mr-1 text-indigo-700" />
                Cadastrar Novo Drone
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
                  Identificação / Prefixo: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Drone 03"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Modelo da Aeronave: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: DJI T70P"
                  value={newModel}
                  onChange={e => setNewModel(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold uppercase focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Fazenda / Unidade (Opcional):
                </label>
                <select
                  value={newFarm}
                  onChange={e => setNewFarm(e.target.value as Farm)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
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
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar e Selecionar Drone</span>
              </button>
            </div>
          </form>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar drone por nome ou modelo (ex: Drone 01, DJI T70P)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Drones List Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Identificação</th>
                  <th className="py-2.5 px-3">Modelo</th>
                  <th className="py-2.5 px-3">Fazenda</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      Nenhum drone encontrado com o termo "{search}".
                    </td>
                  </tr>
                ) : (
                  filtered.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{d.name}</td>
                      <td className="py-2.5 px-3 font-mono font-extrabold text-indigo-800 bg-indigo-50/50">
                        {d.model}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{d.farm || 'Geral / Todas'}</td>
                      <td className="py-2.5 px-3 text-right space-x-1">
                        {onSelectDrone && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectDrone(d.label);
                              onClose();
                            }}
                            className="px-2 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors cursor-pointer"
                          >
                            Selecionar
                          </button>
                        )}
                        {userRole === 'ADMIN' && (
                          <button
                            type="button"
                            onClick={() => deleteDrone(d.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                            title="Excluir drone"
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
          <span>Total cadastrado: <strong>{drones.length} drone{drones.length === 1 ? '' : 's'}</strong></span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 font-bold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
