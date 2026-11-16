/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { ChecklistList } from './components/ChecklistList';
import { ChecklistForm } from './components/ChecklistForm';
import { WorkOrderList } from './components/WorkOrderList';
import { WorkOrderForm } from './components/WorkOrderForm';
import { ChecklistDetailModal } from './components/ChecklistDetailModal';
import { WorkOrderDetailModal } from './components/WorkOrderDetailModal';
import { ImageModal } from './components/ImageModal';
import { MobileAccessModal } from './components/MobileAccessModal';
import { DataManagementModal } from './components/DataManagementModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { SyncModal } from './components/SyncModal';
import { VehicleManagerModal } from './components/VehicleManagerModal';
import { FleetMonthlyUpdateForm } from './components/FleetMonthlyUpdateForm';
import { FleetMonthlyDetailModal } from './components/FleetMonthlyDetailModal';
import { FleetMonthlyList } from './components/FleetMonthlyList';
import { NR13CalibrationsView } from './components/nr13/NR13CalibrationsView';
import { ServiceRequestPortal } from './components/ServiceRequestPortal';
import { LeanModulesPortal } from './components/LeanModulesPortal';
import { ServiceRequestsView } from './components/ServiceRequestsView';
import { ServiceRequestDetailModal } from './components/ServiceRequestDetailModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CheckCircle2, WifiOff, RefreshCw } from 'lucide-react';
import { FARMS } from './types';

const AppContent: React.FC = () => {
  const { 
    activeTab, 
    deleteModalState, 
    cancelDelete, 
    confirmDelete,
    syncToast,
    setSyncToast,
    isOnline,
    pendingOfflineCount,
    flushOfflineQueue,
    showVehicleModal,
    setShowVehicleModal,
    showSyncModal,
    showMobileAccessModal,
    showDataManagementModal,
    viewChecklistDetail,
    viewWorkOrderDetail,
    viewFleetUpdateDetail,
    viewServiceRequestDetail,
    userRole,
    hasServiceRequestAccess,
    hasModuleAccess,
    activeOperatorRelease,
    previewImage
  } = useApp();

  const isLeanOnlyPortal =
    userRole !== 'ADMIN' &&
    !activeOperatorRelease &&
    !hasModuleAccess('checklist') &&
    !hasModuleAccess('work_order');

  // Acesso ultra-enxuto para links com apenas Solicitação de Serviço e/ou Atualização de Frota
  if (isLeanOnlyPortal) {
    return (
      <>
        <LeanModulesPortal />
        {viewFleetUpdateDetail && <FleetMonthlyDetailModal />}
        {viewChecklistDetail && <ChecklistDetailModal />}
        {previewImage && <ImageModal />}
        {syncToast?.isOpen && (
          <div className="fixed bottom-5 right-5 z-50 max-w-md bg-emerald-950 text-white p-4 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-start space-x-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="w-8 h-8 rounded-full bg-emerald-800/80 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1 text-xs font-semibold leading-relaxed">
              {syncToast.message}
            </div>
            <button
              onClick={() => setSyncToast(null)}
              className="text-emerald-300 hover:text-white p-1 rounded-md text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full bg-slate-100 flex flex-col font-sans overflow-x-clip">
      <Navbar />

      {/* Offline Mode Reassurance Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-stone-950 px-4 py-2 text-xs sm:text-sm font-bold shadow-xs">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <WifiOff className="w-4 h-4 shrink-0 text-stone-950" />
              <span>
                <strong>Modo Offline Ativo:</strong> Preencha checklists, ordens de serviço e registre fotos normalmente no campo. Tudo é gravado com segurança neste aparelho e subirá automaticamente para o computador assim que tiver sinal ou Wi-Fi.
              </span>
            </div>
            <button
              onClick={flushOfflineQueue}
              className="px-2.5 py-1 bg-stone-950 text-amber-400 hover:bg-stone-900 rounded-md text-xs font-extrabold cursor-pointer transition-colors shrink-0"
            >
              Verificar Conexão
            </button>
          </div>
        </div>
      )}

      {/* Pending Offline Upload Notification */}
      {isOnline && pendingOfflineCount > 0 && (
        <div className="bg-blue-600 text-white px-4 py-2 text-xs sm:text-sm font-semibold shadow-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-200 shrink-0" />
              <span>
                Transmitindo <strong>{pendingOfflineCount}</strong> registro(s) gravados no modo offline para a base central do computador...
              </span>
            </div>
            <button
              onClick={flushOfflineQueue}
              className="px-2.5 py-1 bg-white text-blue-900 hover:bg-blue-50 rounded-md text-xs font-bold cursor-pointer transition-colors shrink-0"
            >
              Enviar Agora
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full min-w-0 mx-auto px-3 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'checklists' && hasModuleAccess('checklist') && <ChecklistList />}
        {activeTab === 'new-checklist' && hasModuleAccess('checklist') && <ChecklistForm />}
        {activeTab === 'work-orders' && hasModuleAccess('work_order') && <WorkOrderList />}
        {activeTab === 'new-work-order' && hasModuleAccess('work_order') && <WorkOrderForm />}
        {activeTab === 'fleet-updates' && hasModuleAccess('fleet_update') && <FleetMonthlyList />}
        {activeTab === 'new-fleet-update' && hasModuleAccess('fleet_update') && <FleetMonthlyUpdateForm />}
        {activeTab === 'service-requests' &&
          (hasServiceRequestAccess ? (
            <ServiceRequestsView />
          ) : hasModuleAccess('service_request') ? (
            <div className="max-w-3xl mx-auto">
              <ServiceRequestPortal embedded />
            </div>
          ) : null)}
        {activeTab === 'nr13-calibrations' && userRole === 'ADMIN' && <NR13CalibrationsView />}
      </main>

      {/* Global Modals - Mounted strictly on demand to ensure instant 60fps responsiveness */}
      {viewChecklistDetail && <ChecklistDetailModal />}
      {viewWorkOrderDetail && <WorkOrderDetailModal />}
      {viewFleetUpdateDetail && <FleetMonthlyDetailModal />}
      {viewServiceRequestDetail && <ServiceRequestDetailModal />}
      {previewImage && <ImageModal />}
      {showMobileAccessModal && <MobileAccessModal />}
      {showDataManagementModal && <DataManagementModal />}
      {showSyncModal && <SyncModal />}
      {showVehicleModal && (
        <VehicleManagerModal
          isOpen={showVehicleModal}
          onClose={() => setShowVehicleModal(false)}
        />
      )}


      {/* Sync Toast Notification */}
      {syncToast?.isOpen && (
        <div className="fixed bottom-20 md:bottom-5 right-5 z-50 max-w-md bg-emerald-950 text-white p-4 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-start space-x-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="w-8 h-8 rounded-full bg-emerald-800/80 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 text-xs font-semibold leading-relaxed">
            {syncToast.message}
          </div>
          <button
            onClick={() => setSyncToast(null)}
            className="text-emerald-300 hover:text-white p-1 rounded-md text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* In-app Deletion Confirmation Modal (eliminates window.confirm blockers) */}
      <ConfirmDeleteModal
        isOpen={deleteModalState.isOpen}
        title={
          deleteModalState.type === 'checklist'
            ? 'Excluir Checklist Operacional?'
            : deleteModalState.type === 'fleet-update'
            ? 'Excluir Atualização Mensal do Veículo?'
            : deleteModalState.type === 'service-request'
            ? 'Excluir Solicitação de Serviço?'
            : 'Excluir Ordem de Serviço?'
        }
        itemCode={deleteModalState.code}
        itemDescription={deleteModalState.description}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mb-16 md:mb-0 mt-auto text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center space-x-2">
            <img 
              src="/assets/aistudio/image_adab39d7.png" 
              alt="el Ciruelo" 
              className="h-5 sm:h-6 w-auto object-contain"
            />
            <span className="font-extrabold text-slate-800">
              el Ciruelo
            </span>
            <span>•</span>
            <span>Gestão e Manutenção Operacional Interna</span>
          </div>

          <div className="text-slate-400">
            Unidades: {FARMS.join(' • ')}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
